import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart3, CalendarDays, CheckSquare, Plus, Search, Settings, User } from 'lucide-react'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useProfileStore } from '@/stores/profileStore'
import { useTodoStore } from '@/stores/todoStore'
import { useTodoListStore } from '@/stores/todoListStore'
import { useProjectStore } from '@/stores/projectStore'
import { useLocationStore } from '@/stores/locationStore'
import { SnackbarHost } from '@/components/ui/snackbar'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatISODate } from '@/domain/time'
import { MobileEventEditor, type MobileEditorDefaults } from './MobileEventEditor'
import { useAndroidBackButton } from './useAndroidBackButton'

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_ZH = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

function parseDateParam(param: string | null): Date {
  if (!param) return new Date()
  const parsed = new Date(param)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function nextHalfHour(date: Date): number {
  const now = new Date(date)
  const current = new Date()
  if (formatISODate(now) === formatISODate(current)) {
    now.setHours(current.getHours(), current.getMinutes(), 0, 0)
  }
  const minutes = now.getMinutes()
  now.setMinutes(minutes < 30 ? 30 : 0, 0, 0)
  if (minutes >= 30) now.setHours(now.getHours() + 1)
  return now.getTime()
}

const NAV_ITEMS = [
  { path: '/day', label: '日历', icon: CalendarDays, match: (p: string) => p === '/day' || p === '/week' || p === '/month' || p === '/' },
  { path: '/action', label: '规划', icon: CheckSquare, match: (p: string) => p.startsWith('/action') || p.startsWith('/projects') },
  { path: '/stats', label: '复盘', icon: BarChart3, match: (p: string) => p.startsWith('/stats') },
  { path: '/profile', label: '档案', icon: User, match: (p: string) => p.startsWith('/profile') },
]

export function MobileLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [editorDefaults, setEditorDefaults] = useState<MobileEditorDefaults>({ startTime: 0, endTime: 0 })

  useEffect(() => {
    fireAndForget(useCategoryStore.getState().loadCategories(), 'load categories')
    fireAndForget(useAppSettingsStore.getState().loadSettings(), 'load settings')
    fireAndForget(useProfileStore.getState().loadProfile(), 'load profile')
    fireAndForget(useTodoStore.getState().loadTodos(), 'load todos')
    fireAndForget(useTodoListStore.getState().loadLists(), 'load lists')
    fireAndForget(useProjectStore.getState().loadAll(), 'load projects')
    fireAndForget(useLocationStore.getState().loadLocation(), 'load location')
    fireAndForget(useLocationStore.getState().loadDayLocations(), 'load day locations')
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const previous = root.dataset.style
    if (!previous || previous === 'graphite') root.dataset.style = 'tide'
    return () => {
      if (!previous) delete root.dataset.style
      else root.dataset.style = previous
    }
  }, [])

  const selectedDate = useMemo(() => parseDateParam(params.get('date')), [params])
  const isToday = formatISODate(selectedDate) === formatISODate(new Date())
  const title = `${MONTH_ZH[selectedDate.getMonth()]} ${selectedDate.getDate()}`
  const subtitle = `周${WEEKDAY_ZH[selectedDate.getDay()]}`

  const closeTopOverlay = useCallback(() => {
    if (editorOpen) {
      setEditorOpen(false)
      return true
    }
    return false
  }, [editorOpen])
  useAndroidBackButton({ closeTopOverlay })

  const showGlobalFab = location.pathname !== '/day' && !editorOpen

  const openCreate = useCallback(() => {
    const startTime = nextHalfHour(selectedDate)
    setEditorDefaults({ startTime, endTime: startTime + 30 * 60_000 })
    setEditorKey((k) => k + 1)
    setEditorOpen(true)
  }, [selectedDate])

  return (
    <div className="h-screen flex flex-col bg-surface-base text-text-primary overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <header className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
        <button onClick={() => navigate(`/day?date=${formatISODate(new Date())}`)} className="min-w-0 text-left">
          <div className="font-serif text-[34px] leading-none tracking-normal text-text-primary">{title}</div>
          <div className="mt-1 text-xs text-text-tertiary">{subtitle}{!isToday ? ' · 点按回今天' : ' · 今天'}</div>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/search')} className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center text-text-secondary" aria-label="搜索">
            <Search size={18} />
          </button>
          <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center text-text-secondary" aria-label="设置">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {showGlobalFab && (
      <button
        onClick={openCreate}
        className="fixed right-5 z-40 w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 74px)' }}
        aria-label="记录"
      >
        <Plus size={26} />
      </button>
      )}

      <nav className="flex-shrink-0 px-3 pt-2 bg-surface-base/95 border-t border-border-subtle" style={{ paddingBottom: 'env(safe-area-inset-bottom, 10px)' }}>
        <div className="grid grid-cols-4 gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.match(location.pathname)
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path === '/day' ? `/day?date=${formatISODate(selectedDate)}` : item.path)}
                className={active ? 'flex flex-col items-center gap-1 rounded-2xl py-2 text-accent bg-surface-raised' : 'flex flex-col items-center gap-1 rounded-2xl py-2 text-text-tertiary'}
              >
                <Icon size={19} />
                <span className="text-[11px]">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <MobileEventEditor
        key={editorKey}
        open={editorOpen}
        defaults={editorDefaults}
        onClose={() => setEditorOpen(false)}
      />
      <SnackbarHost />
    </div>
  )
}
