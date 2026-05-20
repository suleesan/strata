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
npm run preview
```

## Usage

1. On the home page, enter an arXiv URL (e.g. `arxiv.org/abs/2301.12345`) or upload a PDF.
2. Wait while the paper is parsed and mapped. Extraction can take a minute for longer papers.
3. Explore the graph: zoom and pan, filter by node type, and click a node to open its details.
4. In the side panel, ask a question about the selected node for a contextual answer.

Graph data is kept in memory for the session; refreshing the page clears the current paper until you import it again.

## TODO

- [ ] Persist papers in `localStorage` (survive refresh)
- [ ] Validate extraction JSON + retry on failure
- [ ] Fallback to abstract-only when PDF text is too noisy
- [ ] Chunk long papers for extraction, then merge graphs
- [ ] Multi-paper overlay (agree / contradict / build-on)
- [ ] Production deploy (serve build + API)
- [ ] Edit UI

## Disclaimer

Claude Code is being used to support this project.
