# Strata

Strata turns research papers into interactive concept graphs. Paste an arXiv link or upload a PDF to explore the paper as a map of claims, evidence, methods, results, and limitations — and how they relate. Click any node to read the underlying text and ask questions about it.

Unlike citation graphs, Strata maps the paper’s argument structure: what it claims, what supports it, and what depends on what.

## Requirements

- Node.js 18+
- [Anthropic API key](https://console.anthropic.com/)

## Setup

```bash
npm install
```

Create `.env.local` in the project root:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Run locally

Start the frontend and API together:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs on port 3001; Vite proxies `/api` requests in development.

To run services separately:

```bash
npm run dev:frontend   # http://localhost:5173
npm run dev:backend    # http://localhost:3001
```

## Production build

```bash
npm run build
npm start
```

The API server serves the Vite build from `dist/` when it exists, so production
can run from a single process.

## Usage

1. On the home page, enter an arXiv URL (e.g. `arxiv.org/abs/2301.12345`) or upload a PDF.
2. Wait while the paper is parsed and mapped. Extraction can take a minute for longer papers.
3. Explore the graph: zoom and pan, filter by node type, and click a node to open its details.
4. In the side panel, ask a question about the selected node for a contextual answer.
5. Edit extracted nodes when the model output needs cleanup.

Imported papers are saved in `localStorage`, so they survive refreshes in the
same browser.

## TODO

- [ ] Multi-paper overlay (agree / contradict / build-on)
- [ ] Saved-paper library with delete/export/import
- [ ] Source text anchors for nodes
- [ ] Extraction quality diagnostics
- [ ] API tests for extraction and compare validation

## Disclaimer

Claude Code is being used to support this project.
