import { useMemo, useState, useCallback, useRef } from 'react'
import type { CalendarEvent } from '@/domain/event'
import type { Category, CategoryId } from '@/domain/category'
import { computeDayStats } from '@/domain/stats'

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

export function computeYearDailyGrid(
  events: readonly CalendarEvent[],
  categories: readonly Category[],
  year: number,
): DayCell[] {
  const yearStart = new Date(year, 0, 1).getTime()
  const yearEnd = new Date(year + 1, 0, 1).getTime()

  const filtered = events.filter(
    (e) => e.startTime < yearEnd && e.endTime > yearStart,
  )

  const budgetMap = new Map<CategoryId, number>()
  for (const c of categories) {
    budgetMap.set(c.id, c.weeklyBudget)
  }

  const days: DayCell[] = []
  let cursor = yearStart
  while (cursor < yearEnd) {
    const dayEnd = cursor + DAY_MS
    const dayStats = computeDayStats(filtered, categories, cursor, dayEnd)

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

export function buildHeatmapGrid(
  days: DayCell[],
  selectedId: CategoryId,
  year: number,
  now: number,
): { grid: HeatmapCell[][]; monthLabels: MonthLabel[]; numWeeks: number } {
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

    if (w === 0) {
      monthLabels.push({ nameZh: MONTH_NAMES_ZH[m], nameEn: MONTH_NAMES_EN[m], colIndex: w + 2 })
    } else {
      const prevThursday = new Date(firstMonday)
      prevThursday.setDate(firstMonday.getDate() + (w - 1) * 7 + 3)
      if (prevThursday.getMonth() !== m) {
        monthLabels.push({ nameZh: MONTH_NAMES_ZH[m], nameEn: MONTH_NAMES_EN[m], colIndex: w + 2 })
      }
    }
  }

  // Build grid: 7 rows × numWeeks columns
  const grid: HeatmapCell[][] = Array.from({ length: 7 }, () => [])

  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(firstMonday)
      dayDate.setDate(firstMonday.getDate() + w * 7 + d)
      const dayTs = dayDate.getTime()
      const jan1Ts = jan1.getTime()
      const dayIndex = Math.floor((dayTs - jan1Ts) / DAY_MS)

      if (dayIndex < 0 || dayIndex >= numDays) {
        // Outside the year — skip (grid cell left empty)
        continue
      }

      const cell: HeatmapCell = {
        date: dayDate,
        ratio: days[dayIndex].byRatio[selectedId],
        hours: days[dayIndex].byCategory[selectedId],
        isFuture: dayTs > now,
        isToday: dayTs >= now && dayTs < now + DAY_MS && dayDate.getFullYear() === new Date(now).getFullYear(),
      }
      grid[d].push(cell)
    }
  }

  return { grid, monthLabels, numWeeks }
}

export function getIntensityLevel(ratio: number): 0 | 1 | 2 | 3 | 4 {
  if (ratio <= 0) return 0
  if (ratio < 0.5) return 1
  if (ratio < 1.0) return 2
  if (ratio < 1.5) return 3
  return 4
}

export function computeDailyStreak(days: DayCell[], selectedId: CategoryId, now: number): number {
  const jan1 = new Date(new Date(now).getFullYear(), 0, 1).getTime()
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

export function computeStats(days: DayCell[], selectedId: CategoryId, now: number): StatsData {
  let cumulative = 0
  let activeDays = 0
  let bestHours = 0
  let bestDate: Date | null = null

  const jan1 = new Date(new Date(now).getFullYear(), 0, 1).getTime()

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
    streak: computeDailyStreak(days, selectedId, now),
    bestDay: bestDate ? { date: bestDate, hours: bestHours } : null,
  }
}

// ── Helpers ──────────────────────────────────────────────────

const DAY_NAMES_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDayName(date: Date, lang: 'zh' | 'en'): string {
  const dow = date.getDay()
  const idx = dow === 0 ? 6 : dow - 1
  return lang === 'zh' ? DAY_NAMES_ZH[idx] : DAY_NAMES_EN[idx]
}

// ── Component ────────────────────────────────────────────────

interface YearHeatmapProps {
  rangeEvents: readonly CalendarEvent[]
  categories: readonly Category[]
  language: 'zh' | 'en'
}

