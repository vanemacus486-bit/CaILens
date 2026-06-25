import { useEffect } from 'react'
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useProfileStore } from '@/stores/profileStore'
import { useUIStore } from '@/stores/uiStore'
import { SettingsModal } from '@/features/settings/SettingsModal'
import { SnackbarHost } from '@/components/ui/snackbar'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatISODate } from '@/domain/time'

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_ZH = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

function formatMobileHeader(date: Date): string {
  const wd = WEEKDAY_ZH[date.getDay()]
  const mo = MONTH_ZH[date.getMonth()]
  const d = date.getDate()
  return `${mo} ${d}日 · 周${wd}`
}

export function MobileLayout() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    const loadCategories = useCategoryStore.getState().loadCategories
    const loadSettings = useAppSettingsStore.getState().loadSettings
    const loadProfile = useProfileStore.getState().loadProfile
    fireAndForget(loadCategories(), 'load categories')
    fireAndForget(loadSettings(), 'load settings')
    fireAndForget(loadProfile(), 'load profile')
  }, [])

  const openSettings = () => useUIStore.getState().setSettingsModalOpen(true)

  const goToday = () => {
    navigate(`/day?date=${formatISODate(new Date())}`)
  }

  // Determine current display date from URL param
  const dateParam = params.get('date')
  const displayDate = dateParam ? new Date(dateParam) : new Date()
  const isToday = formatISODate(displayDate) === formatISODate(new Date())

  return (
    <div className="h-screen flex flex-col bg-surface-base text-text-primary overflow-hidden"
         style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-serif text-sm text-text-primary">
            {formatMobileHeader(displayDate)}
          </span>
          {!isToday && (
            <button
              onClick={goToday}
              className="text-xs text-accent font-medium px-2 py-0.5 rounded-full bg-accent/10 active:scale-95 transition-transform"
            >
              今天
            </button>
          )}
        </div>
        <button
          onClick={openSettings}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised active:scale-90 transition-all"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Page content */}
      <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <SettingsModal />
      <SnackbarHost />
    </div>
  )
}
