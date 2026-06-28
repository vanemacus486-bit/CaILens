/**
 * # AppHeader — 统一桌面端顶栏
 *
 * 始终渲染 ☰（侧栏切换）+ 🔍（搜索）。
 * - /week: ← → 导航周/月 + 年月标签 + W/M 切换
 * - /stats: ← → 按当前复盘视图的时间步长导航（趋势=日/周/月, 热力=年, 睡眠=月, 其他=周）
 * - /action: ← → 浏览器历史导航
 *
 * 移动端用原有的 TopNavBar，本组件仅在桌面端渲染。
 */

import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, Menu } from 'lucide-react'
import { addMonths, addYears, addDays } from 'date-fns'
import { addWeeks, formatISODate, getWeekStart, parseISODate } from '@/domain/time'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { useT } from '@/i18n/useT'
import type { AppLanguage } from '@/i18n/types'
import { LANGUAGE_LOCALE } from '@/i18n/types'
import { WindowControls } from './WindowControls'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { HoverMenu } from '@/components/ui/hover-menu'
import { CompactSidebar } from './CompactSidebar'

function formatYearMonth(date: Date, language: AppLanguage): string {
  const locale = LANGUAGE_LOCALE[language] ?? 'zh-CN'
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' })
}

export function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const language = useAppSettingsStore((s) => s.settings.language)
  const isMobile = useIsMobile()
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const isWeek = location.pathname.startsWith('/week')
  const isStats = location.pathname.startsWith('/stats')
  const isAction = location.pathname.startsWith('/action')
  const isActionOrStats = isAction || isStats

  const t = useT()

  const viewMode = (searchParams.get('view') as 'week' | 'month' | null) ?? 'week'

  // ── 标签文本（所有 hooks 必须在 early return 之前调用）──
  const yearMonthLabel = useMemo(() => {
    if (!isWeek) return ''
    if (viewMode === 'month') {
      const dateParam = searchParams.get('date')
      if (dateParam) {
        const parsed = parseISODate(dateParam)
        if (!isNaN(parsed.getTime())) return formatYearMonth(parsed, language)
      }
    }
    // week 模式：从 week 参数取
    const weekParam = searchParams.get('week')
    const base = weekParam ? parseISODate(weekParam) : getWeekStart(new Date(), 1)
    return formatYearMonth(base, language)
  }, [isWeek, viewMode, searchParams, language])

// ── 导航处理 ──

/** 复盘视图 → 顶栏箭头步长 */
type StatsStep = 'period' | 'year' | 'month' | 'week'
function getStatsStep(view: string): StatsStep {
  switch (view) {
    case 'trend':   return 'period'
    case 'heatmap': return 'year'
    case 'sleep':   return 'month'
    default:        return 'week'  // diet, hygiene, outfit, mood
  }
}

