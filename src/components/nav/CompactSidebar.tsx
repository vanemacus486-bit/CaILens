/**
 * # CompactSidebar — 侧栏内容紧凑版
 *
 * 复刻侧边栏的功能内容，用于悬停卡片中提供无侧栏环境下的快捷操作。
 * 样式与 SimpleSidebar / WeekSidebar 对齐。
 */

import { useMemo } from 'react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { Settings, CheckCircle, Star, TrendingUp, LayoutGrid, Moon, Utensils, Droplets, Shirt, Smile } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useT } from '@/i18n/useT'
import { useDomainNav } from '@/components/nav/domainNav'
import { SlideSegmented } from '@/components/nav/SlideSegmented'
import { upcomingMarks, formatRelativeDay } from '@/domain/dayMark'
import { formatISODate, getWeekStart } from '@/domain/time'
import type { RoutineViewMode } from '@/components/stats/EasternStatsShell'
import type { LucideIcon } from 'lucide-react'

const STATS_VIEWS: { id: RoutineViewMode; labelKey: string; icon: LucideIcon }[] = [
  { id: 'trend',   labelKey: 'stats.trend',   icon: TrendingUp },
  { id: 'heatmap', labelKey: 'stats.heatmap', icon: LayoutGrid },
  { id: 'sleep',   labelKey: 'stats.sleep',   icon: Moon },
  { id: 'diet',    labelKey: 'stats.diet',    icon: Utensils },
  { id: 'hygiene', labelKey: 'stats.hygiene', icon: Droplets },
  { id: 'outfit',  labelKey: 'stats.outfit',  icon: Shirt },
  { id: 'mood',    labelKey: 'stats.mood',    icon: Smile },
]

export function CompactSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const language = useAppSettingsStore((s) => s.settings.language)
  const dayMarks = useAppSettingsStore((s) => s.settings.dayMarks ?? [])
  const { activeMode, navItems, handleModeChange } = useDomainNav()
  const t = useT()

  const isWeek = location.pathname.startsWith('/week') || location.pathname === '/'
  const isStats = location.pathname === '/stats'
  const isAction = location.pathname === '/action'
  const routineView = (searchParams.get('view') as RoutineViewMode | null) ?? 'trend'
  const todoFilter = (searchParams.get('filter') as 'all' | 'starred' | null) ?? 'all'

  const setRoutineView = (v: RoutineViewMode) => {
    const next = new URLSearchParams(searchParams)
    if (v === 'trend') next.delete('view')
    else next.set('view', v)
    setSearchParams(next, { replace: true })
  }

  const setTodoFilter = (v: 'all' | 'starred') => {
    const next = new URLSearchParams(searchParams)
    if (v === 'all') next.delete('filter')
    else next.set('filter', v)
    setSearchParams(next, { replace: true })
  }

  const handleOpenSettings = () => {
    import('@/stores/uiStore').then(({ useUIStore }) => {
      useUIStore.getState().setSettingsModalOpen(true)
    })
  }

  // ── /week 提醒 ──
  const reminders = useMemo(() => {
    if (!isWeek) return []
    return upcomingMarks(dayMarks, Date.now()).slice(0, 5)
  }, [isWeek, dayMarks])

  const handleReminderClick = (dateMs: number) => {
    const ws = getWeekStart(new Date(dateMs), 1)
    navigate(`/week?week=${formatISODate(ws)}&highlight=${formatISODate(new Date(dateMs))}`)
  }

  // Shared button classes matching SimpleSidebar
  const btnBase =
    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer border-none transition-all duration-200 ease-out font-sans leading-none'
  const btnSelected = 'bg-accent text-white font-medium'
  const btnUnselected = 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8'

  return (
    <div className="flex flex-col gap-1 w-56">
      {/* ── 域导航 ── */}
      <SlideSegmented
        items={navItems}
        value={activeMode}
        onChange={handleModeChange}
        shareKey="domain"
        stretch
        shortcuts={{ calendar: 'Alt+1', plan: 'Alt+2', review: 'Alt+3' }}
      />

      <div className="h-px bg-border-subtle" />

      {/* ── /action：规划过滤 ── */}
      {isAction && (
        <div className="flex flex-col gap-0.5">
          {([
            { id: 'all' as const, labelKey: 'sidebar.allTasks', icon: CheckCircle },
            { id: 'starred' as const, labelKey: 'sidebar.starred', icon: Star },
          ]).map((v) => {
            const Icon = v.icon
            const selected = v.id === todoFilter
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setTodoFilter(v.id)}
                className={`${btnBase} ${selected ? btnSelected : btnUnselected}`}
              >
                <Icon size={16} strokeWidth={1.75} className={selected ? 'text-white' : 'text-text-tertiary'} />
                <span>{t(v.labelKey)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── /stats：复盘子视图 ── */}
      {isStats && (
        <div className="flex flex-col gap-0.5">
          {STATS_VIEWS.map((v) => {
            const Icon = v.icon
            const selected = v.id === routineView
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setRoutineView(v.id)}
                className={`${btnBase} ${selected ? btnSelected : btnUnselected}`}
              >
                <Icon size={16} strokeWidth={1.75} className={selected ? 'text-white' : 'text-text-tertiary'} />
                <span>{t(v.labelKey)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── /week：即将到来提醒 ── */}
      {isWeek && reminders.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {reminders.map((mark) => (
            <button
              key={mark.id}
              type="button"
              onClick={() => handleReminderClick(mark.date)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer text-left hover:bg-surface-base transition-colors border-none bg-transparent"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: mark.color
                    ? `var(--event-${mark.color}-fill)`
                    : 'var(--accent)',
                }}
              />
              <span className="flex-1 truncate text-text-primary min-w-0">{mark.label}</span>
              <span className="text-text-tertiary flex-shrink-0">
                {formatRelativeDay(mark.date, Date.now(), language)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="h-px bg-border-subtle" />

      {/* ── 设置 ── */}
      <button type="button" onClick={handleOpenSettings} className={`${btnBase} ${btnUnselected}`}>
        <Settings size={16} strokeWidth={1.75} className="text-text-tertiary" />
        <span>{t('nav.settings')}</span>
      </button>
    </div>
  )
}
