import { useState, useRef } from "react";
import { Link, Search, Upload, Loader2 } from "lucide-react";
import { extractArxivId } from "../lib/arxiv";
import type { Paper } from "../lib/types";

interface Props {
  onPaperLoaded: (paper: Paper) => void;
}

export function PaperInput({ onPaperLoaded }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrl = async () => {
    const arxivId = extractArxivId(url);
    if (!arxivId) {
      setError(
        "Could not find an arXiv ID in that URL. Try: arxiv.org/abs/2301.12345"
      );
      return;
    }
    setError(null);
    setLoading(true);
    setStatus("Fetching PDF from arXiv…");
    try {
      const fetchRes = await fetch(`/api/fetch-arxiv?id=${arxivId}`);
      if (!fetchRes.ok)
        throw new Error(`arXiv fetch failed: ${fetchRes.statusText}`);
      const { text, usedAbstractFallback } = await fetchRes.json();
      setStatus(usedAbstractFallback ? "PDF text was noisy; extracting from abstract..." : "Extracting knowledge graph...");
      await extract(text, arxivId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    setStatus("Parsing PDF…");
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const parseRes = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });
      if (!parseRes.ok) throw new Error("PDF parsing failed");
      const { text, usedAbstractFallback } = await parseRes.json();
      setStatus(usedAbstractFallback ? "PDF text was noisy; extracting from abstract..." : "Extracting knowledge graph...");
      await extract(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  const extract = async (text: string, arxivId?: string) => {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, arxivId }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const paper: Paper = {
      id: arxivId ?? `paper-${Date.now()}`,
      title: data.title ?? "Untitled Paper",
      authors: data.authors ?? [],
      abstract: data.abstract,
      arxivId,
      nodes: data.nodes ?? [],
      edges: data.edges ?? [],
      extractedAt: new Date().toISOString(),
    };
    onPaperLoaded(paper);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* arXiv URL input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
            placeholder="arxiv.org/abs/2301.12345 or bare ID"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleUrl()}
          />
        </div>
        <button
          onClick={handleUrl}
          disabled={loading || !url.trim()}
          className="px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {loading ? "" : "Map"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-600">
        <div className="flex-1 h-px bg-slate-800" />
        or
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* PDF upload */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="w-full border border-dashed border-slate-700 hover:border-slate-500 rounded-xl py-6 text-sm text-slate-500 hover:text-slate-300 transition-colors flex flex-col items-center gap-2 disabled:opacity-40"
      >
        <Upload size={20} />
        Upload PDF
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </button>

      {/* Status / error */}
      {status && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin shrink-0" />
          {status}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
