import { useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Network } from 'lucide-react'
import { usePaperStore } from '../store/paper'
import { Graph, type GraphHandle } from '../components/Graph'
import { NodePanel } from '../components/NodePanel'
import { Legend } from '../components/Legend'
import { Toolbar } from '../components/Toolbar'
import type { PaperNode } from '../lib/types'

export function PaperView() {
  const { id } = useParams<{ id: string }>()
  const graphRef = useRef<GraphHandle>(null)

  const paper = usePaperStore((s) => s.papers[id ?? ''])
  const selectedNode = usePaperStore((s) => s.selectedNode)
  const activeFilters = usePaperStore((s) => s.activeFilters)
  const selectNode = usePaperStore((s) => s.selectNode)
  const toggleFilter = usePaperStore((s) => s.toggleFilter)

  if (!paper) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Network size={40} className="mb-4 text-slate-700" />
        <p className="mb-4">Paper not found.</p>
        <Link to="/" className="text-violet-400 hover:text-violet-300">
          ← Back to home
        </Link>
      </div>
    )
  }

  const visibleNodes = paper.nodes.filter((n) => activeFilters.has(n.type))
  const visibleIds = new Set(visibleNodes.map((n) => n.id))
  const visibleEdges = paper.edges.filter((e) => {
    const src = typeof e.source === 'string' ? e.source : (e.source as PaperNode).id
    const tgt = typeof e.target === 'string' ? e.target : (e.target as PaperNode).id
    return visibleIds.has(src) && visibleIds.has(tgt)
  })

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <Link to="/" className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-1.5 text-violet-400">
          <Network size={16} />
          <span className="text-sm font-semibold">Litmap</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-medium text-slate-200 truncate">{paper.title}</h1>
          {paper.authors.length > 0 && (
            <div className="text-xs text-slate-500 truncate">
              {paper.authors.slice(0, 3).join(', ')}
              {paper.authors.length > 3 ? ' et al.' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        onZoomIn={() => graphRef.current?.zoomIn()}
        onZoomOut={() => graphRef.current?.zoomOut()}
        onReset={() => graphRef.current?.reset()}
        nodeCount={visibleNodes.length}
        edgeCount={visibleEdges.length}
      />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Legend */}
        <div className="w-44 shrink-0 p-4 border-r border-slate-800 overflow-y-auto">
          <Legend />
        </div>

        {/* Graph */}
        <div className="flex-1 relative min-w-0">
          <Graph
            ref={graphRef}
            paper={paper}
            activeFilters={activeFilters}
            onNodeClick={(node) => selectNode(node)}
          />
        </div>

        {/* Node panel */}
        {selectedNode && (
          <div className="w-80 shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col min-h-0">
            <NodePanel
              node={selectedNode}
              abstract={paper.abstract}
              onClose={() => selectNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
