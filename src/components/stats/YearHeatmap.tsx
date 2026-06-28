import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import type { CalendarEvent } from '@/domain/event'
import type { Category, CategoryId } from '@/domain/category'
import { computeDayStats } from '@/domain/stats'
import { COLOR } from '@/styles/tokens'
import { useT } from '@/i18n/useT'
import type { AppLanguage } from '@/i18n/types'
import { LANGUAGE_LOCALE } from '@/i18n/types'

const DAY_MS = 24 * 60 * 60_000
const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

// ── Types ────────────────────────────────────────────────────

export interface DayCell {
  byCategory: Record<CategoryId, number>  // hours per category
  byRatio: Record<CategoryId, number>      // hours / (weeklyBudget/7)
}

interface HeatmapCell {
  date: Date
  ratio: number
  hours: number
  isFuture: boolean
  isToday: boolean
}

interface MonthLabel {
  nameZh: string
  nameEn: string
  colIndex: number  // 1-based CSS grid column
}

interface StatsData {
  cumulative: number
  dailyAvg: number
  streak: number
  bestDay: { date: Date; hours: number } | null
}

interface TooltipData {
  x: number
  y: number
  cell: HeatmapCell
  dayNameZh: string
  dayNameEn: string
}

// ── Pure functions ───────────────────────────────────────────

export function computeDailyGrid(
  events: readonly CalendarEvent[],
  categories: readonly Category[],
  rangeStart: number,
  rangeEnd: number,
): DayCell[] {
  const filtered = events.filter(
    (e) => e.startTime < rangeEnd && e.endTime > rangeStart,
  )

  const budgetMap = new Map<CategoryId, number>()
  for (const c of categories) {
    budgetMap.set(c.id, c.weeklyBudget)
  }

  const days: DayCell[] = []
  let cursor = rangeStart
  while (cursor < rangeEnd) {
    const dayEnd = cursor + DAY_MS
    const dayStats = computeDayStats(filtered, categories, { start: cursor, end: dayEnd })

    const byCategory: Record<string, number> = {}
    const byRatio: Record<string, number> = {}
    for (const stat of dayStats.byCategory) {
      const hours = stat.minutes / 60
      byCategory[stat.categoryId] = hours
      const budget = budgetMap.get(stat.categoryId) ?? 0
      byRatio[stat.categoryId] = budget > 0 ? hours / (budget / 7) : 0
    }
    for (const id of CATEGORY_IDS) {
      if (!(id in byCategory)) {
        byCategory[id] = 0
        byRatio[id] = 0
      }
    }

    days.push({
      byCategory: byCategory as Record<CategoryId, number>,
      byRatio: byRatio as Record<CategoryId, number>,
    })
    cursor = dayEnd
  }

  return days
}

export function computeYearDailyGrid(
  events: readonly CalendarEvent[],
  categories: readonly Category[],
  year: number,
): DayCell[] {
  const yearStart = new Date(year, 0, 1).getTime()
  const yearEnd = new Date(year + 1, 0, 1).getTime()
  return computeDailyGrid(events, categories, yearStart, yearEnd)
}

