import { Search, Settings } from 'lucide-react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { SlideSegmented } from './SlideSegmented'
import { useDomainNav } from './domainNav'
import { SlidingPills } from '@/components/stats/SlidingPills'
import type { RoutineViewMode } from '@/components/stats/EasternStatsShell'

const STATS_PILLS: { id: RoutineViewMode; label: string }[] = [
  { id: 'trend',   label: '趋势' },
  { id: 'heatmap', label: '热力' },
  { id: 'sleep',   label: '睡眠' },
  { id: 'diet',    label: '饮食' },
  { id: 'hygiene', label: '卫生' },
  { id: 'outfit',  label: '穿搭' },
]

export function TopNavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const language = useAppSettingsStore((s) => s.settings.language)
  const { activeMode, navItems, handleModeChange } = useDomainNav(language)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const isStats = location.pathname === '/stats'
  const routineView = (searchParams.get('view') as RoutineViewMode | null) ?? 'trend'

  const setRoutineView = (v: RoutineViewMode) => {
    const next = new URLSearchParams(searchParams)
    if (v === 'trend') next.delete('view')
    else next.set('view', v)
    setSearchParams(next, { replace: true })
  }

  // 复盘域内子切换：规划(/action) vs 日常(/stats)
  const reviewSubMode = location.pathname.startsWith('/action') ? 'plan' : 'daily'
  const reviewSubItems = [
    { id: 'plan'  as const, label: t('规划', 'Plan')  },
    { id: 'daily' as const, label: t('日常', 'Daily') },
  ]

  return (
    <div className="nav-bar flex items-center px-6 h-[52px] flex-shrink-0">
      <span className="font-serif text-[17px] font-semibold text-text-primary tracking-[-0.01em] select-none flex-shrink-0">
        CaILens
      </span>

      {isStats && (
        <div className="ml-5 flex-shrink-0">
          <SlidingPills items={STATS_PILLS} value={routineView} onChange={setRoutineView} dividerAfter={2} />
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2 flex-shrink-0">
        {activeMode === 'review' && (
          <SlideSegmented
            items={reviewSubItems}
            value={reviewSubMode}
            onChange={(v) => navigate(v === 'plan' ? '/action' : '/stats')}
          />
        )}

        <SlideSegmented items={navItems} value={activeMode} onChange={handleModeChange} expand />

        <button
          onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken cursor-pointer transition-colors duration-200"
          aria-label="Search"
        >
          <Search size={15} strokeWidth={1.75} />
        </button>

        <button
          onClick={() => useUIStore.getState().setSettingsModalOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer"
          aria-label="Settings"
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
