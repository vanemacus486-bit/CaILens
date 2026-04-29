import { BrowserRouter, Route, Routes, Outlet } from 'react-router-dom'
import { WeekView } from '@/features/week-view/WeekView'
import { Sidebar } from '@/features/app-shell/Sidebar'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { StatsPage } from '@/features/stats/StatsPage'

function Layout() {
  return (
    <div className="h-screen flex bg-surface-base text-text-primary overflow-hidden">
      <Sidebar />
      <Outlet />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WeekView />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
