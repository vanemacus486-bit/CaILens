import { useMemo, useState, useEffect } from 'react'
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
  Customized,
  usePlotArea,
} from 'recharts'
import { RechartsTooltip } from './RechartsTooltip'
import type { Category, CategoryId } from '@/domain/category'
import type { DataMaturity } from '@/domain/maturity'
import type { Granularity, Bucket } from '@/hooks/useStatsAggregation'
import { resolveLabelStack } from '@/domain/labelStack'

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

// ── Right-edge endpoint labels (single de-collided layer) ─────
//
// Drawn as one `Customized` layer instead of a per-line `<LabelList>` so the
// labels know each other's positions: when two series end at close values their
// labels are pushed apart vertically (resolveLabelStack) instead of stacking.
// A thin leader connects a nudged label back to its true endpoint.

interface EndpointLabelItem { id: CategoryId; name: string; value: number }

const LABEL_FONT = 10
const LABEL_GAP = 14

function EndpointLabels(props: { labels?: EndpointLabelItem[]; maxValue?: number }) {
  const plot = usePlotArea()
  const labels = props.labels ?? []
  const maxValue = props.maxValue ?? 0
  if (!plot || labels.length === 0 || maxValue <= 0) return null

  const { x, y, width, height } = plot
  const yOf = (v: number) => y + (1 - v / maxValue) * height
  const placed = resolveLabelStack(
    labels.map((l) => ({ key: l.id, idealY: yOf(l.value) })),
    { top: y + 2, bottom: y + height - 2, gap: LABEL_GAP },
  )
  const labelX = x + width + 8

  return (
    <g>
      {labels.map((l) => {
        const adjY = placed.get(l.id)
        if (adjY == null) return null
        const idealY = yOf(l.value)
        const color = `var(--event-${l.id}-fill)`
        return (
          <g key={l.id}>
            {Math.abs(adjY - idealY) > 2 && (
              <line
                x1={x + width + 2} y1={idealY}
                x2={labelX - 2} y2={adjY}
                stroke={color} strokeWidth={1} opacity={0.35}
              />
            )}
            <text
              x={labelX} y={adjY} dy={3}
              fill={color} fontSize={LABEL_FONT}
              fontFamily="var(--font-ui)" textAnchor="start"
            >
              {l.name}
            </text>
          </g>
        )
      })}
    </g>
  )
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
  const [isCompact, setIsCompact] = useState(false)
  // Which line the cursor is over — emphasised in the chart and the tooltip.
  const [activeId, setActiveId] = useState<CategoryId | null>(null)

  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth < 720)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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

  const topLabelIds = useMemo(() => {
    if (chartData.length === 0) return selected
    const lastRow = chartData[chartData.length - 1]
    const ranked = [...selected].sort((a, b) => ((lastRow[b] as number) || 0) - ((lastRow[a] as number) || 0))
    return ranked.slice(0, 3)
  }, [chartData, selected])

  // Visible right-edge labels: same rule as before (≤3 selected → all; else top 3),
  // skipping zero-value endpoints. Fed to the single EndpointLabels overlay.
  const endpointLabels = useMemo<EndpointLabelItem[]>(() => {
    if (chartData.length === 0) return []
    const lastRow = chartData[chartData.length - 1]
    const showAll = selected.length <= 3
    const out: EndpointLabelItem[] = []
    for (const id of selected) {
      if (!showAll && !topLabelIds.includes(id)) continue
      const value = (lastRow[id] as number) || 0
      if (value <= 0) continue
      out.push({ id, name: catMap.get(id)?.name ?? id, value })
    }
    return out
  }, [chartData, selected, topLabelIds, catMap])

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

      {/* ── Chart ───────────────────────────────────────── */}
      <div className="trend-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 56, left: 0, bottom: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--line)"
              vertical={false}
            />
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
              tickFormatter={(v: number) => `${v.toFixed(1)}h`}
              width={48}
              domain={[0, dynamicMax]}
            />
            <style>{`
              .trend-chart-container .recharts-cartesian-axis-tick text {
                fill: var(--ink-3) !important;
              }
            `}</style>
            <Tooltip content={<RechartsTooltip decimals={1} sortByValue showTotal showShare showDelta activeDataKey={activeId} />} />

            {chartData.length > 1 && (
              <ReferenceArea
                x1={chartData[chartData.length - 2].label as string}
                x2={chartData[chartData.length - 1].label as string}
                fill="var(--line)"
                fillOpacity={0.25}
                label={{
                  value: '进行中',
                  position: 'insideTopRight',
                  fill: 'var(--ink-2)',
                  fontSize: 10,
                  fontFamily: 'var(--font-ui)',
                }}
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
                  dot={(props: { cx?: number; cy?: number; payload?: { isCurrent?: boolean } }) => {
                    const { cx, cy, payload } = props
                    const dotOpacity = activeId && activeId !== id ? 0.25 : 1
                    if (payload?.isCurrent) {
                      return (
                        <circle
                          cx={cx} cy={cy} r={4}
                          fill="var(--surface)"
                          stroke={`var(--event-${id}-fill)`}
                          strokeWidth={1.5}
                          opacity={dotOpacity}
                        />
                      )
                    }
                    return (
                      <circle
                        cx={cx} cy={cy} r={3}
                        fill={`var(--event-${id}-fill)`}
                        stroke="none"
                        opacity={dotOpacity}
                      />
                    )
                  }}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  connectNulls={false}
                />
              )
            })}

            {/* Right-edge endpoint labels — one de-collided layer (see EndpointLabels) */}
            <Customized component={EndpointLabels} labels={endpointLabels} maxValue={dynamicMax} />

            {budgetLine > 0 && selected.length === 1 && (
              <ReferenceLine
                y={budgetLine}
                stroke="var(--line-strong)"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `${'预算'} ${budgetLine.toFixed(1)}h`,
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

      {maturity.maturityLevel === 'warming' && (
        <p
          style={{
            textAlign: 'center',
            marginTop: 16,
            fontSize: 11,
            fontFamily: "'Source Serif 4', 'Noto Serif SC', serif",
            color: 'var(--heatmap-ink-3)',
          }}
        >
          {'数据预热中，趋势仅供参考'}
        </p>
      )}

      {/* ── Stats bar ────────────────────────────────────── */}
      {stats && (
        <div className={`trend-stats-bar${isCompact ? ' trend-stats-compact' : ''}`}>
          <div className="trend-stat">
            <div className="trend-stat-label">{'总投入'}</div>
            <div className="trend-stat-value">
              {stats.selectedTotal.toFixed(1)}
              <span className="trend-stat-unit">h</span>
            </div>
            <div className="trend-stat-detail">{'最近一个周期'}</div>
          </div>

          <div className="trend-stat">
            <div className="trend-stat-label">{'日 均'}</div>
            <div className="trend-stat-value">
              {stats.dailyAvg.toFixed(1)}
              <span className="trend-stat-unit">h</span>
            </div>
            <div className="trend-stat-detail">
              {(() => {
                if (selected.length > 1) return '日均'
                const targetHrs = selected.reduce((sum, id) => {
                  const cat = catMap.get(id)
                  return sum + (cat?.weeklyBudget ?? 0)
                }, 0) / 7
                const pct = targetHrs > 0 ? Math.round((stats.dailyAvg / targetHrs) * 100) : null
                return pct !== null ? `达成 ${pct}%` : '日均'
              })()}
            </div>
          </div>

          <div className="trend-stat">
            <div className="trend-stat-label">{'高 峰'}</div>
            <div className="trend-stat-value" style={{ color: `var(--event-${stats.peakId}-fill)` }}>
              {stats.peakHours.toFixed(1)}
              <span className="trend-stat-unit">h</span>
            </div>
            <div className="trend-stat-detail">
              {catMap.get(stats.peakId)?.name ?? stats.peakId}
            </div>
          </div>

          <div className="trend-stat">
            <div className="trend-stat-label">{'环 比'}</div>
            <div className="trend-stat-value">
              {stats.wowPct !== null
                ? `${stats.wowPct >= 0 ? '↑' : '↓'}${Math.abs(stats.wowPct).toFixed(0)}%`
                : '—'}
            </div>
            <div className="trend-stat-detail">
              {stats.hasPrev
                ? (stats.wowAbs !== null
                    ? `${stats.wowAbs >= 0 ? '+' : ''}${stats.wowAbs.toFixed(1)}h/d`
                    : '较上期')
                : '需要更多数据'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const TREND_CSS = `
.trend-root {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-1);
}

/* ── Chart container ─────────────────────── */
.trend-chart-container {
  position: relative;
  height: clamp(300px, 46vh, 520px);
}

/* ── Stats bar ───────────────────────────── */
.trend-stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--heatmap-rule);
  border-bottom: 1px solid var(--heatmap-rule);
  margin-top: 28px;
}
.trend-stats-compact {
  grid-template-columns: repeat(2, 1fr);
}
.trend-stat {
  padding: 24px 20px;
  border-right: 1px solid var(--heatmap-rule);
}
.trend-stat:last-child {
  border-right: none;
}
.trend-stats-compact .trend-stat:nth-child(even) {
  border-right: none;
}
.trend-stat-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  letter-spacing: 0.4em;
  margin-bottom: 8px;
}
.trend-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
  line-height: 1.1;
  margin-bottom: 6px;
}
.trend-stat-unit {
  font-size: 14px;
  color: var(--heatmap-ink-2);
  margin-left: 2px;
}
.trend-stat-detail {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
}

/* ── Responsive ──────────────────────────── */
@media (max-width: 719px) {
  .trend-stat-value {
    font-size: 22px;
  }
  .trend-stat {
    padding: 18px 14px;
  }
}
`