export function buildHeatmapGrid(
  days: DayCell[],
  selectedId: CategoryId,
  year: number,
  now: number,
): { grid: (HeatmapCell | null)[][]; monthLabels: MonthLabel[]; numWeeks: number } {
  const jan1 = new Date(year, 0, 1)
  const jan1Dow = jan1.getDay() // 0=Sun
  // Monday = row 0: offset makes firstMonday the Monday of the week containing Jan 1
  const offset = jan1Dow === 0 ? -6 : 1 - jan1Dow
  const firstMonday = new Date(jan1)
  firstMonday.setDate(jan1.getDate() + offset)

  const numDays = days.length // 365 or 366
  const numWeeks = Math.ceil((Math.abs(offset) + numDays) / 7)

  // Month labels: put label at column where a new month starts
  const monthLabels: MonthLabel[] = []
  const MONTH_NAMES_ZH = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  for (let w = 0; w < numWeeks; w++) {
    // Check the Thursday of this week to determine the month
    const thursday = new Date(firstMonday)
    thursday.setDate(firstMonday.getDate() + w * 7 + 3)
    const m = thursday.getMonth()
    const y = thursday.getFullYear()

    if (w === 0) {
      monthLabels.push({ nameZh: `${y}·${MONTH_NAMES_ZH[m]}`, nameEn: `${MONTH_NAMES_EN[m]} ${y}`, colIndex: w + 2 })
    } else {
      const prevThursday = new Date(firstMonday)
      prevThursday.setDate(firstMonday.getDate() + (w - 1) * 7 + 3)
      if (prevThursday.getMonth() !== m || prevThursday.getFullYear() !== y) {
        const showYear = y !== prevThursday.getFullYear()
        monthLabels.push({
          nameZh: showYear ? `${y}·${MONTH_NAMES_ZH[m]}` : MONTH_NAMES_ZH[m],
          nameEn: showYear ? `${MONTH_NAMES_EN[m]} ${y}` : MONTH_NAMES_EN[m],
          colIndex: w + 2,
        })
      }
    }
  }

  // Compute local-timezone start of `now` (matches the local-midnight dates created below)
  const nowDate = new Date(now)
  const nowDayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime()

  // Build grid: 7 rows × numWeeks columns (full matrix, null = outside year)
  const grid: (HeatmapCell | null)[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: numWeeks }, () => null),
  )

  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(firstMonday)
      dayDate.setDate(firstMonday.getDate() + w * 7 + d)
      const dayTs = dayDate.getTime()
      const jan1Ts = jan1.getTime()
      const dayIndex = Math.floor((dayTs - jan1Ts) / DAY_MS)

      if (dayIndex < 0 || dayIndex >= numDays) continue

      grid[d][w] = {
        date: dayDate,
        ratio: days[dayIndex].byRatio[selectedId],
        hours: days[dayIndex].byCategory[selectedId],
        isFuture: dayTs > now,
        isToday: dayTs >= nowDayStart && dayTs < nowDayStart + DAY_MS && dayDate.getFullYear() === new Date(now).getFullYear(),
      }
    }
  }

  return { grid, monthLabels, numWeeks }
}

