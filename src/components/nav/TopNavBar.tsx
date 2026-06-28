import { Search } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { SlideSegmented } from './SlideSegmented'
import { useDomainNav } from './domainNav'
import { WindowControls } from './WindowControls'
import { SlidingPills } from '@/components/stats/SlidingPills'
import { AccountMenu } from './AccountMenu'
import type { RoutineViewMode } from '@/components/stats/EasternStatsShell'

const STATS_PILLS: { id: RoutineViewMode; label: string }[] = [
  { id: 'trend',   label: '趋势' },
  { id: 'heatmap', label: '热力' },
  { id: 'sleep',   label: '睡眠' },
  { id: 'diet',    label: '饮食' },
  { id: 'hygiene', label: '卫生' },
  { id: 'outfit',  label: '穿搭' },
  { id: 'mood',    label: '情绪' },
]

export function TopNavBar() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeMode, navItems, handleModeChange } = useDomainNav()

  const isStats = location.pathname === '/stats'
  const routineView = (searchParams.get('view') as RoutineViewMode | null) ?? 'trend'

  const setRoutineView = (v: RoutineViewMode) => {
    const next = new URLSearchParams(searchParams)
    if (v === 'trend') next.delete('view')
    else next.set('view', v)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="nav-bar flex items-center px-6 h-[52px] flex-shrink-0" data-tauri-drag-region>
      {isStats && (
        <div className="ml-5 flex-shrink-0">
          <SlidingPills items={STATS_PILLS} value={routineView} onChange={setRoutineView} dividerAfter={2} />
        </div>
      )}

      <div className="flex-1" data-tauri-drag-region />

      <div className="flex items-center gap-2 flex-shrink-0">
        <SlideSegmented items={navItems} value={activeMode} onChange={handleModeChange} shareKey="domain" shortcuts={{ calendar: 'Alt+1', plan: 'Alt+2', review: 'Alt+3' }} />

        <button
          onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken cursor-pointer transition-colors duration-200"
          aria-label="Search"
        >
          <Search size={15} strokeWidth={1.75} />
        </button>

        <AccountMenu variant="bar" />

        <WindowControls />
      </div>
    </div>
  )
}
