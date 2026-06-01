/**
 * # DietScatterChart — 饮食散点图
 *
 * 将每餐时间以散点形式展示在时间轴上，按月/季/年切换。
 * 参考 SleepScatterChart 架构，按餐次着色。
 */

import { useMemo, useState, startTransition } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { CalendarEvent, MealOrder } from '@/domain/event'
import { MEAL_ORDER_LABELS } from '@/domain/event'
import { computeMealTimeStats } from '@/domain/dietStats'
import { dateRange } from '@/domain/dateRange'

// ── 类型 ────────────────────────────────────────────────────

type ViewMode = 'month' | 'quarter' | 'year'

interface MealPoint {
  day: number
  dayOfYear: number
  time: number   // hour of day (0-24)
  mealOrder: MealOrder
  title: string
  foodTags: string
  startTime: number
}

// ── 餐次颜色 ────────────────────────────────────────────────

const MEAL_ORDER_COLORS: Record<MealOrder, string> = {
  breakfast: 'var(--event-accent-fill)',
  lunch: 'var(--event-sage-fill)',
  dinner: 'var(--event-sky-fill)',
  night_snack: 'var(--event-rose-fill)',
}

// ── 辅助 ────────────────────────────────────────────────────

function fmtHour(h: number): string {
  const hr = Math.floor(h)
  const mi = Math.round((h - hr) * 60)
  return `${String(hr).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

function hourDecimal(ts: number): number {
  const d = new Date(ts)
  return d.getHours() + d.getMinutes() / 60
}

function dayOfYear(ts: number, year: number): number {
  const startOfYear = new Date(year, 0, 1).getTime()
  return Math.floor((ts - startOfYear) / 86_400_000) + 1
}

function viewLabel(vm: ViewMode, anchor: Date): string {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  switch (vm) {
    case 'month':   return `${y} 年 ${m + 1} 月`
    case 'quarter': return `${y} 年 Q${Math.floor(m / 3) + 1}`
    case 'year':    return `${y} 年`
  }
}

// ── 组件 ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
}

export function DietScatterChart({ rangeEvents }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const cutoff = Date.now() - 3 * 365 * 86_400_000

  /* ── Step 1: 过滤 Meal 事件 ───────────────────── */
  const mealEvents = useMemo(() => {
    return rangeEvents.filter(
      (e) =>
        e.typedData?.type === 'meal' &&
        e.startTime > cutoff,
    )
  }, [rangeEvents, cutoff])

  /* ── Step 2: 视图窗口 ───────────────────────── */
  const viewWindow = useMemo(() => {
    const y = anchorDate.getFullYear()
    const m = anchorDate.getMonth()

    switch (viewMode) {
      case 'month': {
        const start = new Date(y, m, 1)
        const end = new Date(y, m + 1, 1)
        return { start, end, days: (end.getTime() - start.getTime()) / 86_400_000 }
      }
      case 'quarter': {
        const qStart = Math.floor(m / 3) * 3
        const start = new Date(y, qStart, 1)
        const end = new Date(y, qStart + 3, 1)
        return { start, end, days: (end.getTime() - start.getTime()) / 86_400_000 }
      }
      case 'year': {
        const start = new Date(y, 0, 1)
        const end = new Date(y + 1, 0, 1)
        return { start, end, days: (end.getTime() - start.getTime()) / 86_400_000 }
      }
    }
  }, [viewMode, anchorDate])

  /* ── Step 3: 生成散点 ───────────────────────── */
  const points = useMemo(() => {
    const result: MealPoint[] = []
    const startTs = viewWindow.start.getTime()
    const endTs = viewWindow.end.getTime()
    const year = anchorDate.getFullYear()

    for (const e of mealEvents) {
      if (e.startTime < startTs || e.startTime >= endTs) continue
      const data = e.typedData
      if (!data || data.type !== 'meal') continue

      let day: number
      if (viewMode === 'month') {
        day = new Date(e.startTime).getDate()
      } else if (viewMode === 'year') {
        day = dayOfYear(e.startTime, year)
      } else {
        day = Math.floor((e.startTime - startTs) / 86_400_000) + 1
      }

      result.push({
        day,
        dayOfYear: dayOfYear(e.startTime, year),
        time: hourDecimal(e.startTime),
        mealOrder: data.mealOrder,
        title: e.title || '吃饭',
        foodTags: data.foodTags.join('、'),
        startTime: e.startTime,
      })
    }
    return result
  }, [mealEvents, viewWindow, viewMode, anchorDate])

  /* ── Step 4: 按餐次分组（Recharts Scatter 需要分离 series）─ */
  const breakfastPoints = useMemo(() => points.filter((p) => p.mealOrder === 'breakfast'), [points])
  const lunchPoints = useMemo(() => points.filter((p) => p.mealOrder === 'lunch'), [points])
  const dinnerPoints = useMemo(() => points.filter((p) => p.mealOrder === 'dinner'), [points])
  const nightSnackPoints = useMemo(() => points.filter((p) => p.mealOrder === 'night_snack'), [points])

  /* ── Step 5: X 轴刻度 ───────────────────────── */
  const xTicks = useMemo(() => {
    if (viewMode === 'month') {
      const d = viewWindow.days
      const nums = [1, 5, 10, 15, 20, 25].filter((v) => v <= d)
      if (d > 25) nums.push(d)
      return nums.map((v) => ({ value: v, label: String(v) }))
    }

    const ticks: { value: number; label: string }[] = []
    const months = viewMode === 'quarter' ? 3 : 12
    const startTs = viewWindow.start.getTime()
    for (let m = 0; m <= months; m++) {
      const ms = new Date(anchorDate.getFullYear(),
        (viewMode === 'quarter' ? Math.floor(anchorDate.getMonth() / 3) * 3 : 0) + m, 1)
      const offset = Math.floor((ms.getTime() - startTs) / 86_400_000) + 1
      if (offset >= 1 && offset <= viewWindow.days) {
        ticks.push({ value: offset, label: m < months ? `${ms.getMonth() + 1}月` : '' })
      }
    }
    return ticks
  }, [viewMode, viewWindow, anchorDate])

  /* ── Step 6: 统计 ──────────────────────────── */
  const range = useMemo(
    () => dateRange(viewWindow.start.getTime(), viewWindow.end.getTime()),
    [viewWindow],
  )
  const timeStats = useMemo(
    () => computeMealTimeStats(rangeEvents, range),
    [rangeEvents, range],
  )

  /* ── 导航 ──────────────────────────────────── */
  const goPrev = () => {
    startTransition(() => {
      setAnchorDate((d) => {
        const y = d.getFullYear()
        const m = d.getMonth()
        switch (viewMode) {
          case 'month':   return new Date(y, m - 1, 1)
          case 'quarter': return new Date(y, m - 3, 1)
          case 'year':    return new Date(y - 1, 0, 1)
        }
      })
    })
  }

  const goNext = () => {
    startTransition(() => {
      setAnchorDate((d) => {
        const y = d.getFullYear()
        const m = d.getMonth()
        switch (viewMode) {
          case 'month':   return new Date(y, m + 1, 1)
          case 'quarter': return new Date(y, m + 3, 1)
          case 'year':    return new Date(y + 1, 0, 1)
        }
      })
    })
  }

  const changeViewMode = (vm: ViewMode) => {
    if (vm === viewMode) return
    startTransition(() => {
      setViewMode(vm)
      const now = new Date()
      setAnchorDate(new Date(now.getFullYear(), now.getMonth(), 1))
    })
  }

  const label = viewLabel(viewMode, anchorDate)

  return (
    <div className="dsc-root">
      <style>{DSC_CSS}</style>

      {/* ── Title area ─────────────────────────── */}
      <div className="dsc-title-area">
        <div className="dsc-title-left">
          <div className="dsc-title-row">
            <button onClick={goPrev} className="dsc-title-arrow" title="上一周期">‹</button>
            <span className="dsc-title-main">{label}</span>
            <button onClick={goNext} className="dsc-title-arrow" title="下一周期">›</button>

            <div className="dsc-title-periods">
              {(['month', 'quarter', 'year'] as ViewMode[]).map((vm) => (
                <button
                  key={vm}
                  onClick={() => changeViewMode(vm)}
                  className={`dsc-title-period${viewMode === vm ? ' dsc-title-period-active' : ''}`}
                >
                  {vm === 'month' ? '月' : vm === 'quarter' ? '季' : '年'}
                </button>
              ))}
            </div>
          </div>
          <p className="dsc-title-desc">每餐时间分布</p>
        </div>
      </div>

      {/* ── Empty state ────────────────────────── */}
      {points.length === 0 ? (
        <p className="dsc-empty">暂无饮食数据</p>
      ) : (
        <>
          {/* ── Chart ───────────────────────────── */}
          <div className="dsc-chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[1, viewWindow.days]}
                  tickFormatter={(v: number) => {
                    const tick = xTicks.find((t) => t.value === v)
                    return tick ? tick.label : ''
                  }}
                  ticks={xTicks.map((t) => t.value)}
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  interval={0}
                />

                <YAxis
                  domain={[0, 24]}
                  reversed={true}
                  tickFormatter={(v: number) => fmtHour(v)}
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const pt = payload[0]?.payload as MealPoint | undefined
                    if (!pt) return null
                    return (
                      <div className="dsc-tooltip">
                        <div className="dsc-tooltip-date">第 {pt.day} 日</div>
                        <div className="dsc-tooltip-row">
                          <span
                            className="dsc-tooltip-dot"
                            style={{ background: MEAL_ORDER_COLORS[pt.mealOrder] }}
                          />
                          <span>{MEAL_ORDER_LABELS[pt.mealOrder]}</span>
                          <span className="dsc-tooltip-val">{fmtHour(pt.time)}</span>
                        </div>
                        <div className="dsc-tooltip-row">
                          <span className="dsc-tooltip-title">{pt.title}</span>
                        </div>
                        {pt.foodTags && (
                          <div className="dsc-tooltip-tags">{pt.foodTags}</div>
                        )}
                      </div>
                    )
                  }}
                />

                {/* 早餐 */}
                <Scatter
                  data={breakfastPoints}
                  fill={MEAL_ORDER_COLORS.breakfast}
                  name="breakfast"
                  shape="circle"
                  legendType="circle"
                />
                {/* 午餐 */}
                <Scatter
                  data={lunchPoints}
                  fill={MEAL_ORDER_COLORS.lunch}
                  name="lunch"
                  shape="circle"
                  legendType="circle"
                />
                {/* 晚餐 */}
                <Scatter
                  data={dinnerPoints}
                  fill={MEAL_ORDER_COLORS.dinner}
                  name="dinner"
                  shape="circle"
                  legendType="circle"
                />
                {/* 宵夜 */}
                <Scatter
                  data={nightSnackPoints}
                  fill={MEAL_ORDER_COLORS.night_snack}
                  name="night_snack"
                  shape="circle"
                  legendType="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* ── Legend ──────────────────────────── */}
          <div className="dsc-legend">
            {(['breakfast', 'lunch', 'dinner', 'night_snack'] as MealOrder[]).map((mo) => (
              <span key={mo} className="dsc-legend-item">
                <span
                  className="dsc-legend-dot"
                  style={{ background: MEAL_ORDER_COLORS[mo] }}
                />
                {MEAL_ORDER_LABELS[mo]}
              </span>
            ))}
          </div>

          {/* ── Stats bar ──────────────────────── */}
          <div className="dsc-stats-bar">
            <div className="dsc-stat">
              <div className="dsc-stat-label">早 餐</div>
              <div className="dsc-stat-value">
                {timeStats.avgBreakfastTime != null ? fmtHour(timeStats.avgBreakfastTime) : '—'}
              </div>
              <div className="dsc-stat-detail">平均时间</div>
            </div>
            <div className="dsc-stat">
              <div className="dsc-stat-label">午 餐</div>
              <div className="dsc-stat-value">
                {timeStats.avgLunchTime != null ? fmtHour(timeStats.avgLunchTime) : '—'}
              </div>
              <div className="dsc-stat-detail">平均时间</div>
            </div>
            <div className="dsc-stat">
              <div className="dsc-stat-label">晚 餐</div>
              <div className="dsc-stat-value">
                {timeStats.avgDinnerTime != null ? fmtHour(timeStats.avgDinnerTime) : '—'}
              </div>
              <div className="dsc-stat-detail">平均时间</div>
            </div>
            <div className="dsc-stat">
              <div className="dsc-stat-label">总 数</div>
              <div className="dsc-stat-value">
                {points.length}<span className="dsc-stat-unit">餐</span>
              </div>
              <div className="dsc-stat-detail">{label}</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Scoped CSS (mirrors SleepScatterChart style) ────────────

const DSC_CSS = `
.dsc-root {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
  padding-top: 8px;
}

/* ── Title area ──────────────────────────── */
.dsc-title-area {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.dsc-title-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dsc-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsc-title-main {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
  letter-spacing: 0.02em;
  min-width: 120px;
  text-align: center;
}
.dsc-title-arrow {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: var(--heatmap-ink-3);
  transition: color 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
}
.dsc-title-arrow:hover {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg-card);
}
.dsc-title-periods {
  display: flex;
  gap: 2px;
  margin-left: 6px;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  padding: 2px;
}
.dsc-title-period {
  padding: 2px 8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--heatmap-ink-3);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.dsc-title-period:hover { color: var(--heatmap-ink-1); }
.dsc-title-period-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}
.dsc-title-desc {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--heatmap-ink-3);
  margin: 0;
}

