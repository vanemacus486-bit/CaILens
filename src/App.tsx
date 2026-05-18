import { useEffect, useMemo } from 'react'
import { HashRouter, Route, Routes, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { WeekView } from '@/features/week-view/WeekView'
import { DayView } from '@/features/day-view/DayView'
import { StatsPage } from '@/pages/StatsPage'
import { CommandPalette } from '@/features/search/CommandPalette'
import { SettingsDrawer } from '@/features/settings/SettingsDrawer'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AiChatDrawer } from '@/features/ai-chat'
import { useUIStore } from '@/stores/uiStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { QuickLogDialog, useQuickLog } from '@/features/quick-log'
import { SnackbarHost } from '@/components/ui/snackbar'
import { fireAndForget } from '@/lib/fireAndForget'
import { addWeeks, getWeekStart, formatISODate } from '@/domain/time'
import { useShortcutManager } from '@/hooks/useShortcutManager'
import { subDays, addDays, parseISO } from 'date-fns'
import type { ShortcutAction } from '@/domain/shortcuts'

function Layout() {
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const settingsDrawerOpen = useUIStore((s) => s.settingsDrawerOpen)
  const language = useAppSettingsStore((s) => s.settings.language)
  const theme = useAppSettingsStore((s) => s.settings.theme)
  const setTheme = useAppSettingsStore((s) => s.setTheme)
  const setLanguage = useAppSettingsStore((s) => s.setLanguage)
  const { open, setOpen, defaults, openDialog, handleSave } = useQuickLog()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Hoisted: load categories + settings once at the layout level
  // instead of duplicating in every route component.
  useEffect(() => {
    const loadCategories = useCategoryStore.getState().loadCategories
    const loadSettings = useAppSettingsStore.getState().loadSettings
    fireAndForget(loadCategories(), 'load categories')
    fireAndForget(loadSettings(), 'load settings')
  }, [])

  const shortcutHandlers = useMemo<Partial<Record<ShortcutAction, () => void>>>(() => ({
    openCommandPalette: () => useUIStore.getState().setCommandPaletteOpen(true),
    openQuickLog: () => { if (!open) openDialog() },
    copyFocusedEvent: () => {
      const eventId = useUIStore.getState().lastFocusedEventId
      if (!eventId) return
      const event = useEventStore.getState().events.find((e) => e.id === eventId)
      if (!event) return
      useUIStore.getState().setClipboardEvent({
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        color: event.color,
        categoryId: event.categoryId,
        description: event.description,
        location: event.location,
      })
    },
    pasteEvent: () => {
      const clip = useUIStore.getState().clipboardEvent
      if (!clip) return
      fireAndForget(useEventStore.getState().createEvent(clip), 'paste event')
    },
    goToThisWeek: () => navigate('/'),
    goToDayView: () => navigate('/day'),
    goToStats: () => navigate('/stats'),
    openSettings: () => useUIStore.getState().setSettingsDrawerOpen(true),
    toggleTheme: () => fireAndForget(
      setTheme(theme === 'dark' ? 'light' : 'dark'),
      'toggle theme',
    ),
    toggleLanguage: () => fireAndForget(
      setLanguage(language === 'zh' ? 'en' : 'zh'),
      'toggle language',
    ),
    goToPreviousWeek: () => {
      const weekParam = searchParams.get('week')
      const current = weekParam ? parseISO(weekParam) : getWeekStart(new Date(), 1)
      navigate(`/?week=${formatISODate(addWeeks(current, -1))}`)
    },
    goToNextWeek: () => {
      const weekParam = searchParams.get('week')
      const current = weekParam ? parseISO(weekParam) : getWeekStart(new Date(), 1)
      navigate(`/?week=${formatISODate(addWeeks(current, 1))}`)
    },
    goToPreviousDay: () => {
      const dateParam = searchParams.get('date')
      const current = dateParam ? parseISO(dateParam) : new Date()
      navigate(`/day?date=${formatISODate(subDays(current, 1))}`)
    },
    goToNextDay: () => {
      const dateParam = searchParams.get('date')
      const current = dateParam ? parseISO(dateParam) : new Date()
      navigate(`/day?date=${formatISODate(addDays(current, 1))}`)
    },
    deleteFocusedEvent: () => {
      const eventId = useUIStore.getState().lastFocusedEventId
      if (!eventId) return
      fireAndForget(useEventStore.getState().deleteEvent(eventId), 'delete event')
    },
    duplicateFocusedEvent: () => {
      const eventId = useUIStore.getState().lastFocusedEventId
      if (!eventId) return
      fireAndForget(useEventStore.getState().duplicateEvent(eventId), 'duplicate event')
    },
  }), [open, openDialog, navigate, searchParams, setTheme, setLanguage, theme, language])

  useShortcutManager(shortcutHandlers)

  return (
    <div className="h-screen flex bg-surface-base text-text-primary overflow-hidden">
      <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <ErrorBoundary>
          <Outlet context={{ onQuickLog: openDialog }} />
        </ErrorBoundary>
      </main>
      <AiChatDrawer />
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
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
