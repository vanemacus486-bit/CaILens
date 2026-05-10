import { useEffect } from 'react'
import { HashRouter, Route, Routes, Outlet, Navigate } from 'react-router-dom'
import { WeekView } from '@/features/week-view/WeekView'
import { DayView } from '@/features/day-view/DayView'
import { StatsPage } from '@/pages/StatsPage'
import { CommandPalette } from '@/features/search/CommandPalette'
import { SettingsDrawer } from '@/features/settings/SettingsDrawer'
import { useUIStore } from '@/stores/uiStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { QuickLogDialog, useQuickLog } from '@/features/quick-log'
import { useGlobalShortcut } from '@/lib/hooks/useGlobalShortcut'
import { SnackbarHost } from '@/components/ui/snackbar'
import { fireAndForget } from '@/lib/fireAndForget'

function LegacySettingsRedirect() {
  useEffect(() => {
    useUIStore.getState().setSettingsDrawerOpen(true)
  }, [])
  return <Navigate to="/" replace />
}

function Layout() {
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const settingsDrawerOpen = useUIStore((s) => s.settingsDrawerOpen)
  const { open, setOpen, defaults, openDialog, handleSave } = useQuickLog()

  // Hoisted: load categories + settings once at the layout level
  // instead of duplicating in every route component.
  useEffect(() => {
    const loadCategories = useCategoryStore.getState().loadCategories
    const loadSettings = useAppSettingsStore.getState().loadSettings
    fireAndForget(loadCategories(), 'load categories')
    fireAndForget(loadSettings(), 'load settings')
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useUIStore.getState().setCommandPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useGlobalShortcut('n', openDialog, { enabled: !open })

  return (
    <div className="h-screen flex bg-surface-base text-text-primary overflow-hidden">
      <main className="flex-1 h-full overflow-hidden flex flex-col">
        <ErrorBoundary>
          <Outlet context={{ onQuickLog: openDialog }} />
        </ErrorBoundary>
      </main>
      {commandPaletteOpen && <CommandPalette onQuickLog={openDialog} />}
      {settingsDrawerOpen && <SettingsDrawer />}
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
          <Route path="/settings" element={<LegacySettingsRedirect />} />
          <Route path="/settings/*" element={<LegacySettingsRedirect />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
