import { useEffect, useMemo } from 'react'
import { HashRouter, Navigate, Route, Routes, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { WeekView } from '@/features/week-view/WeekView'
import { StatsPage } from '@/pages/StatsPage'
import { CommandPalette } from '@/features/search/CommandPalette'
import { SettingsDrawer } from '@/features/settings/SettingsDrawer'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ProjectDetailPage } from '@/pages/project/ProjectDetailPage'
import { ActionPage } from '@/pages/action/ActionPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { TopNavBar } from '@/components/nav/TopNavBar'
import { useUIStore } from '@/stores/uiStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import { useProfileStore } from '@/stores/profileStore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Hoisted: load categories + settings + profile once at the layout level
  useEffect(() => {
    const loadCategories = useCategoryStore.getState().loadCategories
    const loadSettings = useAppSettingsStore.getState().loadSettings
    const loadProfile = useProfileStore.getState().loadProfile
    fireAndForget(loadCategories(), 'load categories')
    fireAndForget(loadSettings(), 'load settings')
    fireAndForget(loadProfile(), 'load profile')
  }, [])

  // 全局快捷键: 1=日历 2=规划 3=复盘 Esc=回日历
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)) return
      switch (e.key) {
        case '1': navigate('/week'); e.preventDefault(); break
        case '2': navigate('/action'); e.preventDefault(); break
        case '3': navigate('/stats'); e.preventDefault(); break
        case 'Escape':
          if (window.location.hash.startsWith('#/profile')) {
            // ProfilePage 自己处理 Esc → 回复盘
            return
          }
          if (window.location.hash && !window.location.hash.startsWith('#/week')) {
            navigate('/week')
            e.preventDefault()
          }
          break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  const shortcutHandlers = useMemo<Partial<Record<ShortcutAction, () => void>>>(() => ({
    openCommandPalette: () => useUIStore.getState().setCommandPaletteOpen(true),
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
    goToThisWeek: () => navigate('/week'),
    goToDayView: () => navigate(`/week?view=day&date=${formatISODate(new Date())}`),
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
      navigate(`/week?week=${formatISODate(addWeeks(current, -1))}`)
    },
    goToNextWeek: () => {
      const weekParam = searchParams.get('week')
      const current = weekParam ? parseISO(weekParam) : getWeekStart(new Date(), 1)
      navigate(`/week?week=${formatISODate(addWeeks(current, 1))}`)
    },
    goToPreviousDay: () => {
      const dateParam = searchParams.get('date')
      const current = dateParam ? parseISO(dateParam) : new Date()
      navigate(`/week?view=day&date=${formatISODate(subDays(current, 1))}`)
    },
    goToNextDay: () => {
      const dateParam = searchParams.get('date')
      const current = dateParam ? parseISO(dateParam) : new Date()
      navigate(`/week?view=day&date=${formatISODate(addDays(current, 1))}`)
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
  }), [navigate, searchParams, setTheme, setLanguage, theme, language])

  useShortcutManager(shortcutHandlers)

  return (
    <div className="h-screen flex flex-col bg-surface-base text-text-primary overflow-hidden">
      <TopNavBar />
      <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {commandPaletteOpen && <CommandPalette />}
      {settingsDrawerOpen && <SettingsDrawer />}
      <SnackbarHost />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/week" replace />} />
          <Route path="/week" element={<WeekView />} />
          <Route path="/action" element={<ActionPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
