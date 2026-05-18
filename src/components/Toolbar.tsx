import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import type { NodeType } from '../lib/types'
import { NODE_COLORS } from '../lib/types'

interface Props {
  activeFilters: Set<NodeType>
  onToggleFilter: (type: NodeType) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  nodeCount: number
  edgeCount: number
}

const NODE_TYPES: NodeType[] = ['claim', 'evidence', 'method', 'result', 'limitation', 'assumption']

export function Toolbar({
  activeFilters,
  onToggleFilter,
  onZoomIn,
  onZoomOut,
  onReset,
  nodeCount,
  edgeCount,
}: Props) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-slate-900 border-b border-slate-800 flex-wrap">
      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomOut}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={onZoomIn}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={onReset}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reset view"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-700" />

      {/* Filter toggles */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {NODE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onToggleFilter(type)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
              activeFilters.has(type) ? 'opacity-100' : 'opacity-30'
            }`}
            style={{
              background: NODE_COLORS[type] + '33',
              color: NODE_COLORS[type],
              border: `1px solid ${NODE_COLORS[type]}66`,
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="ml-auto text-xs text-slate-600">
        {nodeCount} nodes · {edgeCount} edges
      </div>
    </div>
  )
}
