import { create } from 'zustand'
import type { Paper, PaperNode, NodeType } from '../lib/types'

interface PaperState {
  papers: Record<string, Paper>
  selectedNode: PaperNode | null
  activeFilters: Set<NodeType>
  loading: boolean
  error: string | null

  addPaper: (paper: Paper) => void
  selectNode: (node: PaperNode | null) => void
  toggleFilter: (type: NodeType) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const usePaperStore = create<PaperState>((set) => ({
  papers: {},
  selectedNode: null,
  activeFilters: new Set(['claim', 'evidence', 'method', 'result', 'limitation', 'assumption']),
  loading: false,
  error: null,

  addPaper: (paper) =>
    set((state) => ({ papers: { ...state.papers, [paper.id]: paper } })),

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