export function buildRollingGrid(
  days: DayCell[],
  selectedId: CategoryId,
  endDate: Date,
  now: number,
): { grid: (HeatmapCell | null)[][]; monthLabels: MonthLabel[]; numWeeks: number } {
  const rangeStart = endDate.getTime() - 365 * DAY_MS
  const startDate = new Date(rangeStart)

  const numWeeks = 53 // Always fill 53 weeks for a rolling year

  // Anchor the last column to the week containing endDate so today is always
  // visible. Anchoring to rangeStart instead can push today one column past the
  // 53-week window when rangeStart lands late in its week (e.g. a Sunday).
  const endDow = endDate.getDay() // 0=Sun
  const endOffset = endDow === 0 ? -6 : 1 - endDow
  const lastMonday = new Date(endDate)
  lastMonday.setDate(endDate.getDate() + endOffset)
  const firstMonday = new Date(lastMonday)
  firstMonday.setDate(lastMonday.getDate() - (numWeeks - 1) * 7)

  // Month labels
  const monthLabels: MonthLabel[] = []
  for (let w = 0; w < numWeeks; w++) {
    const thursday = new Date(firstMonday)
    thursday.setDate(firstMonday.getDate() + w * 7 + 3)
    const m = thursday.getMonth()
    const y = thursday.getFullYear()
    if (w === 0) {
      monthLabels.push({
        nameZh: `${y}·${['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'][m]}`,
        nameEn: `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]} ${y}`,
        colIndex: w + 2,
      })
    } else {
      const prevThursday = new Date(firstMonday)
      prevThursday.setDate(firstMonday.getDate() + (w - 1) * 7 + 3)
      if (prevThursday.getMonth() !== m || prevThursday.getFullYear() !== y) {
        const showYear = y !== prevThursday.getFullYear()
        monthLabels.push({
          nameZh: showYear ? `${y}·${['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'][m]}` : ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'][m],
          nameEn: showYear ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]} ${y}` : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m],
          colIndex: w + 2,
        })
      }
    }
  }

  // Compute local-timezone start of `now` (matches the local-midnight dates created below)
  const nowDate = new Date(now)
  const nowDayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime()

  // Build grid: 7 rows × numWeeks columns
  const grid: (HeatmapCell | null)[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: numWeeks }, () => null),
  )

  const daysStart = startDate.getTime()
  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(firstMonday)
      dayDate.setDate(firstMonday.getDate() + w * 7 + d)
      const dayTs = dayDate.getTime()
      let dayIndex = Math.floor((dayTs - daysStart) / DAY_MS)
      // Clamp boundary cells (dayTs at range-end boundary → last valid index)
      if (dayIndex >= days.length) dayIndex = days.length - 1

      if (dayIndex < 0) continue

      grid[d][w] = {
        date: dayDate,
        ratio: days[dayIndex].byRatio[selectedId],
        hours: days[dayIndex].byCategory[selectedId],
        isFuture: dayTs > now,
        isToday: dayTs >= nowDayStart && dayTs < nowDayStart + DAY_MS,
      }
    }
  }

  return { grid, monthLabels, numWeeks }
}

export function getIntensityLevel(ratio: number, thresholds: readonly [number, number, number, number] = [0.1, 0.25, 0.5, 0.8]): 0 | 1 | 2 | 3 | 4 {
  if (ratio <= 0) return 0
  if (ratio < thresholds[0]) return 1
  if (ratio < thresholds[1]) return 2
  if (ratio < thresholds[2]) return 3
  return 4
}

export function computeDailyStreak(days: DayCell[], selectedId: CategoryId, now: number, rangeStart?: number): number {
  const jan1 = rangeStart ?? new Date(new Date(now).getFullYear(), 0, 1).getTime()
  const nowStart = new Date(now)
  nowStart.setHours(0, 0, 0, 0)
  const nowTs = nowStart.getTime()

  if (nowTs < jan1) return 0

  const idx = Math.floor((nowTs - jan1) / DAY_MS)
  if (idx < 0 || idx >= days.length) return 0

  let streak = 0
  for (let i = idx; i >= 0; i--) {
    if (days[i].byRatio[selectedId] > 0) streak++
    else break
  }
  return streak
}

export function computeStats(days: DayCell[], selectedId: CategoryId, now: number, rangeStart?: number): StatsData {
  let cumulative = 0
  let activeDays = 0
  let bestHours = 0
  let bestDate: Date | null = null

  const jan1 = rangeStart ?? new Date(new Date(now).getFullYear(), 0, 1).getTime()

  for (let i = 0; i < days.length; i++) {
    const hours = days[i].byCategory[selectedId]
    cumulative += hours
    if (hours > 0) activeDays++
    if (hours > bestHours) {
      bestHours = hours
      bestDate = new Date(jan1 + i * DAY_MS)
    }
  }

  return {
    cumulative,
    dailyAvg: activeDays > 0 ? cumulative / activeDays : 0,
    streak: computeDailyStreak(days, selectedId, now, rangeStart),
    bestDay: bestDate ? { date: bestDate, hours: bestHours } : null,
  }
}

// ── Helpers ──────────────────────────────────────────────────

const DAY_NAMES_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDayName(date: Date, lang: AppLanguage): string {
  const dow = date.getDay()
  const idx = dow === 0 ? 6 : dow - 1
  return lang === 'zh' ? DAY_NAMES_ZH[idx] : DAY_NAMES_EN[idx]
}

// ── Component ────────────────────────────────────────────────

interface YearHeatmapProps {
  rangeEvents: readonly CalendarEvent[]
  categories: readonly Category[]
  language: AppLanguage
  now?: number
  /** 外部控制的年份（来自 URL date 参数），提供后组件年份由此驱动 */
  anchorYear?: number
  /** 外部受控的分类单选（来自 StatsPage → StatsRail） */
  selectedId: CategoryId
  /** 分类切换回调 */
  onCategoryChange: (id: CategoryId) => void
  /** 外部受控的视图模式（roll / year） */
  viewMode: 'roll' | 'year'
  /** 视图模式切换回调 */
  onViewModeChange: (mode: 'roll' | 'year') => void
}

export function YearHeatmap({ rangeEvents, categories, language, now: _now, anchorYear, selectedId, onCategoryChange: _onCategoryChange, viewMode, onViewModeChange: _onViewModeChange }: YearHeatmapProps) {
  const [year, setYear] = useState(() => anchorYear ?? new Date().getFullYear())
  const [rollingEnd, setRollingEnd] = useState(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d
  })
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const now = _now ?? Date.now()

  // 外部 anchorYear 变化时同步内部状态
  useEffect(() => {
    if (anchorYear === undefined) return
    setYear(anchorYear)
    setRollingEnd(new Date(anchorYear, 11, 31, 23, 59, 59, 999))
  }, [anchorYear])

  // viewMode 变化时重置到当前日期
  useEffect(() => {
    const now = new Date()
    if (viewMode === 'year') {
      setYear(now.getFullYear())
    } else {
      setRollingEnd(new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999))
    }
  }, [viewMode])

  const isCurrentYear = year === new Date(now).getFullYear()

  const t = useT()

  const days = useMemo(
    () => {
      if (viewMode === 'year') return computeYearDailyGrid(rangeEvents, categories, year)
      const end = rollingEnd.getTime()
      const start = end - 365 * DAY_MS
      return computeDailyGrid(rangeEvents, categories, start, end)
    },
    [rangeEvents, categories, year, viewMode, rollingEnd],
  )

  const { grid, monthLabels, numWeeks } = useMemo(
    () => {
      if (viewMode === 'year') return buildHeatmapGrid(days, selectedId, year, now)
      return buildRollingGrid(days, selectedId, rollingEnd, now)
    },
    [days, selectedId, year, rollingEnd, now, viewMode],
  )

  const rangeStart = useMemo(() => {
    if (viewMode === 'year') return new Date(year, 0, 1).getTime()
    return rollingEnd.getTime() - 365 * DAY_MS
  }, [viewMode, year, rollingEnd])

  const stats = useMemo(
    () => computeStats(days, selectedId, now, rangeStart),
    [days, selectedId, now, rangeStart],
  )

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  // Sync --c-active when selectedId changes
  useEffect(() => {
    document.documentElement.style.setProperty('--c-active', `var(--event-${selectedId}-fill)`)
  }, [selectedId])

  const handlePointerEnter = useCallback(
    (cell: HeatmapCell, e: React.PointerEvent) => {
      if (cell.isFuture) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        cell,
        dayNameZh: getDayName(cell.date, 'zh'),
        dayNameEn: getDayName(cell.date, 'en'),
      })
    },
    [],
  )

  const handlePointerLeave = useCallback(() => setTooltip(null), [])

  // Compute responsive threshold
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 720

  // Dynamic intensity thresholds (percentile-based)
  const thresholds = useMemo(() => {
    const values: number[] = []
    for (const row of grid) {
      for (const cell of row) {
        if (cell && !cell.isFuture && cell.ratio > 0) {
          values.push(cell.ratio)
        }
      }
    }
    values.sort((a, b) => a - b)
    if (values.length === 0) return [0.1, 0.25, 0.5, 0.8] as const
    const n = values.length
    const idx = (pct: number) => Math.min(Math.floor(pct * (n - 1)), n - 1)
    return [
      values[idx(0.25)],
      values[idx(0.5)],
      values[idx(0.75)],
      values[idx(0.9)],
    ] as const
  }, [grid])

  // Build grid items
  const gridItems = useMemo(() => {
    const items: React.ReactNode[] = []

    // Month labels (row 1)
    for (const ml of monthLabels) {
      items.push(
        <div
          key={`m-${ml.colIndex}`}
          className="heatmap-month-label"
          style={{
            gridColumn: ml.colIndex,
            gridRow: 1,
            fontSize: 10,
            lineHeight: '18px',
          }}
        >
          {ml.nameEn}
        </div>,
      )
    }

    // Day labels (col 1): only show 一/三/五 or Mon/Wed/Fri
    const dayLabelRows = [0, 2, 4] // Monday=0, Wednesday=2, Friday=4
    const dayLabelsEn = ['Mon', 'Wed', 'Fri']
    for (let i = 0; i < 3; i++) {
      const dow = dayLabelRows[i]
      items.push(
        <div
          key={`dl-${dow}`}
          className="heatmap-day-label"
          style={{
            gridColumn: 1,
            gridRow: dow + 2,
            fontSize: 10,
            lineHeight: '14px',
          }}
        >
          {dayLabelsEn[i]}
        </div>,
      )
    }

    // Data cells — use inline styles + inner span for color (avoids CSS variable cross-stylesheet issues in WebView2)
    for (let dow = 0; dow < 7; dow++) {
      for (let w = 0; w < numWeeks; w++) {
        const cell = grid[dow][w]
        if (!cell) continue

        const level = getIntensityLevel(cell.ratio, thresholds)

        items.push(
          <div
            key={`c-${dow}-${w}`}
            className={`heatmap-cell${cell.isToday ? ' cell-today' : ''}${cell.isFuture ? ' cell-future' : ''}`}
            style={{
              gridColumn: w + 2,
              gridRow: dow + 2,
              backgroundColor: 'var(--heatmap-bg-cell-empty)',
            }}
            onPointerEnter={(e) => {
              if (cell.isFuture) return
              const rect = containerRef.current?.getBoundingClientRect()
              if (!rect) return
              setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                cell: cell as HeatmapCell,
                dayNameZh: getDayName(cell.date, 'zh'),
                dayNameEn: getDayName(cell.date, 'en'),
              })
            }}
            onPointerLeave={() => setTooltip(null)}
          >
            {level > 0 && (
              <span
                className="heatmap-cell-fill"
                style={{ opacity: COLOR.heatmapOpacityRamp[level] }}
              />
            )}
          </div>,
        )
      }
    }

    return items
  }, [grid, monthLabels, language, handlePointerEnter, handlePointerLeave, thresholds])

  // Best day info
  const bestDayStr = useMemo(() => {
    if (!stats.bestDay) return '-'
    const d = stats.bestDay.date
    const m = d.getMonth() + 1
    const day = d.getDate()
    const dayName = getDayName(d, language)
    const locale = LANGUAGE_LOCALE[language] ?? 'zh-CN'
    return language === 'zh'
      ? `${m}月${day}日 ${dayName}`
      : `${dayName} ${d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`
  }, [stats.bestDay, language])

  // Streak visualization pips
  const streakPips = Math.min(stats.streak, 5)
  const streakExtra = stats.streak > 5 ? stats.streak - 5 : 0

  // Historical best streak (for encouraging text when current streak === 0)
  const bestStreak = useMemo(() => {
    let maxStreak = 0, current = 0
    for (const day of days) {
      if (day.byCategory[selectedId] > 0) current++
      else { maxStreak = Math.max(maxStreak, current); current = 0 }
    }
    return Math.max(maxStreak, current)
  }, [days, selectedId])

  // Daily target hours for selected category
  const targetHours = useMemo(() => {
    const cat = catMap.get(selectedId)
    return cat ? cat.weeklyBudget / 7 : 0
  }, [catMap, selectedId])

  return (
    <div ref={containerRef} className="year-heatmap-root">
      <style>{HEATMAP_CSS}</style>

      {/* ── Heatmap grid ───────────────────────────────────── */}
      <div className="heatmap-grid-scroll">
        <div
          className="heatmap-grid"
          style={{
            gridTemplateColumns: `32px repeat(${numWeeks}, minmax(14px, 1fr))`,
            gridTemplateRows: `20px repeat(7, 1fr)`,
          }}
        >
          {gridItems}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────── */}
      <div className="heatmap-legend">
        <span>{t('更少', 'Less')}</span>
        <div className="heatmap-legend-swatch" style={{ backgroundColor: 'var(--heatmap-bg-cell-empty)' }} />
        {COLOR.heatmapOpacityRamp.slice(1).map((opacity) => (
          <div key={opacity} className="heatmap-legend-swatch" style={{ backgroundColor: 'var(--heatmap-bg-cell-empty)' }}>
            <span className="heatmap-cell-fill" style={{ opacity }} />
          </div>
        ))}
        <span>{t('更多', 'More')}</span>
      </div>

      {/* ── Legend text ──────────────────────────────────────── */}
      <div className="heatmap-legend-text">
        {t('由浅至深：0 → 超额完成', 'Light to dark: 0 → Over target')}
      </div>



      {/* ── Stats bar ───────────────────────────────────────── */}
      <div className={`heatmap-stats-bar${isCompact ? ' heatmap-stats-compact' : ''}`}>
        {/* Cumulative */}
        <div className="heatmap-stat">
          <div className="heatmap-stat-label">{t('累 计', 'Total')}</div>
          <div className="heatmap-stat-value">
            {stats.cumulative.toFixed(1)}
            <span className="heatmap-stat-unit">h</span>
          </div>
          <div className="heatmap-stat-detail">
            {t(`共 ${stats.cumulative > 0 ? Math.ceil(stats.cumulative / (stats.dailyAvg || 1)) : 0} 天有记录`, `${stats.cumulative > 0 ? Math.ceil(stats.cumulative / (stats.dailyAvg || 1)) : 0} days recorded`)}
          </div>
        </div>

        {/* Daily avg */}
        <div className="heatmap-stat">
          <div className="heatmap-stat-label">{t('日 均', 'Daily')}</div>
          <div className="heatmap-stat-value">
            {stats.dailyAvg.toFixed(1)}
            <span className="heatmap-stat-unit">h</span>
          </div>
          <div className="heatmap-stat-detail">
            {(() => {
              const pct = targetHours > 0 ? Math.round((stats.dailyAvg / targetHours) * 100) : 0
              return t(`达成 ${pct}%`, `${pct}% achieved`)
            })()}
          </div>
        </div>

        {/* Streak */}
        <div className="heatmap-stat">
          <div className="heatmap-stat-label">{t('连 续', 'Streak')}</div>
          <div className="heatmap-stat-value">
            {isCurrentYear ? (
              <>{stats.streak}<span className="heatmap-stat-unit">{t('天', 'd')}</span></>
            ) : (
              <span style={{ opacity: 0.3 }}>—</span>
            )}
          </div>
          <div className="heatmap-stat-detail">
            {!isCurrentYear ? (
              t('仅当年有效', 'Current year only')
            ) : stats.streak === 0 ? (
              <>
                <div>{t('再记一天即重启', 'One more day to restart')}</div>
                {bestStreak > 0 && (
                  <div style={{ marginTop: 2 }}>{t(`上次连续 ${bestStreak} 天`, `Last streak: ${bestStreak} days`)}</div>
                )}
              </>
            ) : (
              <span className="heatmap-streak-pips">
                {Array.from({ length: streakPips }).map((_, i) => (
                  <span
                    key={i}
                    className="heatmap-streak-pip"
                    style={{ backgroundColor: `var(--c-active)` }}
                  />
                ))}
                {streakExtra > 0 && (
                  <span className="heatmap-streak-extra">+{streakExtra} {t('保持中', 'going')}</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Best day */}
        <div className="heatmap-stat">
          <div className="heatmap-stat-label">{t('最 佳', 'Best')}</div>
          <div className="heatmap-stat-value">
            {stats.bestDay ? stats.bestDay.hours.toFixed(1) : '-'}
            {stats.bestDay ? <span className="heatmap-stat-unit">h</span> : null}
          </div>
          <div className="heatmap-stat-detail">{bestDayStr}</div>
        </div>

        {/* Target */}
        <div className="heatmap-stat">
          <div className="heatmap-stat-label">{t('目 标', 'Target')}</div>
          <div className="heatmap-stat-value">
            {targetHours.toFixed(1)}
            <span className="heatmap-stat-unit">h</span>
          </div>
          <div className="heatmap-stat-detail">
            {t('每日', 'Daily')}
          </div>
        </div>
      </div>



      {/* ── Tooltip ─────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y - 56,
          }}
        >
          <div className="heatmap-tooltip-date">
            {tooltip.cell.date.toLocaleDateString(
              LANGUAGE_LOCALE[language] ?? 'zh-CN',
              { month: 'long', day: 'numeric' },
            )}
            {' '}
            {getDayName(tooltip.cell.date, language)}
          </div>
          <div className="heatmap-tooltip-hours">
            {tooltip.cell.hours.toFixed(1)}h
            {' · '}
            {t('达成', 'Hit')} {Math.round(tooltip.cell.ratio * 100)}%
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scoped CSS ───────────────────────────────────────────────

export const HEATMAP_CSS = `
.year-heatmap-root {
  position: relative;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-1);
}

/* ── Grid scroll wrapper ──────────────────── */
.heatmap-grid-scroll {
  overflow-x: hidden;
  padding-bottom: 8px;
  margin-top: 28px;
}
.heatmap-grid {
  display: grid;
  gap: 4px;
  width: 100%;
}

/* ── Month labels ─────────────────────────── */
.heatmap-month-label {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 10px;
  color: var(--heatmap-ink-3);
  text-align: left;
  user-select: none;
  line-height: 20px;
}

/* ── Day labels ───────────────────────────── */
.heatmap-day-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--heatmap-ink-3);
  text-align: right;
  padding-right: 4px;
  line-height: 18px;
  user-select: none;
}

/* ── Cells ────────────────────────────────── */
.heatmap-cell {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 2px;
  transition: transform 120ms ease-out;
  cursor: default;
  position: relative;
  overflow: hidden;
}
.heatmap-cell-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-color: var(--c-active);
  pointer-events: none;
}
.heatmap-cell:hover {
  outline: 2px solid var(--heatmap-ink-1);
  outline-offset: -1px;
  z-index: 2;
  box-shadow: 0 0 0 1px var(--heatmap-ink-1), 0 2px 6px rgba(0,0,0,0.15);
}

.cell-today {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
  z-index: 1;
}
.cell-today:hover {
  outline: 2px solid var(--heatmap-ink-1);
  outline-offset: -1px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.cell-future {
  background: transparent !important;
  pointer-events: none;
}
.cell-future .heatmap-cell-fill {
  display: none;
}
.cell-future:hover {
  transform: none;
  box-shadow: none;
}

/* ── Legend ───────────────────────────────── */
.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--heatmap-ink-3);
}
.heatmap-legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  background-color: var(--heatmap-bg-cell-empty);
  position: relative;
}
.heatmap-legend-swatch::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-color: var(--c-active);
}

