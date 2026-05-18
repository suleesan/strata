import { useNavigate } from 'react-router-dom'
import { PaperInput } from '../components/PaperInput'
import { usePaperStore } from '../store/paper'
import type { Paper } from '../lib/types'
import { Network } from 'lucide-react'

export function Home() {
  const navigate = useNavigate()
  const addPaper = usePaperStore((s) => s.addPaper)

  const handlePaperLoaded = (paper: Paper) => {
    addPaper(paper)
    navigate(`/paper/${paper.id}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-slate-950">
      <div className="text-center mb-10 space-y-3">
        <div className="flex items-center justify-center gap-2 text-violet-400 mb-2">
          <Network size={28} />
          <span className="text-2xl font-semibold tracking-tight">Litmap</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-100 tracking-tight">
          Turn papers into idea maps
        </h1>
        <p className="text-slate-400 max-w-md mx-auto text-base leading-relaxed">
          Drop in an arXiv URL or PDF and get an interactive graph of the paper's
          intellectual structure — claims, evidence, methods, and how they connect.
        </p>
      </div>

      <PaperInput onPaperLoaded={handlePaperLoaded} />

      <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg text-center text-xs text-slate-500">
        <div>
          <div className="text-slate-300 font-medium mb-1">Ideas, not citations</div>
          Maps what the paper argues, not who it references
        </div>
        <div>
          <div className="text-slate-300 font-medium mb-1">Interactive graph</div>
          Click any node to read it and ask Claude questions
        </div>
        <div>
          <div className="text-slate-300 font-medium mb-1">Filter by type</div>
          Show only claims, methods, limitations, and more
        </div>
      </div>
    </div>
  )
}
