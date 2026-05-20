import dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
// Load .env.local first (higher priority), then .env
dotenv.config({ path: resolve(__dirname, "../.env.local") });
dotenv.config({ path: resolve(__dirname, "../.env") });
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { extractPaper } from "./extract.js";

// CJS modules: use createRequire for ESM compat
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const multer = require("multer");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});
const client = new Anthropic();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── GET /api/fetch-arxiv?id=2301.12345 ───────────────────────────────────────
app.get("/api/fetch-arxiv", async (req, res) => {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: "Missing arXiv ID" });

  try {
    const url = `https://arxiv.org/pdf/${id}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Strata/1.0 (research tool)" },
    });
    if (!response.ok) throw new Error(`arXiv returned ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const parsed = await pdfParse(buffer);
    res.json({ text: parsed.text, pages: parsed.numpages });
  } catch (e) {
    console.error("fetch-arxiv error:", e);
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Fetch failed" });
  }
});

// ── POST /api/parse-pdf (multipart) ──────────────────────────────────────────
app.post("/api/parse-pdf", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const parsed = await pdfParse(req.file.buffer);
    res.json({ text: parsed.text, pages: parsed.numpages });
  } catch (e) {
    console.error("parse-pdf error:", e);
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Parse failed" });
  }
});

// ── POST /api/extract ─────────────────────────────────────────────────────────
app.post("/api/extract", async (req, res) => {
  const { text, arxivId } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  try {
    const data = await extractPaper(text);
    res.json({ ...data, arxivId });
  } catch (e) {
    console.error("extract error:", e);
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Extraction failed" });
  }
});

// ── POST /api/ask ─────────────────────────────────────────────────────────────
app.post("/api/ask", async (req, res) => {
  const { node, abstract, question } = req.body;
  if (!node || !question)
    return res.status(400).json({ error: "Missing node or question" });

  try {
    const stream = await client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system:
        "You are a research assistant. Answer questions about a specific claim or finding from a paper. Be concise and precise. If the question cannot be answered from the provided context, say so.",
      messages: [
        {
          role: "user",
          content: `Paper abstract:\n${abstract ?? "Not available"}\n\nNode (${
            node.type
          }): ${node.body}\n\nQuestion: ${question}`,
        },
      ],
    });
    const message = await stream.finalMessage();
    const answer = message.content.find((b) => b.type === "text")?.text ?? "";
    res.json({ answer });
  } catch (e) {
    console.error("ask error:", e);
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Ask failed" });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Strata API server running on http://localhost:${PORT}`);
});
