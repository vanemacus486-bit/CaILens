import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { WeekView } from '@/features/week-view/WeekView'
import { TopNavBar } from '@/components/nav/TopNavBar'

// 路由级懒加载：仅周视图（首屏）同步加载，其余按需拆包，显著减小首屏 JS 体积
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ProjectDetailPage = lazy(() => import('@/pages/project/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const CommandPalette = lazy(() => import('@/features/search/CommandPalette').then((m) => ({ default: m.CommandPalette })))
const QuickCaptureInbox = lazy(() => import('@/features/action/QuickCaptureInbox').then((m) => ({ default: m.QuickCaptureInbox })))
// 无条件挂载但内部 closed→null：改为「打开时才挂载」可把加密导出(age)/ics 库移出首屏
const SettingsModal = lazy(() => import('@/features/settings/SettingsModal').then((m) => ({ default: m.SettingsModal })))
import { useUIStore } from '@/stores/uiStore'
import { AppHeader } from '@/components/nav/AppHeader'
import { UnifiedSidebar } from '@/components/nav/UnifiedSidebar'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { collectDomains, findDomainPlugin } from '@/plugins/registry'
import { useEventStore } from '@/stores/eventStore'
import { useProfileStore } from '@/stores/profileStore'
import { useProjectStore } from '@/stores/projectStore'
import { useTodoStore } from '@/stores/todoStore'
import { useTodoListStore } from '@/stores/todoListStore'
import { useLocationStore } from '@/stores/locationStore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { usePluginRoutes } from '@/plugins/PluginRoutes'
import { SnackbarHost, showErrorSnackbar, showUndoSnackbar } from '@/components/ui/snackbar'
import { UpdateBanner } from '@/components/ui/UpdateBanner'
import { fireAndForget } from '@/lib/fireAndForget'
import { getWeekStart, formatISODate } from '@/domain/time'
import { computeQuickCaptureSpan } from '@/domain/quickCaptureSpan'
import { FloatingEventCard } from '@/features/quick-log/FloatingEventCard'
import type { CreateEventInput, UpdateEventInput } from '@/domain/event'
import { useShortcutManager } from '@/hooks/useShortcutManager'
import { parseISO } from 'date-fns'
import { subscribeCrossWindowWrites } from '@/lib/crossWindowSync'
import type { ShortcutAction } from '@/domain/shortcuts'
import { Loader2 } from 'lucide-react'

/**
 * 懒加载页面切换时的占位。
 *
 * 原来是纯色块 —— 切 Tab 时画面先变成一整块背景色再出现内容，视觉上就是「闪白」。
 * 现在给三条极淡的脉动骨架：底色不变（不刺眼），但用户看得出「在加载」而不是「空了」。
 * 不做精确布局，因为每个页面布局都不同，做错比不做更跳。
 */
function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface-base" aria-busy="true">
      <div className="flex w-full max-w-[240px] flex-col gap-2.5 px-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 animate-pulse rounded-full bg-surface-sunken"
            style={{ animationDelay: `${i * 120}ms`, width: `${100 - i * 18}%` }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * 浮层类懒加载（命令面板 / 设置弹窗 / 快速收集）的占位。
 *
 * 这几处原本是 `fallback={null}`：慢机器上按下 Ctrl+K 之后界面毫无反应，
 * 用户会以为快捷键失效。给一个轻量 spinner，让「正在加载」可见。
 */
function OverlayFallback() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[150] flex items-center justify-center bg-black/10"
      aria-busy="true"
    >
      <Loader2 size={18} className="animate-spin text-text-tertiary" />
    </div>
  )
}

function Layout() {
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const quickCaptureInboxOpen = useUIStore((s) => s.quickCaptureInboxOpen)
  const settingsModalOpen = useUIStore((s) => s.settingsModalOpen)
  const theme = useAppSettingsStore((s) => s.settings.theme)
  const setTheme = useAppSettingsStore((s) => s.setTheme)
  const enabledPlugins = useAppSettingsStore((s) => s.settings.enabledPlugins)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // Hoisted: load categories + settings + profile once at the layout level
  useEffect(() => {
    const loadCategories = useCategoryStore.getState().loadCategories
    const loadSettings = useAppSettingsStore.getState().loadSettings
    const loadProfile = useProfileStore.getState().loadProfile
    const loadTodos = useTodoStore.getState().loadTodos
    const loadLists = useTodoListStore.getState().loadLists
    const loadLocation = useLocationStore.getState().loadLocation
    const loadDayLocations = useLocationStore.getState().loadDayLocations
    fireAndForget(loadCategories(), 'load categories')
    fireAndForget(loadSettings(), 'load settings')
    fireAndForget(loadProfile(), 'load profile')
    fireAndForget(loadTodos(), 'load todos')
    fireAndForget(loadLists(), 'load lists')
    fireAndForget(loadLocation(), 'load location')
    fireAndForget(loadDayLocations(), 'load day locations')
  }, [])

  // store 的 error 字段此前无人消费：保存失败界面完全无感，刷新后才发现没存上。
  // 这里统一订阅，一处兜住 category / project / todo / event 四类失败。
  useEffect(() => {
    const watch = <T,>(
      store: { subscribe: (fn: (s: T) => void) => () => void; getState: () => T },
      pick: (s: T) => string | null,
      label: string,
    ) => {
      let last = pick(store.getState())
      return store.subscribe((s) => {
        const next = pick(s)
        if (next && next !== last) showErrorSnackbar(`${label}：${next}`)
        last = next
      })
    }
    const unsubs = [
      watch(useCategoryStore, (s) => s.error, '分类加载失败'),
      watch(useProjectStore, (s) => s.error, '项目加载失败'),
      watch(useTodoStore, (s) => s.error, '待办操作失败'),
      watch(useEventStore, (s) => s.loadError, '事件加载失败'),
    ]
    return () => { for (const unsub of unsubs) unsub() }
  }, [])

  // 跨窗口同步：QuickCapture 等独立 WebView 写入后，主窗口无感刷新。
  // 200ms 合并连续写入（浮窗「记录并继续」会连发多条），避免每条都全量重读。
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = subscribeCrossWindowWrites((table) => {
      if (table !== 'events') return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void useEventStore.getState().reloadVisible()
      }, 200)
    })
    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [])

  const [capture, setCapture] = useState<{ open: boolean; times: { start: number; end: number } } | null>(null)
  const captureAnchorRef = useRef<HTMLDivElement>(null)

  // 全局快速记录事件：默认区间「上一条事件结束 → 现在」，一次回车即落库
  const openQuickCapture = useCallback(() => {
    const all = useEventStore.getState().allEvents
    const lastEnd = all.length ? Math.max(...all.map((e) => e.endTime)) : null
    setCapture({ open: true, times: computeQuickCaptureSpan({ lastEventEnd: lastEnd, now: Date.now() }) })
  }, [])

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
    goToThisWeek: () => {
      // ProfilePage 自己处理 Esc → 回复盘
      if (location.pathname === '/profile') return
      navigate('/week')
    },
    goToDayView: () => {
      const today = new Date()
      const ws = getWeekStart(today, 1)
      navigate(`/week?week=${formatISODate(ws)}&highlight=${formatISODate(today)}`)
    },
    goToCalendar: () => navigate('/week'),
    openSettings: () => useUIStore.getState().setSettingsModalOpen(true),
    toggleTheme: () => fireAndForget(
      setTheme(theme === 'dark' ? 'light' : 'dark'),
      'toggle theme',
    ),
    deleteFocusedEvent: () => {
      const eventId = useUIStore.getState().lastFocusedEventId
      if (!eventId) return
      const st = useEventStore.getState()
      // events 只含当前周；冷启动或跨周聚焦时回落到 allEvents
      const target = st.events.find((e) => e.id === eventId)
        ?? st.allEvents.find((e) => e.id === eventId)
      fireAndForget(
        st.deleteEvent(eventId).then(() => {
          if (target) showUndoSnackbar(target.id, target.title || '未命名记录')
        }),
        'delete event',
      )
    },
    duplicateFocusedEvent: () => {
      const eventId = useUIStore.getState().lastFocusedEventId
      if (!eventId) return
      fireAndForget(useEventStore.getState().duplicateEvent(eventId), 'duplicate event')
    },
    quickCaptureEvent: openQuickCapture,
    toggleSidebar: () => useUIStore.getState().toggleSidebar(),
    toggleWeekMonthView: () => {
      if (!location.pathname.startsWith('/week')) return
      const viewMode = (searchParams.get('view') as 'week' | 'month' | null) ?? 'week'
      if (viewMode === 'month') {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('view')
          next.delete('date')
          return next
        }, { replace: true })
      } else {
        const weekParam = searchParams.get('week')
        const base = weekParam ? parseISO(weekParam) : new Date()
        setSearchParams(
          { view: 'month', date: formatISODate(new Date(base.getFullYear(), base.getMonth(), 1)) },
          { replace: true },
        )
      }
    },
  }), [navigate, searchParams, setTheme, theme, location, setSearchParams, openQuickCapture])

  useShortcutManager(shortcutHandlers)

  // 域切换快捷键：Alt+N 由插件声明的 shortcutOrder 决定。
  // 关闭插件后该域不在 collectDomains 里，快捷键自然失效，主体不需要知道是哪个域。
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 2) return
      const hit = collectDomains(enabledPlugins ?? {}).find((d) => d.domain.shortcutOrder === n)
      if (!hit) return
      e.preventDefault()
      navigate(hit.domain.to)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabledPlugins, navigate])

  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const isWeek = location.pathname.startsWith('/week')
  // 当前路径是否由某个域插件认领（决定顶栏/侧栏形态）
  const inPluginDomain = findDomainPlugin(location.pathname, enabledPlugins ?? {}) !== undefined

  return (
    <div className="h-screen flex flex-col bg-surface-base text-text-primary overflow-hidden">
      {/* 顶栏单独兜底：它崩了不该拖垮整页，用户还得能切视图 */}
      <ErrorBoundary title="顶栏出错了" compact>
        <AppHeader />
        {(!isWeek && !inPluginDomain) && <TopNavBar />}
      </ErrorBoundary>
      <div className="relative flex-1 flex min-h-0">
        {sidebarExpanded && (
          <div className="absolute inset-y-0 left-0 z-40 pointer-events-none">
            <div className="h-full pointer-events-auto">
              <ErrorBoundary title="侧栏出错了" compact>
                <UnifiedSidebar />
              </ErrorBoundary>
            </div>
          </div>
        )}
        <main className={`flex-1 h-full overflow-hidden flex flex-col min-w-0${sidebarExpanded ? ' desktop-panel-offset' : ''}`}>
        {/* 只包 Outlet：单页崩了外壳仍可用，能切到别的页 */}
        <ErrorBoundary title="这个页面出错了">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      </div>

      {/* 这三处原本 fallback={null}：慢机器上按 Ctrl+K 后界面毫无反应，
          用户会以为快捷键失效。给一个轻量 spinner，让「正在加载」可见。 */}
      {commandPaletteOpen && (
        <Suspense fallback={<OverlayFallback />}>
          <CommandPalette />
        </Suspense>
      )}
      {settingsModalOpen && (
        <Suspense fallback={<OverlayFallback />}>
          <SettingsModal />
        </Suspense>
      )}
      {quickCaptureInboxOpen && (
        <Suspense fallback={<OverlayFallback />}>
          <QuickCaptureInbox />
        </Suspense>
      )}
      <SnackbarHost />
      <UpdateBanner />
      {/* 全局快速记录入口的锚点：不可见，只给 Popover 定位用 */}
      <div
        ref={captureAnchorRef}
        aria-hidden="true"
        style={{ position: 'fixed', left: '50%', top: '30%', width: 1, height: 1, pointerEvents: 'none' }}
      />
      {capture?.open && captureAnchorRef.current && (
        <FloatingEventCard
          open
          anchorEl={captureAnchorRef.current}
          defaultTimes={capture.times}
          onClose={() => setCapture(null)}
          onSave={(input: CreateEventInput) =>
            useEventStore.getState().createEvent(input).then((e) => e.id)
          }
          onUpdate={async (input: UpdateEventInput) => { await useEventStore.getState().updateEvent(input) }}
          onDelete={(id: string) => useEventStore.getState().deleteEvent(id)}
          onContinue={(start: number, end: number) =>
            setCapture((prev) => (prev ? { open: true, times: { start, end } } : prev))
          }
        />
      )}
    </div>
  )
}

/** Preserves query params (week, openEvent, view, date) when redirecting / → /week */
const DEFAULT_VIEW_KEY = 'cailens-default-view'

function getDefaultViewFromStorage(): 'week' | 'month' {
  const stored = localStorage.getItem(DEFAULT_VIEW_KEY)
  if (stored === 'week' || stored === 'month') return stored
  return 'week'
}

function RedirectToWeek() {
  const loc = useLocation()
  const defaultView = getDefaultViewFromStorage()
  const search = defaultView === 'month'
    ? `?view=month${loc.search ? '&' + loc.search.slice(1) : ''}`
    : loc.search
  return <Navigate to={{ pathname: '/week', search }} replace />
}

export default function App() {
  // hook 必须在任何条件返回之前调用（rules-of-hooks）。
  // 返回的是 Route 元素数组，靠 Fragment 让 react-router 认作合法 children。
  const pluginRoutes = usePluginRoutes()

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<RedirectToWeek />} />
          <Route path="/week" element={<WeekView />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* 已启用插件的路由；无插件时渲染为空。
              注意是 hook 展开而非 <PluginRoutes /> —— react-router 只认 Route/Fragment */}
          {pluginRoutes}
        </Route>
      </Routes>
    </HashRouter>
  )
}
