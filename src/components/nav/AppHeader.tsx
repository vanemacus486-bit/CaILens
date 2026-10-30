/**
 * # AppHeader — 统一桌面端顶栏
 *
 * 始终渲染 ☰（侧栏切换）+ 🔍（搜索）。
 *
 * ← → 的语义完全由插件在 `PluginDomain.headerStepKind` 里声明，主体只按语义分派：
 * - 日历域（主体）：导航周 / 月 + 年月标签 + W/M 切换
 * - 'date-step'：按域内子视图的时间步长步进日期（趋势=日/周/月，热力=年，睡眠=月，其他=周）
 * - 'filter-cycle'：循环切换域内的 ?filter= 参数
 * - 'history'（默认）：前进/后退一条浏览器历史
 *
 * 移动端用原有的 TopNavBar，本组件仅在桌面端渲染。
 */

import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, Menu } from 'lucide-react'
import { addMonths, addYears, addDays } from 'date-fns'
import { addWeeks, formatISODate, getWeekStart, parseISODate } from '@/domain/time'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { findDomainPlugin } from '@/plugins/registry'
import { useUIStore } from '@/stores/uiStore'
import { useT } from '@/i18n/useT'
import type { AppLanguage } from '@/i18n/types'
import { LANGUAGE_LOCALE } from '@/i18n/types'
import { WindowControls } from './WindowControls'
import { HoverMenu } from '@/components/ui/hover-menu'
import { cycleActionFilter } from '@/lib/actionFilterCycle'
import { CompactSidebar } from './CompactSidebar'

function formatYearMonth(date: Date, language: AppLanguage): string {
  const locale = LANGUAGE_LOCALE[language] ?? 'zh-CN'
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' })
}

/**
 * 顶栏图标按钮的唯一尺寸：32×32，圆角 sm，图标 16 / strokeWidth 1.75。
 * 之前这里是 w-9 / w-8 / w-7 三种混用 + strokeWidth 1.75 与 2 混用，
 * 一排按钮看起来「不齐」就是尺寸没有阶梯造成的。
 */
const ICON_BTN =
  'w-[var(--icon-btn)] h-[var(--icon-btn)] flex items-center justify-center rounded-sm text-text-secondary ' +
  'hover:text-text-primary hover:bg-surface-sunken active:bg-surface-sunken ' +
  'cursor-pointer transition-colors duration-200 flex-shrink-0'
const ICON_BTN_QUIET = ICON_BTN.replace('text-text-secondary', 'text-text-tertiary')
const ICON_SIZE = 16
const ICON_STROKE = 1.75

export function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const language = useAppSettingsStore((s) => s.settings.language)
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const isWeek = location.pathname.startsWith('/week')
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)

  // 域内导航语义由插件显式声明，主体只按语义分派，不认识具体是哪个插件：
  // - date-step：按域内子视图步长步进日期
  // - filter-cycle：循环切换 ?filter= 参数
  // - history（默认）：前进/后退
  // 之前这里用「非 date-step 即 action」反推语义，等于主体知道规划插件的存在。
  const pluginDomain = findDomainPlugin(location.pathname, overrides ?? {})
  const isPluginDomain = pluginDomain !== undefined
  const stepKind = pluginDomain?.domain.headerStepKind ?? 'history'
  const isStats = stepKind === 'date-step'
  const isFilterCycle = stepKind === 'filter-cycle'
  // 箭头按钮在「不步进日期」的插件域里降为次要色：那两个箭头不是导航，而是域内筛选/历史
  const isQuietArrows = isPluginDomain && !isStats

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
    // week 模式：从 week 参数取该周周四所在月（跨月周按多数天所在月标注，而非固定周一）
    const weekParam = searchParams.get('week')
    const base = weekParam ? parseISODate(weekParam) : getWeekStart(new Date(), 1)
    return formatYearMonth(addDays(base, 3), language)
  }, [isWeek, viewMode, searchParams, language])

// ── 导航处理 ──

/** 复盘视图 → 顶栏箭头步长 */
type StatsStep = 'period' | 'year' | 'month' | 'week'
function getStatsStep(view: string): StatsStep {
  switch (view) {
    case 'trend':   return 'period'
    case 'heatmap': return 'year'
    case 'sleep':   return 'month'
    default:        return 'week'  // diet, hygiene
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
    } else if (isFilterCycle) {
      // ← 循环：archive → starred → all
      const next = new URLSearchParams(searchParams)
      const nextFilter = cycleActionFilter((searchParams.get('filter') as 'all' | 'starred' | 'archive' | null) ?? null, -1)
      if (nextFilter) next.set('filter', nextFilter)
      else next.delete('filter')
      next.delete('archiveDate')
      setSearchParams(next, { replace: true })
    }
  }, [isWeek, isStats, isFilterCycle, viewMode, searchParams, setSearchParams, navigate])

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
    } else if (isFilterCycle) {
      // → 循环：all → starred → archive
      const next = new URLSearchParams(searchParams)
      const nextFilter = cycleActionFilter((searchParams.get('filter') as 'all' | 'starred' | 'archive' | null) ?? null, 1)
      if (nextFilter) next.set('filter', nextFilter)
      else next.delete('filter')
      next.delete('archiveDate')
      setSearchParams(next, { replace: true })
    }
  }, [isWeek, isStats, isFilterCycle, viewMode, searchParams, setSearchParams, navigate])

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


  // 只有日历域与插件认领的主域需要这个顶栏，其余页面用 TopNavBar
  if (!isWeek && !isPluginDomain) return null

  return (
    <div className="nav-bar app-header flex items-center gap-1 px-3 h-[var(--header-h)] flex-shrink-0" data-tauri-drag-region>
      {/* ── Left: ☰ | 🔍 | ‹ › | label ── */}
      {sidebarExpanded ? (
        <button
          onClick={() => useUIStore.getState().toggleSidebar()}
          className={ICON_BTN}
          aria-label={t('nav.sidebar.toggle')}
        >
          <Menu size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </button>
      ) : (
        <HoverMenu content={<CompactSidebar />} delay={300}>
          <button
            onClick={() => useUIStore.getState().toggleSidebar()}
            className={ICON_BTN}
            aria-label={t('nav.sidebar.toggle')}
          >
            <Menu size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          </button>
        </HoverMenu>
      )}

        <button
          onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
          className={ICON_BTN_QUIET}
          aria-label={t('nav.search')}
        >
          <Search size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </button>

      <div className="flex items-center gap-0.5 ml-1">
        <button
          onClick={handlePrev}
          className={isQuietArrows ? ICON_BTN_QUIET : ICON_BTN}
          aria-label={t('nav.prev')}
        >
          <ChevronLeft size={ICON_SIZE} strokeWidth={2} />
        </button>
        <button
          onClick={handleNext}
          className={isQuietArrows ? ICON_BTN_QUIET : ICON_BTN}
          aria-label={t('nav.next')}
        >
          <ChevronRight size={ICON_SIZE} strokeWidth={2} />
        </button>
        {yearMonthLabel && (
          <button
            onClick={handleBackToToday}
            className="inline-flex items-center h-8 px-2.5 ml-1 rounded-sm font-sans text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken active:bg-surface-sunken cursor-pointer transition-colors duration-200 select-none"
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
            className={ICON_BTN}
            aria-label={viewMode === 'month'
              ? t('nav.weekView')
              : t('nav.monthView')
            }
          >
            <span
              className="font-sans font-semibold text-sm select-none"
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
