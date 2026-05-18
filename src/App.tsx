import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { PaperView } from './pages/Paper'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/paper/:id" element={<PaperView />} />
      </Routes>
    </BrowserRouter>
  )
}
