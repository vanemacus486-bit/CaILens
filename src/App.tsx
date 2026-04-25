import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { WeekView } from '@/features/week-view/WeekView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WeekView />} />
      </Routes>
    </BrowserRouter>
  )
}
