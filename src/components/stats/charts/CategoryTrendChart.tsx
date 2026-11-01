import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { RechartsTooltip } from './RechartsTooltip'
import type { Category, CategoryId } from '@/domain/category'
import type { DataMaturity } from '@/domain/maturity'
import type { Granularity, Bucket } from '@/hooks/useStatsAggregation'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']
const DAY_MS = 24 * 60 * 60_000

// ── Helpers ──────────────────────────────────────────────────

function formatBucketLabel(bucket: Bucket, periodType: Granularity): string {
  const d = bucket.start
  if (periodType === 'day') return format(d, 'MM.dd')
  if (periodType === 'week') return format(d, 'MM.dd')
  return format(d, 'yyyy-MM')
}

function periodDays(periodType: Granularity): number {
  switch (periodType) {
    case 'day':   return 1
    case 'week':  return 7
    case 'month': return 30.44
  }
}

// ── Component ────────────────────────────────────────────────

interface CategoryTrendChartProps {
  history: Bucket[]
  categories: Category[]
  periodType: Granularity
  maturity: DataMaturity
  /** 外部受控的选中分类（来自 StatsPage → StatsRail） */
  selected: CategoryId[]
}

export function CategoryTrendChart({
  history,
  categories,
  periodType,
  maturity,
  selected,
}: CategoryTrendChartProps) {
  // Which line the cursor is over — emphasised in the chart and the sidebar row.
  const [activeId, setActiveId] = useState<CategoryId | null>(null)

  const catMap = useMemo(() => {
    const map = new Map<CategoryId, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  /* ── Chart data ──────────────────────────── */

  const chartData = useMemo(() => {
    return history.map((b, i) => {
      const label = formatBucketLabel(b, periodType)
      const row: Record<string, string | number | boolean> = { label, isCurrent: i === history.length - 1 }
      const prev = i > 0 ? history[i - 1] : null
      for (const id of CATEGORY_IDS) {
        const v = b.byCategory[id] ?? 0
        row[id] = v
        // `__d_<id>` = change vs the previous bucket; the tooltip reads it for 环比.
        if (prev) row[`__d_${id}`] = v - (prev.byCategory[id] ?? 0)
      }
      return row
    })
  }, [history, periodType])

  const dynamicMax = useMemo(() => {
    if (chartData.length === 0) return 80
    let maxVal = 0
    for (const row of chartData) {
      for (const id of selected) {
        const v = row[id] as number
        if (v > maxVal) maxVal = v
      }
    }
    if (maxVal === 0) return 80
    const scaled = maxVal * 1.15
    return Math.ceil(scaled / 10) * 10
  }, [chartData, selected])


  const budgetLine = useMemo(() => {
    if (categories.length === 0) return 0
    let total = 0
    let count = 0
    for (const id of selected) {
      const cat = catMap.get(id)
      if (cat && cat.weeklyBudget > 0) {
        const days = periodDays(periodType)
        total += cat.weeklyBudget * (days / 7)
        count++
      }
    }
    return count > 0 ? total / count : 0
  }, [categories, selected, periodType, catMap])

  /* ── Stats ───────────────────────────────── */

  const stats = useMemo(() => {
    if (history.length === 0) return null
    const current = history[history.length - 1]
    const prev = history.length >= 2 ? history[history.length - 2] : null

    const selectedTotal = selected.reduce((sum, id) => sum + (current.byCategory[id] || 0), 0)

    // 1a: elapsed days (cap at now for in-progress period)
    const elapsedMs = Math.min(Date.now(), current.end.getTime()) - current.start.getTime()
    const curDays = Math.max(elapsedMs / DAY_MS, 1)
    const dailyAvg = selectedTotal / curDays

    let peakId: CategoryId = selected[0] || 'accent'
    let peakHours = 0
    for (const id of selected) {
      const h = current.byCategory[id] || 0
      if (h > peakHours) { peakHours = h; peakId = id }
    }

    // 1b: WoW as daily-average delta
    let wowPct: number | null = null
    let wowAbs: number | null = null
    if (prev) {
      const prevTotal = selected.reduce((sum, id) => sum + (prev.byCategory[id] || 0), 0)
      const prevDays = (prev.end.getTime() - prev.start.getTime()) / DAY_MS
      const prevDaily = prevDays > 0 ? prevTotal / prevDays : 0
      wowPct = prevDaily > 0 ? ((dailyAvg - prevDaily) / prevDaily) * 100 : null
      wowAbs = dailyAvg - prevDaily
    }

    return { selectedTotal, dailyAvg, peakId, peakHours, wowPct, wowAbs, hasPrev: prev !== null }
  }, [history, selected])


  /* ── D 布局派生数据 ──────────────────────────
   * 排行、周期差、预算达成。全部放在 maturity 提前 return 之前，
   * 保证 hook 调用顺序不受数据成熟度影响。
   */

  const ranking = useMemo(() => {
    const lastRow = chartData.length > 0 ? chartData[chartData.length - 1] : null
    const prevRow = chartData.length >= 2 ? chartData[chartData.length - 2] : null
    const rows = selected.map((id) => {
      const value = lastRow ? ((lastRow[id] as number) || 0) : 0
      const prevValue = prevRow ? ((prevRow[id] as number) || 0) : 0
      return {
        id,
        name: catMap.get(id)?.name ?? id,
        value,
        delta: prevRow ? value - prevValue : null,
        budget: catMap.get(id)?.weeklyBudget ?? 0,
      }
    })
    rows.sort((a, b) => b.value - a.value)
    const max = rows.reduce((m, r) => Math.max(m, r.value), 0)
    const total = rows.reduce((s, r) => s + r.value, 0)
    return { rows, max, total }
  }, [chartData, selected, catMap])

  const periodDelta = useMemo(() => {
    if (chartData.length < 2) return null
    const lastRow = chartData[chartData.length - 1]
    const prevRow = chartData[chartData.length - 2]
    let cur = 0
    let prev = 0
    for (const id of selected) {
      cur += (lastRow[id] as number) || 0
      prev += (prevRow[id] as number) || 0
    }
    return { cur, prev, pct: prev > 0 ? ((cur - prev) / prev) * 100 : null }
  }, [chartData, selected])

  const budgetReach = useMemo(() => {
    if (!stats) return null
    const perWeek = selected.reduce((s, id) => s + (catMap.get(id)?.weeklyBudget ?? 0), 0)
    const target = perWeek * (periodDays(periodType) / 7)
    return target > 0 ? Math.round((stats.selectedTotal / target) * 100) : null
  }, [stats, selected, catMap, periodType])

  /* ── Maturity gate ───────────────────────── */

  if (maturity.maturityLevel === 'cold') {
    return (
      <div className="trend-root" style={{ paddingTop: 40 }}>
        <style>{TREND_CSS}</style>
        <div className="flex items-center justify-center min-h-[240px] text-sm font-sans" style={{ color: 'var(--heatmap-ink-3)' }}>
          {'记录天数不足，趋势图需要至少 3 天数据'}
        </div>
      </div>
    )
  }

  /* ── Render ──────────────────────────────── */

  return (
    <div className="trend-root">
      <style>{TREND_CSS}</style>

      {stats && (
        <div className="trend-kpi">
          <div className="trend-kpi-card">
            <div className="trend-kpi-label">本周合计</div>
            <div className="trend-kpi-row">
              <span className="trend-kpi-num">{stats.selectedTotal.toFixed(1)}</span>
              <span className="trend-kpi-unit">h</span>
              {periodDelta && periodDelta.pct !== null && (
                <span className={`trend-badge ${periodDelta.pct >= 0 ? 'is-up' : 'is-down'}`}>
                  {periodDelta.pct >= 0 ? '↑' : '↓'}{Math.abs(periodDelta.pct).toFixed(0)}%
                </span>
              )}
            </div>
            <div className="trend-kpi-note">
              {periodDelta ? `上周 ${periodDelta.prev.toFixed(1)}h` : '需要更多数据'}
            </div>
          </div>

          <div className="trend-kpi-card">
            <div className="trend-kpi-label">日 均</div>
            <div className="trend-kpi-row">
              <span className="trend-kpi-num">{stats.dailyAvg.toFixed(1)}</span>
              <span className="trend-kpi-unit">h/d</span>
              {stats.wowPct !== null && (
                <span className={`trend-badge ${stats.wowPct >= 0 ? 'is-up' : 'is-down'}`}>
                  {stats.wowPct >= 0 ? '↑' : '↓'}{Math.abs(stats.wowPct).toFixed(0)}%
                </span>
              )}
            </div>
            <div className="trend-kpi-note">
              {stats.wowAbs !== null ? `较上期 ${stats.wowAbs >= 0 ? '+' : ''}${stats.wowAbs.toFixed(1)}h/d` : '需要更多数据'}
            </div>
          </div>

          <div className="trend-kpi-card">
            <div className="trend-kpi-label">最高分类</div>
            <div className="trend-kpi-row">
              <span className="trend-kpi-num">{stats.peakHours.toFixed(1)}</span>
              <span className="trend-kpi-unit">h</span>
              <span className="trend-badge is-flat" style={{ color: `var(--event-${stats.peakId}-fill)` }}>
                {catMap.get(stats.peakId)?.name ?? stats.peakId}
              </span>
            </div>
            <div className="trend-kpi-note">当前周期投入最多</div>
          </div>

          <div className="trend-kpi-card">
            <div className="trend-kpi-label">预算达成</div>
            <div className="trend-kpi-row">
              <span className="trend-kpi-num">{budgetReach === null ? '—' : budgetReach}</span>
              <span className="trend-kpi-unit">%</span>
              <span className={`trend-badge ${budgetReach !== null && budgetReach >= 100 ? 'is-up' : 'is-flat'}`}>
                {budgetReach !== null && budgetReach >= 100 ? '达标' : '未达'}
              </span>
            </div>
            <div className="trend-kpi-note">按选中分类周预算折算</div>
          </div>
        </div>
      )}

      <div className="trend-main">
        <aside className="trend-side">
          <div className="trend-side-title">分类排行</div>
          <div className="trend-side-note">当前周期投入降序 · 悬停高亮走势</div>
          {ranking.rows.map((r) => (
            <div
              key={r.id}
              className={`trend-side-row${activeId === r.id ? ' is-active' : ''}`}
              onMouseEnter={() => setActiveId(r.id)}
              onMouseLeave={() => setActiveId(null)}
            >
              <div className="trend-side-top">
                <span className="trend-side-name" style={{ color: `var(--event-${r.id}-fill)` }}>{r.name}</span>
                <span className="trend-side-val">
                  {r.value.toFixed(1)}h · {ranking.total > 0 ? Math.round((r.value / ranking.total) * 100) : 0}%
                </span>
              </div>
              <div className="trend-side-bar">
                <i style={{ width: `${ranking.max > 0 ? (r.value / ranking.max) * 100 : 0}%`, background: `var(--event-${r.id}-fill)` }} />
              </div>
              <div className="trend-side-foot">
                <span>预算 {r.budget}h/w</span>
                {r.delta !== null && (
                  <span className={r.delta >= 0 ? 'is-up' : 'is-down'}>
                    {r.delta >= 0 ? '+' : ''}{r.delta.toFixed(1)}h
                  </span>
                )}
              </div>
            </div>
          ))}
        </aside>

        <div className="trend-plot">
          <div className="trend-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 40, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--line)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v.toFixed(0)}h`}
                  width={42}
                  domain={[0, dynamicMax]}
                />
                <Tooltip content={<RechartsTooltip decimals={1} sortByValue showTotal showShare showDelta activeDataKey={activeId} />} />

                {chartData.length > 1 && (
                  <ReferenceArea
                    x1={chartData[chartData.length - 2].label as string}
                    x2={chartData[chartData.length - 1].label as string}
                    fill="var(--line)"
                    fillOpacity={0.22}
                  />
                )}

                {selected.length === 1 && (
                  <Area
                    type="monotone"
                    dataKey={selected[0]}
                    fill={`var(--event-${selected[0]}-fill)`}
                    fillOpacity={0.08}
                    stroke="none"
                    name={catMap.get(selected[0])?.name ?? selected[0]}
                    dot={false}
                    connectNulls={false}
                    tooltipType="none"
                  />
                )}

                {selected.map((id) => {
                  const cat = catMap.get(id)
                  return (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={id}
                      name={cat?.name ?? id}
                      stroke={`var(--event-${id}-fill)`}
                      strokeWidth={activeId === id ? 2.5 : 1.5}
                      strokeOpacity={activeId && activeId !== id ? 0.25 : 1}
                      onMouseEnter={() => setActiveId(id)}
                      onMouseLeave={() => setActiveId(null)}
                      isAnimationActive={false}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  )
                })}

                {budgetLine > 0 && selected.length === 1 && (
                  <ReferenceLine
                    y={budgetLine}
                    stroke="var(--line-strong)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{
                      value: `${budgetLine.toFixed(1)}h`,
                      position: 'insideTopRight',
                      fill: 'var(--ink-2)',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {maturity.maturityLevel === 'warming' && (
        <p className="trend-warm">{'数据预热中，趋势仅供参考'}</p>
      )}
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const TREND_CSS = `
.trend-root {
  width: 100%;
  max-width: 1100px;
  margin: 28px auto 0;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-1);
}

/* ── KPI cards ───────────────────────────── */
.trend-kpi {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 30px;
}
.trend-kpi-card {
  padding: 18px 18px 16px;
  border: 1px solid var(--heatmap-rule);
  border-radius: 10px;
  background: var(--surface-raised);
}
.trend-kpi-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 11px;
  letter-spacing: 0.3em;
  color: var(--heatmap-ink-3);
  margin-bottom: 10px;
}
.trend-kpi-row {
  display: flex;
  align-items: baseline;
  gap: 7px;
}
.trend-kpi-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 26px;
  font-weight: 400;
  line-height: 1;
  color: var(--heatmap-ink-1);
}
.trend-kpi-unit {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--heatmap-ink-2);
}
.trend-kpi-note {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  margin-top: 9px;
}
.trend-badge {
  margin-left: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}
.trend-badge.is-up {
  background: var(--event-sage-bg);
  color: var(--event-sage-text);
}
.trend-badge.is-down {
  background: var(--event-rose-bg);
  color: var(--event-rose-text);
}
.trend-badge.is-flat {
  background: var(--surface-sunken);
  color: var(--heatmap-ink-2);
}

/* ── Main: sidebar + plot ────────────────── */
.trend-main {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 30px;
  align-items: start;
}
.trend-side-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  margin-bottom: 3px;
}
.trend-side-note {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 10px;
  color: var(--heatmap-ink-3);
  margin-bottom: 12px;
}
.trend-side-row {
  padding: 9px 8px;
  margin: 0 -8px;
  border-radius: 6px;
  border-bottom: 1px dashed var(--heatmap-rule);
  transition: background-color 0.2s ease;
}
.trend-side-row:last-child { border-bottom: none; }
.trend-side-row.is-active { background: var(--surface-sunken); }
.trend-side-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.trend-side-name {
  font-size: 12px;
  font-weight: 600;
}
.trend-side-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--heatmap-ink-2);
}
.trend-side-bar {
  height: 6px;
  border-radius: 2px;
  background: var(--surface-sunken);
  overflow: hidden;
}
.trend-side-bar > i {
  display: block;
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease-out;
}
.trend-side-foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--heatmap-ink-3);
}
.trend-side-foot .is-up { color: var(--event-sage-text); }
.trend-side-foot .is-down { color: var(--event-rose-text); }

/* ── Plot ────────────────────────────────── */
.trend-plot { min-width: 0; }
.trend-chart-container {
  position: relative;
  height: clamp(280px, 42vh, 420px);
}
.trend-chart-container .recharts-cartesian-axis-tick text {
  fill: var(--ink-3) !important;
}
.trend-warm {
  text-align: center;
  margin-top: 16px;
  font-size: 11px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-3);
}

/* ── Responsive ──────────────────────────── */
@media (max-width: 900px) {
  .trend-kpi { grid-template-columns: repeat(2, 1fr); }
  .trend-main { grid-template-columns: 1fr; gap: 24px; }
}
@media (max-width: 719px) {
  .trend-kpi-num { font-size: 22px; }
  .trend-kpi-card { padding: 15px 14px 13px; }
  .trend-chart-container { height: 260px; }
}
`
