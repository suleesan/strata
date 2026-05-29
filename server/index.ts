import dotenv from "dotenv";
import { existsSync } from "fs";
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
const distDir = resolve(__dirname, "../dist");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});
const client = new Anthropic();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAbstractFromText(text: string) {
  const normalized = text.replace(/\r/g, "\n");
  const match = normalized.match(
    /(?:^|\n)\s*(?:abstract|summary)\s*[\n:.-]+([\s\S]{250,6000}?)(?=\n\s*(?:1\.?\s+)?(?:introduction|background|keywords|index terms)\b)/i,
  );
  return match?.[1]?.replace(/\s+/g, " ").trim();
}

function isPdfTextNoisy(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 1200) return true;

  const printable = [...trimmed].filter((char) => {
    const code = char.charCodeAt(0);
    return char === "\n" || char === "\t" || (code >= 32 && code <= 126);
  }).length;
  const printableRatio = printable / trimmed.length;
  const words = trimmed.match(/[A-Za-z][A-Za-z-]{2,}/g)?.length ?? 0;
  const lineCount = trimmed.split("\n").length;
  const veryShortLines = trimmed
    .split("\n")
    .filter((line) => line.trim().length > 0 && line.trim().length <= 3).length;

  return printableRatio < 0.82 || words < 180 || veryShortLines / Math.max(lineCount, 1) > 0.35;
}

async function fetchArxivAbstract(id: string) {
  const response = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`, {
    headers: { "User-Agent": "Strata/1.0 (research tool)" },
  });
  if (!response.ok) return null;

  const xml = await response.text();
  const summary = xml.match(/<summary>([\s\S]*?)<\/summary>/i)?.[1];
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/i)?.[1] ?? xml;
  const title = entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  const authors = [...xml.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/gi)].map((match) =>
    decodeXml(match[1]),
  );

  if (!summary) return null;
  return [
    title ? `Title: ${decodeXml(title)}` : "",
    authors.length ? `Authors: ${authors.join(", ")}` : "",
    `Abstract: ${decodeXml(summary)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function chooseExtractionText(text: string, arxivId?: string) {
  if (!isPdfTextNoisy(text)) return { text, usedAbstractFallback: false };

  const abstract = arxivId ? await fetchArxivAbstract(arxivId) : extractAbstractFromText(text);
  if (!abstract) return { text, usedAbstractFallback: false };

  return { text: abstract, usedAbstractFallback: true };
}

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
    const extraction = await chooseExtractionText(parsed.text, id);
    res.json({ text: extraction.text, pages: parsed.numpages, usedAbstractFallback: extraction.usedAbstractFallback });
  } catch (e) {
    console.error("fetch-arxiv error:", e);
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Fetch failed" });
  }
});

// ── POST /api/parse-pdf (multipart) ──────────────────────────────────────────
app.post("/api/parse-pdf", upload.single("pdf"), async (req: express.Request & { file?: { buffer: Buffer } }, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const parsed = await pdfParse(req.file.buffer);
    const extraction = await chooseExtractionText(parsed.text);
    res.json({ text: extraction.text, pages: parsed.numpages, usedAbstractFallback: extraction.usedAbstractFallback });
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

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(resolve(distDir, "index.html"));
  });
}

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Strata API server running on http://localhost:${PORT}`);
});