function shiftStatsDate(date: Date, step: StatsStep, period: string, dir: 1 | -1): Date {
  switch (step) {
    case 'period': {
      const p = period === 'day' ? 'day' : period === 'month' ? 'month' : 'week'
      switch (p) {
        case 'day':   return addDays(date, dir)
        case 'week':  return addWeeks(date, dir)
        case 'month': return addMonths(date, dir)
      }
      break
    }
    case 'year':   return addYears(date, dir)
    case 'month':  return addMonths(date, dir)
    case 'week':   return addWeeks(date, dir)
  }
}

  const handlePrev = useCallback(() => {
    if (isWeek) {
      if (viewMode === 'month') {
        const dateParam = searchParams.get('date')
        const base = dateParam ? parseISODate(dateParam) : new Date()
        const prev = addMonths(base, -1)
        setSearchParams(
          { view: 'month', date: formatISODate(prev) },
          { replace: true },
        )
      } else {
        const weekParam = searchParams.get('week')
        const base = weekParam ? parseISODate(weekParam) : getWeekStart(new Date(), 1)
        setSearchParams(
          { week: formatISODate(addWeeks(base, -1)) },
          { replace: true },
        )
      }
    } else if (isStats) {
      const statsView = searchParams.get('view') ?? 'trend'
      const step = getStatsStep(statsView)
      const period = searchParams.get('period') ?? 'week'
      const dateParam = searchParams.get('date')
      const base = dateParam ? parseISODate(dateParam) : new Date()
      const prev = shiftStatsDate(base, step, period, -1)
      const next = new URLSearchParams(searchParams)
      next.set('date', formatISODate(prev))
      setSearchParams(next, { replace: true })
    } else if (isAction) {
      // ← 循环：archive → starred → all
      const next = new URLSearchParams(searchParams)
      const current = searchParams.get('filter') ?? 'all'
      if (current === 'archive') next.set('filter', 'starred')
      else if (current === 'starred') next.delete('filter')
      else next.set('filter', 'archive') // all → archive
      next.delete('archiveDate')
      setSearchParams(next, { replace: true })
    }
  }, [isWeek, isStats, isAction, viewMode, searchParams, setSearchParams, navigate])

  const handleNext = useCallback(() => {
    if (isWeek) {
      if (viewMode === 'month') {
        const dateParam = searchParams.get('date')
        const base = dateParam ? parseISODate(dateParam) : new Date()
        const next = addMonths(base, 1)
        setSearchParams(
          { view: 'month', date: formatISODate(next) },
          { replace: true },
        )
      } else {
        const weekParam = searchParams.get('week')
        const base = weekParam ? parseISODate(weekParam) : getWeekStart(new Date(), 1)
        setSearchParams(
          { week: formatISODate(addWeeks(base, 1)) },
          { replace: true },
        )
      }
    } else if (isStats) {
      const statsView = searchParams.get('view') ?? 'trend'
      const step = getStatsStep(statsView)
      const period = searchParams.get('period') ?? 'week'
      const dateParam = searchParams.get('date')
      const base = dateParam ? parseISODate(dateParam) : new Date()
      const nextDate = shiftStatsDate(base, step, period, 1)
      const next = new URLSearchParams(searchParams)
      next.set('date', formatISODate(nextDate))
      setSearchParams(next, { replace: true })
    } else if (isAction) {
      // → 循环：all → starred → archive
      const next = new URLSearchParams(searchParams)
      const current = searchParams.get('filter') ?? 'all'
      if (current === 'all') next.set('filter', 'starred')
      else if (current === 'starred') next.set('filter', 'archive')
      else next.delete('filter') // archive → all
      next.delete('archiveDate')
      setSearchParams(next, { replace: true })
    }
  }, [isWeek, isStats, isAction, viewMode, searchParams, setSearchParams, navigate])

  // ── W/M 切换（仅 /week） ──
  const toggleViewMode = useCallback(() => {
    if (viewMode === 'month') {
      // 月→周：清除 view 和 date 参数
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('view')
        next.delete('date')
        return next
      }, { replace: true })
    } else {
      // 周→月：设置 view=month 和 date 为当月第一天
      const weekParam = searchParams.get('week')
      const base = weekParam ? parseISODate(weekParam) : new Date()
      setSearchParams(
        { view: 'month', date: formatISODate(new Date(base.getFullYear(), base.getMonth(), 1)) },
        { replace: true },
      )
    }
  }, [viewMode, searchParams, setSearchParams])

  // ── 回到今天 ──
  const handleBackToToday = useCallback(() => {
    const now = new Date()
    if (viewMode === 'month') {
      setSearchParams(
        { view: 'month', date: formatISODate(new Date(now.getFullYear(), now.getMonth(), 1)) },
        { replace: true },
      )
    } else {
      setSearchParams(
        { week: formatISODate(getWeekStart(now, 1)) },
        { replace: true },
      )
    }
  }, [viewMode, setSearchParams])

  // 移动端不渲染 — 沿用现有 TopNavBar
  if (isMobile) return null

  // 只有 /week、/action、/stats 需要显示这个顶栏，其余页面用 TopNavBar
  if (!isWeek && !isActionOrStats) return null

  return (
    <div className="nav-bar flex items-center px-3 h-[52px] flex-shrink-0" data-tauri-drag-region>
      {/* ── Left: ☰ | 🔍 | ‹ › | label ── */}
      {sidebarExpanded ? (
        <button
          onClick={() => useUIStore.getState().toggleSidebar()}
          className="w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken active:bg-surface-sunken cursor-pointer transition-colors duration-200 flex-shrink-0"
          aria-label={t('nav.sidebar.toggle')}
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>
      ) : (
        <HoverMenu content={<CompactSidebar />} delay={300}>
          <button
            onClick={() => useUIStore.getState().toggleSidebar()}
            className="w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken active:bg-surface-sunken cursor-pointer transition-colors duration-200 flex-shrink-0"
            aria-label={t('nav.sidebar.toggle')}
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
        </HoverMenu>
      )}

        <button
          onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken active:bg-surface-sunken cursor-pointer transition-colors duration-200 flex-shrink-0"
          aria-label={t('nav.search')}
        >
          <Search size={15} strokeWidth={1.75} />
        </button>

      <div className="flex items-center gap-1 ml-1">
        <button
          onClick={handlePrev}
          className={`w-7 h-7 flex items-center justify-center rounded-md hover:text-text-primary hover:bg-surface-sunken active:bg-surface-sunken cursor-pointer transition-colors duration-200 ${isAction ? 'text-text-tertiary' : 'text-text-secondary'}`}
          aria-label={t('nav.prev')}
        >
          <ChevronLeft size={15} strokeWidth={2} />
        </button>
        <button
          onClick={handleNext}
          className={`w-7 h-7 flex items-center justify-center rounded-md hover:text-text-primary hover:bg-surface-sunken active:bg-surface-sunken cursor-pointer transition-colors duration-200 ${isAction ? 'text-text-tertiary' : 'text-text-secondary'}`}
          aria-label={t('nav.next')}
        >
          <ChevronRight size={15} strokeWidth={2} />
        </button>
        {yearMonthLabel && (
          <button
            onClick={handleBackToToday}
            className="inline-flex items-center h-7 px-2 ml-1 rounded-md font-sans text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken active:bg-surface-sunken cursor-pointer transition-colors duration-200 select-none"
            aria-label={t('nav.jumpToday')}
          >
            {yearMonthLabel}
          </button>
        )}
      </div>

      <div className="flex-1" data-tauri-drag-region />

      {/* ── Right（仅 /week 显示 W/M 切换）── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isWeek && (
          <button
            onClick={toggleViewMode}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken active:bg-surface-sunken cursor-pointer transition-colors duration-200 bg-transparent flex-shrink-0"
            aria-label={viewMode === 'month'
              ? t('nav.weekView')
              : t('nav.monthView')
            }
          >
            <span
              className="font-sans font-bold text-[13px] select-none"
              style={{
                display: 'inline-block',
                transform: viewMode === 'month'
                  ? 'perspective(120px) rotateX(180deg)'
                  : 'perspective(120px) rotateX(0deg)',
                transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
              }}
            >
              W
            </span>
          </button>
        )}

        <WindowControls />
      </div>
    </div>
  )
}