export function YearHeatmap({ rangeEvents, categories, language }: YearHeatmapProps) {
  const [selectedId, setSelectedId] = useState<CategoryId>('accent')
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const now = useMemo(() => Date.now(), [])
  const year = new Date(now).getFullYear()

  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const days = useMemo(
    () => computeYearDailyGrid(rangeEvents, categories, year),
    [rangeEvents, categories, year],
  )

  const { grid, monthLabels, numWeeks } = useMemo(
    () => buildHeatmapGrid(days, selectedId, year, now),
    [days, selectedId, year, now],
  )

  const stats = useMemo(
    () => computeStats(days, selectedId, now),
    [days, selectedId, now],
  )

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  const handleCategoryChange = useCallback((id: CategoryId) => {
    setSelectedId(id)
    document.documentElement.style.setProperty('--c-active', `var(--event-${id}-fill)`)
  }, [])

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
          {language === 'zh' ? ml.nameZh : ml.nameEn}
        </div>,
      )
    }

    // Day labels (col 1): only show 一/三/五 or Mon/Wed/Fri
    const dayLabelRows = [0, 2, 4] // Monday=0, Wednesday=2, Friday=4
    const dayLabelsZh = ['一', '三', '五']
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
            lineHeight: '13px',
          }}
        >
          {language === 'zh' ? dayLabelsZh[i] : dayLabelsEn[i]}
        </div>,
      )
    }

    // Data cells
    for (let dow = 0; dow < 7; dow++) {
      const row = grid[dow]
      for (let col = 0; col < row.length; col++) {
        const cell = row[col]
        const level = getIntensityLevel(cell.ratio)

        items.push(
          <div
            key={`c-${dow}-${col}`}
            className={`heatmap-cell l${level}${cell.isToday ? ' cell-today' : ''}${cell.isFuture ? ' cell-future' : ''}`}
            style={{ gridColumn: col + 2, gridRow: dow + 2 }}
            onPointerEnter={(e) => handlePointerEnter(cell, e)}
            onPointerLeave={handlePointerLeave}
          />,
        )
      }
    }

    return items
  }, [grid, monthLabels, language, handlePointerEnter, handlePointerLeave])

  // Best day info
  const bestDayStr = useMemo(() => {
    if (!stats.bestDay) return '-'
    const d = stats.bestDay.date
    const m = d.getMonth() + 1
    const day = d.getDate()
    const dayName = getDayName(d, language)
    return language === 'zh'
      ? `${m}月${day}日 ${dayName}`
      : `${dayName} ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }, [stats.bestDay, language])

  // Streak visualization pips
  const streakPips = Math.min(stats.streak, 5)
  const streakExtra = stats.streak > 5 ? stats.streak - 5 : 0

  return (
    <div ref={containerRef} className="year-heatmap-root">
      <style>{HEATMAP_CSS}</style>

      {/* ── Title area ─────────────────────────────────────── */}
      <div className={`heatmap-title-area${isCompact ? ' heatmap-title-compact' : ''}`}>
        <div className="heatmap-title-left">
          <div className="heatmap-year-row">
            <span
              className="heatmap-year-num"
              style={{ color: 'var(--c-active)' }}
            >
              {year}
            </span>
            <span className="heatmap-year-label">
              {t('· 年度热力图', ' · Annual Heatmap')}
            </span>
          </div>
          <div className="heatmap-subtitle">
            {(() => {
              const cat = catMap.get(selectedId)
              const target = cat ? (cat.weeklyBudget / 7) : 0
              return t(
                `每日目标 ${target.toFixed(1)}h · 由浅至深：0 → 超额完成`,
                `Daily target ${target.toFixed(1)}h · Light to dark: 0 → Over target`,
              )
            })()}
          </div>
        </div>

        {/* Category pills */}
        <div className="heatmap-pills">
          {CATEGORY_IDS.map((id) => {
            const cat = catMap.get(id)
            const active = selectedId === id
            return (
              <button
                key={id}
                onClick={() => handleCategoryChange(id)}
                className={`heatmap-pill${active ? ' heatmap-pill-active' : ''}`}
                style={
                  active
                    ? {
                        backgroundColor: `var(--event-${id}-fill)`,
                        color: '#F1EADB',
                      }
                    : undefined
                }
              >
                {cat?.name?.[language] ?? id}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Decorative separator ───────────────────────────── */}
      <div className="heatmap-sep" style={{ marginTop: 56, marginBottom: 40 }}>
        · · ·
      </div>

      {/* ── Heatmap grid ───────────────────────────────────── */}
      <div className="heatmap-grid-scroll">
        <div
          className="heatmap-grid"
          style={{
            gridTemplateColumns: `28px repeat(${numWeeks}, 13px)`,
            gridTemplateRows: `18px repeat(7, 13px)`,
          }}
        >
          {gridItems}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────── */}
      <div className="heatmap-legend">
        <span>{t('更少', 'Less')}</span>
        <div className="l0 heatmap-legend-swatch" />
        <div className="l1 heatmap-legend-swatch" />
        <div className="l2 heatmap-legend-swatch" />
        <div className="l3 heatmap-legend-swatch" />
        <div className="l4 heatmap-legend-swatch" />
        <span>{t('更多', 'More')}</span>
      </div>

      {/* ── Decorative separator ───────────────────────────── */}
      <div className="heatmap-sep" style={{ marginTop: 40, marginBottom: 56 }}>
        · · ·
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
              const cat = catMap.get(selectedId)
              const target = cat ? cat.weeklyBudget / 7 : 0
              const pct = target > 0 ? Math.round((stats.dailyAvg / target) * 100) : 0
              return t(`目标 ${target.toFixed(1)}h · 达成 ${pct}%`, `Target ${target.toFixed(1)}h · ${pct}% achieved`)
            })()}
          </div>
        </div>

        {/* Streak */}
        <div className="heatmap-stat">
          <div className="heatmap-stat-label">{t('连 续', 'Streak')}</div>
          <div className="heatmap-stat-value">
            {stats.streak}
            <span className="heatmap-stat-unit">{t('天', 'd')}</span>
          </div>
          <div className="heatmap-stat-detail">
            {stats.streak === 0 ? (
              t('已中断', 'Broken')
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
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="heatmap-footer">
        <div className="heatmap-footer-rule">
          <span>——</span>
        </div>
        <p className="heatmap-footer-quote">
          {t(
            '时间是衡量一切的尺度，亦是看见自己的镜子。',
            'Time is the measure of all things, and the mirror in which we see ourselves.',
          )}
        </p>
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
              language === 'zh' ? 'zh-CN' : 'en-US',
              { month: 'long', day: 'numeric' },
            )}
            {' '}
            {language === 'zh' ? tooltip.dayNameZh : tooltip.dayNameEn}
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

const HEATMAP_CSS = `
.year-heatmap-root {
  --bg: #F1EADB;
  --bg-card: #E8DFCC;
  --bg-cell-empty: #E0D5BD;
  --ink-1: #2E2823;
  --ink-2: #6F6453;
  --ink-3: #A89B83;
  --rule: rgba(46,40,35,0.10);

  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--ink-1);
}

/* ── Title area ──────────────────────────── */
.heatmap-title-area {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.heatmap-title-compact {
  flex-direction: column;
}
.heatmap-title-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.heatmap-year-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.heatmap-year-num {
  font-family: 'Noto Serif SC', serif;
  font-size: 84px;
  font-weight: 600;
  line-height: 1;
  transition: color 0.4s ease;
  letter-spacing: -0.02em;
}
.heatmap-year-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 18px;
  color: var(--ink-1);
  white-space: nowrap;
}
.heatmap-subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-2);
  margin-top: 4px;
}

