import { HashRouter, Route, Routes, Outlet } from 'react-router-dom'
import { WeekView } from '@/features/week-view/WeekView'
import { DayView } from '@/features/day-view/DayView'
import { Sidebar } from '@/features/app-shell/Sidebar'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { StatsPage } from '@/pages/StatsPage'

function Layout() {
  return (
    <div className="h-screen flex bg-surface-base text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        <Outlet />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WeekView />} />
          <Route path="/day" element={<DayView />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
