import { HashRouter, Route, Routes, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { WeekView } from '@/features/week-view/WeekView'
import { DayView } from '@/features/day-view/DayView'
import { Sidebar } from '@/features/app-shell/Sidebar'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { StatsPage } from '@/pages/StatsPage'
import { SearchDialog } from '@/features/search/SearchDialog'
import { useUIStore } from '@/stores/uiStore'

function Layout() {
  const searchOpen = useUIStore((s) => s.searchOpen)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useUIStore.getState().setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="h-screen flex bg-surface-base text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        <Outlet />
      </div>
      {searchOpen && <SearchDialog />}
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
