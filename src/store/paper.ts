import { create } from 'zustand'
import type { Paper, PaperEdge, PaperNode, NodeType } from '../lib/types'

const STORAGE_KEY = 'strata.papers.v1'

function normalizeEdge(edge: PaperEdge): PaperEdge {
  return {
    source: typeof edge.source === 'string' ? edge.source : edge.source.id,
    target: typeof edge.target === 'string' ? edge.target : edge.target.id,
    relationship: edge.relationship,
  }
}

function normalizePaper(paper: Paper): Paper {
  return {
    ...paper,
    edges: paper.edges.map(normalizeEdge),
  }
}

function loadPapers(): Record<string, Paper> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Paper>
    return Object.fromEntries(Object.entries(parsed).map(([id, paper]) => [id, normalizePaper(paper)]))
  } catch {
    return {}
  }
}

function savePapers(papers: Record<string, Paper>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(Object.fromEntries(Object.entries(papers).map(([id, paper]) => [id, normalizePaper(paper)]))),
  )
}

interface PaperState {
  papers: Record<string, Paper>
  selectedNode: PaperNode | null
  activeFilters: Set<NodeType>
  loading: boolean
  error: string | null

  addPaper: (paper: Paper) => void
  updateNode: (paperId: string, node: PaperNode) => void
  selectNode: (node: PaperNode | null) => void
  toggleFilter: (type: NodeType) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const usePaperStore = create<PaperState>((set) => ({
  papers: loadPapers(),
  selectedNode: null,
  activeFilters: new Set(['claim', 'evidence', 'method', 'result', 'limitation', 'assumption']),
  loading: false,
  error: null,

  addPaper: (paper) =>
    set((state) => {
      const papers = { ...state.papers, [paper.id]: normalizePaper(paper) }
      savePapers(papers)
      return { papers }
    }),

  updateNode: (paperId, node) =>
    set((state) => {
      const paper = state.papers[paperId]
      if (!paper) return {}

      const nextNode = { ...node }
      const papers = {
        ...state.papers,
        [paperId]: {
          ...paper,
          nodes: paper.nodes.map((existing) => (existing.id === node.id ? nextNode : existing)),
          edges: paper.edges.map(normalizeEdge),
        },
      }

      savePapers(papers)
      return {
        papers,
        selectedNode: state.selectedNode?.id === node.id ? nextNode : state.selectedNode,
      }
    }),

  selectNode: (node) => set({ selectedNode: node }),

  toggleFilter: (type) =>
    set((state) => {
      const next = new Set(state.activeFilters)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return { activeFilters: next }
    }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))
