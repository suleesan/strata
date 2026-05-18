import type { NodeType, EdgeRelationship } from '../lib/types'
import { NODE_COLORS, EDGE_COLORS } from '../lib/types'

const NODE_LABELS: Record<NodeType, string> = {
  claim: 'Claim',
  evidence: 'Evidence',
  method: 'Method',
  result: 'Result',
  limitation: 'Limitation',
  assumption: 'Assumption',
}

const EDGE_LABELS: Record<EdgeRelationship, string> = {
  supports: 'Supports',
  contradicts: 'Contradicts',
  requires: 'Requires',
  produces: 'Produces',
}

export function Legend() {
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div>
        <div className="text-slate-500 uppercase tracking-wide mb-1.5">Node types</div>
        <div className="flex flex-col gap-1">
          {(Object.keys(NODE_COLORS) as NodeType[]).map((type) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: NODE_COLORS[type] }}
              />
              <span className="text-slate-400">{NODE_LABELS[type]}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-slate-500 uppercase tracking-wide mb-1.5">Edges</div>
        <div className="flex flex-col gap-1">
          {(Object.keys(EDGE_COLORS) as EdgeRelationship[]).map((rel) => (
            <div key={rel} className="flex items-center gap-2">
              <div
                className="w-5 h-0.5 shrink-0"
                style={{ background: EDGE_COLORS[rel] }}
              />
              <span className="text-slate-400">{EDGE_LABELS[rel]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