/* ── Legend text ──────────────────────────── */
.heatmap-legend-text {
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  margin-top: 8px;
}

/* ── Stats bar ────────────────────────────── */
.heatmap-stats-bar {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border-top: 1px solid var(--heatmap-rule);
  border-bottom: 1px solid var(--heatmap-rule);
  margin-top: 28px;
}
.heatmap-stats-compact {
  grid-template-columns: repeat(2, 1fr);
}
.heatmap-stat {
  padding: 16px 14px;
  border-right: 1px solid var(--heatmap-rule);
}
.heatmap-stat:last-child {
  border-right: none;
}
.heatmap-stats-compact .heatmap-stat:nth-child(even) {
  border-right: none;
}
.heatmap-stat-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  letter-spacing: 0.4em;
  margin-bottom: 8px;
}
.heatmap-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
  line-height: 1.1;
  margin-bottom: 6px;
}
.heatmap-stat-unit {
  font-size: 14px;
  color: var(--heatmap-ink-2);
  margin-left: 2px;
}
.heatmap-stat-detail {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
}

/* ── Streak pips ──────────────────────────── */
.heatmap-streak-pips {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.heatmap-streak-pip {
  display: inline-block;
  width: 4px;
  height: 16px;
  border-radius: 1px;
}
.heatmap-streak-extra {
  margin-left: 6px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-2);
}

/* ── Footer ───────────────────────────────── */
.heatmap-footer {
  text-align: center;
  margin-top: 56px;
}
.heatmap-footer-rule {
  color: var(--heatmap-ink-3);
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  letter-spacing: 0.5em;
  margin-bottom: 24px;
}
.heatmap-footer-quote {
  font-family: 'Noto Serif SC', serif;
  font-style: italic;
  font-size: 14px;
  color: var(--heatmap-ink-2);
  margin: 0;
}

/* ── Tooltip ──────────────────────────────── */
.heatmap-tooltip {
  position: absolute;
  z-index: 50;
  pointer-events: none;
  transform: translateX(-50%);
  background: var(--heatmap-ink-1);
  color: var(--heatmap-bg);
  padding: 8px 12px;
  border-radius: 4px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}
.heatmap-tooltip-date {
  font-weight: 500;
  margin-bottom: 2px;
}
.heatmap-tooltip-hours {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  opacity: 0.85;
}
`