/* ── Category pills ───────────────────────── */
.heatmap-pills {
  display: flex;
  gap: 6px;
  background: var(--bg-card);
  border-radius: 999px;
  padding: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.heatmap-pill {
  padding: 6px 16px;
  border-radius: 999px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.25s ease, color 0.25s ease;
  white-space: nowrap;
}
.heatmap-pill:hover {
  color: var(--ink-1);
}
.heatmap-pill-active {
  font-weight: 600;
}

/* ── Separator ────────────────────────────── */
.heatmap-sep {
  text-align: center;
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  color: var(--ink-3);
  letter-spacing: 1.5em;
  user-select: none;
}

/* ── Grid scroll wrapper ──────────────────── */
.heatmap-grid-scroll {
  overflow-x: auto;
  padding-bottom: 8px;
}
.heatmap-grid {
  display: grid;
  gap: 3px;
  min-width: fit-content;
}

/* ── Month labels ─────────────────────────── */
.heatmap-month-label {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 10px;
  color: var(--ink-3);
  text-align: left;
  user-select: none;
}

/* ── Day labels ───────────────────────────── */
.heatmap-day-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-3);
  text-align: right;
  padding-right: 4px;
  user-select: none;
}

/* ── Cells ────────────────────────────────── */
.heatmap-cell {
  width: 13px;
  height: 13px;
  border-radius: 2px;
  transition: transform 120ms ease-out;
  cursor: default;
}
.heatmap-cell:hover {
  transform: scale(1.6);
  z-index: 2;
  position: relative;
  box-shadow: 0 0 0 1px #000, 0 2px 6px rgba(0,0,0,0.15);
}