/* ── Chart container ─────────────────────── */
.dsc-chart-container { margin-top: 28px; position: relative; }

/* ── Legend ──────────────────────────────── */
.dsc-legend {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--heatmap-ink-3);
}
.dsc-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dsc-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Stats bar ───────────────────────────── */
.dsc-stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--heatmap-rule);
  border-bottom: 1px solid var(--heatmap-rule);
  margin-top: 28px;
}
.dsc-stat {
  padding: 24px 20px;
  border-right: 1px solid var(--heatmap-rule);
}
.dsc-stat:last-child { border-right: none; }
.dsc-stat-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  letter-spacing: 0.4em;
  margin-bottom: 8px;
}
.dsc-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
  line-height: 1.1;
  margin-bottom: 6px;
}
.dsc-stat-unit { font-size: 14px; color: var(--heatmap-ink-2); margin-left: 2px; }
.dsc-stat-detail {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
}

/* ── Tooltip ─────────────────────────────── */
.dsc-tooltip {
  background: var(--heatmap-ink-1);
  color: var(--heatmap-bg);
  padding: 10px 14px;
  border-radius: 6px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}
.dsc-tooltip-date {
  font-weight: 500;
  margin-bottom: 4px;
  font-size: 11px;
  opacity: 0.85;
}
.dsc-tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 1px;
}
.dsc-tooltip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dsc-tooltip-val {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  margin-left: auto;
}
.dsc-tooltip-title { opacity: 0.75; }
.dsc-tooltip-tags {
  font-size: 10px;
  opacity: 0.55;
  margin-top: 2px;
}

/* ── Empty ───────────────────────────────── */
.dsc-empty {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  color: var(--heatmap-ink-3);
  font-style: italic;
  margin-top: 40px;
}

/* ── Responsive ──────────────────────────── */
@media (max-width: 719px) {
  .dsc-title-main { font-size: 22px; min-width: 100px; }
  .dsc-stats-bar { grid-template-columns: repeat(2, 1fr); }
  .dsc-stat-value { font-size: 22px; }
  .dsc-stat { padding: 18px 14px; }
}
`