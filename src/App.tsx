import { lazy, Suspense, useEffect, useMemo } from 'react'
import { HashRouter, Navigate, Route, Routes, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { WeekView } from '@/features/week-view/WeekView'
import { ReviewLayout } from '@/components/nav/ReviewLayout'
import { TopNavBar } from '@/components/nav/TopNavBar'

// 路由级懒加载：仅周视图（首屏）同步加载，其余按需拆包，显著减小首屏 JS 体积
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ProjectDetailPage = lazy(() => import('@/pages/project/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })))
const ActionPage = lazy(() => import('@/pages/action/ActionPage').then((m) => ({ default: m.ActionPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const QuickCaptureWindow = lazy(() => import('@/features/quick-capture/QuickCaptureWindow').then((m) => ({ default: m.QuickCaptureWindow })))
const CommandPalette = lazy(() => import('@/features/search/CommandPalette').then((m) => ({ default: m.CommandPalette })))
const QuickCaptureInbox = lazy(() => import('@/features/action/QuickCaptureInbox').then((m) => ({ default: m.QuickCaptureInbox })))
// 无条件挂载但内部 closed→null：改为「打开时才挂载」可把加密导出(age)/ics 库移出首屏
const SettingsModal = lazy(() => import('@/features/settings/SettingsModal').then((m) => ({ default: m.SettingsModal })))
import { useUIStore } from '@/stores/uiStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import { useProfileStore } from '@/stores/profileStore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SnackbarHost } from '@/components/ui/snackbar'
import { UpdateBanner } from '@/components/ui/UpdateBanner'
import { fireAndForget } from '@/lib/fireAndForget'
import { addWeeks, getWeekStart, formatISODate } from '@/domain/time'
import { useShortcutManager } from '@/hooks/useShortcutManager'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { subDays, addDays, parseISO } from 'date-fns'
import type { ShortcutAction } from '@/domain/shortcuts'
import { isNativeMobile } from '@/lib/platform'
const MobileLayout = lazy(() => import('@/features/mobile/MobileLayout').then((m) => ({ default: m.MobileLayout })))
const MobileDayPage = lazy(() => import('@/features/mobile/MobileDayPage').then((m) => ({ default: m.MobileDayPage })))

/** 懒加载页面切换时的占位（与背景同色，避免闪烁突兀）。 */
function PageFallback() {
  return <div className="flex-1 bg-surface-base" />
}

function Layout() {
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const quickCaptureInboxOpen = useUIStore((s) => s.quickCaptureInboxOpen)
  const settingsModalOpen = useUIStore((s) => s.settingsModalOpen)
  const theme = useAppSettingsStore((s) => s.settings.theme)
  const setTheme = useAppSettingsStore((s) => s.setTheme)
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
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

  // 全局快捷键: 1=日历 2=复盘 Esc=回日历
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)) return
      switch (e.key) {
        case '1': navigate('/week'); e.preventDefault(); break
        case '2': navigate('/action'); e.preventDefault(); break

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
    openSettings: () => useUIStore.getState().setSettingsModalOpen(true),
    toggleTheme: () => fireAndForget(
      setTheme(theme === 'dark' ? 'light' : 'dark'),
      'toggle theme',
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
    quickCaptureTodo: () => useUIStore.getState().setQuickCaptureInboxOpen(true),
  }), [navigate, searchParams, setTheme, theme])

  useShortcutManager(shortcutHandlers)

  return (
    <div className="h-screen flex flex-col bg-surface-base text-text-primary overflow-hidden">
      {(!location.pathname.startsWith('/week') || isMobile) && <TopNavBar />}
      <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      {commandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      )}
      {settingsModalOpen && (
        <Suspense fallback={null}>
          <SettingsModal />
        </Suspense>
      )}
      {quickCaptureInboxOpen && (
        <Suspense fallback={null}>
          <QuickCaptureInbox />
        </Suspense>
      )}
      <SnackbarHost />
      <UpdateBanner />
    </div>
  )
}

/** Preserves query params (week, openEvent, view, date) when redirecting / → /week */
function RedirectToWeek() {
  const loc = useLocation()
  return <Navigate to={{ pathname: '/week', search: loc.search }} replace />
}

export default function App() {
  // Native Capacitor shell → minimal mobile routes only
  if (isNativeMobile()) {
    return (
      <HashRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route element={<MobileLayout />}>
              <Route path="/" element={<Navigate to={`/day?date=${formatISODate(new Date())}`} replace />} />
              <Route path="/day" element={<MobileDayPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<RedirectToWeek />} />
          <Route path="/week" element={<WeekView />} />
          <Route element={<ReviewLayout />}>
            <Route path="/action" element={<ActionPage />} />
            <Route path="/stats"  element={<StatsPage />} />
          </Route>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/quick-capture" element={<QuickCaptureWindow />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
