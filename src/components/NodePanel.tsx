import { useState } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import type { PaperNode } from '../lib/types'
import { NODE_COLORS } from '../lib/types'

interface Props {
  node: PaperNode
  abstract?: string
  onClose: () => void
}

export function NodePanel({ node, abstract, onClose }: Props) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)

  const ask = async () => {
    if (!question.trim()) return
    setAsking(true)
    setAnswer(null)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node, abstract, question }),
      })
      const data = await res.json()
      setAnswer(data.answer ?? data.error ?? 'No response.')
    } catch {
      setAnswer('Failed to get an answer. Please try again.')
    } finally {
      setAsking(false)
    }
  }

  const color = NODE_COLORS[node.type]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-700">
        <div className="flex-1 pr-4">
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ background: color + '33', color }}
          >
            {node.type}
          </span>
          {node.section && (
            <div className="text-xs text-slate-500 mb-1">{node.section}</div>
          )}
          <h2 className="text-sm font-medium text-slate-200 leading-snug">{node.label}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">From the paper</div>
          <p className="text-sm text-slate-300 leading-relaxed">{node.body}</p>
        </div>

        {answer && (
          <div className="rounded-lg p-3 bg-slate-800 border border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Claude's answer</div>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{answer}</p>
          </div>
        )}
      </div>

      {/* Q&A */}
      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-500 mb-2">Ask about this {node.type}</div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
            placeholder="What does this mean?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
          />
          <button
            onClick={ask}
            disabled={asking || !question.trim()}
            className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {asking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