/* Intensity levels — same class names for legend reuse */
.l0 { background-color: var(--bg-cell-empty); }
.l1 { background-color: color-mix(in oklab, var(--c-active) 22%, var(--bg-cell-empty)); }
.l2 { background-color: color-mix(in oklab, var(--c-active) 48%, var(--bg-cell-empty)); }
.l3 { background-color: color-mix(in oklab, var(--c-active) 75%, var(--bg-cell-empty)); }
.l4 { background-color: var(--c-active); }

.cell-today {
  box-shadow: 0 0 0 1.5px #000;
  z-index: 1;
  position: relative;
}
.cell-today:hover {
  box-shadow: 0 0 0 1.5px #000, 0 2px 6px rgba(0,0,0,0.15);
}

.cell-future {
  background: transparent !important;
  pointer-events: none;
}
.cell-future:hover {
  transform: none;
  box-shadow: none;
}

/* ── Legend ───────────────────────────────── */
.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--ink-3);
}
.heatmap-legend-swatch {
  width: 13px;
  height: 13px;
  border-radius: 2px;
}

/* ── Stats bar ────────────────────────────── */
.heatmap-stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}
.heatmap-stats-compact {
  grid-template-columns: repeat(2, 1fr);
}
.heatmap-stat {
  padding: 24px 20px;
  border-right: 1px solid var(--rule);
}
.heatmap-stat:last-child {
  border-right: none;
}
.heatmap-stats-compact .heatmap-stat:nth-child(2) {
  border-right: none;
}
.heatmap-stat-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.4em;
  margin-bottom: 8px;
}
.heatmap-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  font-weight: 400;
  color: var(--ink-1);
  line-height: 1;
  margin-bottom: 6px;
}
.heatmap-stat-unit {
  font-size: 16px;
  color: var(--ink-2);
  margin-left: 2px;
}
.heatmap-stat-detail {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 11px;
  color: var(--ink-3);
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
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 11px;
  color: var(--ink-2);
}

/* ── Footer ───────────────────────────────── */
.heatmap-footer {
  text-align: center;
  margin-top: 56px;
}
.heatmap-footer-rule {
  color: var(--ink-3);
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  letter-spacing: 0.5em;
  margin-bottom: 24px;
}
.heatmap-footer-quote {
  font-family: 'Noto Serif SC', serif;
  font-style: italic;
  font-size: 14px;
  color: var(--ink-2);
  margin: 0;
}

/* ── Tooltip ──────────────────────────────── */
.heatmap-tooltip {
  position: absolute;
  z-index: 50;
  pointer-events: none;
  transform: translateX(-50%);
  background: var(--ink-1);
  color: var(--bg);
  padding: 8px 12px;
  border-radius: 4px;
  font-family: 'Noto Sans SC', sans-serif;
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

/* ── Responsive ───────────────────────────── */
@media (max-width: 719px) {
  .heatmap-year-num {
    font-size: 56px;
  }
  .heatmap-year-label {
    font-size: 15px;
  }
  .heatmap-pills {
    width: 100%;
  }
}
`
