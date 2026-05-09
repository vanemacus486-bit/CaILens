import { HashRouter, Route, Routes, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { WeekView } from '@/features/week-view/WeekView'
import { DayView } from '@/features/day-view/DayView'
import { Sidebar } from '@/features/app-shell/Sidebar'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { SettingsCategories } from '@/features/settings/SettingsCategories'
import { SettingsAppearance } from '@/features/settings/SettingsAppearance'
import { SettingsData } from '@/features/settings/SettingsData'
import { SettingsStorage } from '@/features/settings/SettingsStorage'
import { SettingsAbout } from '@/features/settings/SettingsAbout'
import { StatsPage } from '@/pages/StatsPage'
import { SearchDialog } from '@/features/search/SearchDialog'
import { useUIStore } from '@/stores/uiStore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { QuickLogDialog, useQuickLog } from '@/features/quick-log'
import { useGlobalShortcut } from '@/lib/hooks/useGlobalShortcut'
import { SnackbarHost } from '@/components/ui/snackbar'

function Layout() {
  const searchOpen = useUIStore((s) => s.searchOpen)
  const { open, setOpen, defaults, openDialog, handleSave } = useQuickLog()

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

  useGlobalShortcut('n', openDialog, { enabled: !open })

  return (
    <div className="h-screen flex bg-surface-base text-text-primary overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden flex flex-col">
        <ErrorBoundary>
          <Outlet context={{ onQuickLog: openDialog }} />
        </ErrorBoundary>
      </main>
      {searchOpen && <SearchDialog />}
      {defaults && (
        <QuickLogDialog
          open={open}
          onOpenChange={setOpen}
          defaultTimes={defaults.times}
          defaultColor={defaults.color}
          onSave={handleSave}
        />
      )}
      <SnackbarHost />
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
          <Route path="/settings" element={<SettingsPage />}>
            <Route index element={<SettingsCategories />} />
            <Route path="appearance" element={<SettingsAppearance />} />
            <Route path="data" element={<SettingsData />} />
            <Route path="storage" element={<SettingsStorage />} />
            <Route path="about" element={<SettingsAbout />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}
