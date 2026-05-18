export type NodeType = 'claim' | 'evidence' | 'method' | 'result' | 'limitation' | 'assumption'

export type EdgeRelationship = 'supports' | 'contradicts' | 'requires' | 'produces'

export interface PaperNode {
  id: string
  type: NodeType
  label: string
  body: string
  section: string
  confidence?: number
  // D3 simulation properties (added at runtime)
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

export interface PaperEdge {
  source: string | PaperNode
  target: string | PaperNode
  relationship: EdgeRelationship
}

export interface Paper {
  id: string
  title: string
  authors: string[]
  abstract?: string
  arxivId?: string
  nodes: PaperNode[]
  edges: PaperEdge[]
  extractedAt: string
}

export const NODE_COLORS: Record<NodeType, string> = {
  claim:      '#7c3aed',
  evidence:   '#0d9488',
  method:     '#1d4ed8',
  result:     '#15803d',
  limitation: '#dc2626',
  assumption: '#d97706',
}

export const EDGE_COLORS: Record<EdgeRelationship, string> = {
  supports:    '#22c55e',
  contradicts: '#ef4444',
  requires:    '#94a3b8',
  produces:    '#3b82f6',
}
