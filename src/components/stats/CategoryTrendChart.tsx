import { useMemo, useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { RechartsTooltip } from './RechartsTooltip'
import type { Category, CategoryId } from '@/domain/category'
import type { DataMaturity } from '@/domain/maturity'
import type { Granularity, Bucket } from '@/hooks/useStatsAggregation'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']
const CAT_STORAGE_KEY = 'cailens-trend-categories'
const DAY_MS = 24 * 60 * 60_000

// ── Helpers ──────────────────────────────────────────────────

function formatBucketLabel(bucket: Bucket, periodType: Granularity): string {
  const d = bucket.start
  if (periodType === 'day') return format(d, 'MM.dd')
  if (periodType === 'week') return format(d, 'MM.dd')
  return format(d, 'yyyy-MM')
}

function periodLabel(periodType: Granularity): string {
  switch (periodType) {
    case 'day':   return '日趋势'
    case 'week':  return '周趋势'
    case 'month': return '月趋势'
  }
}

function periodDesc(periodType: Granularity): string {
  switch (periodType) {
    case 'day':   return '过去 14 天的每日投入变化'
    case 'week':  return '过去 8 周的逐周投入变化'
    case 'month': return '过去 12 个月的逐月投入变化'
  }
}

function periodDays(periodType: Granularity): number {
  switch (periodType) {
    case 'day':   return 1
    case 'week':  return 7
    case 'month': return 30.44
  }
}

function loadSelection(): CategoryId[] {
  try {
    const raw = localStorage.getItem(CAT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.every((v) => CATEGORY_IDS.includes(v))) {
        return parsed
      }
    }
  } catch { /* ignore */ }
  return ['accent']
}

function saveSelection(ids: CategoryId[]) {
  try { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}

// ── Component ────────────────────────────────────────────────

interface CategoryTrendChartProps {
  history: Bucket[]
  categories: Category[]
  periodType: Granularity
  maturity: DataMaturity
  onNavigate?: (dir: -1 | 1) => void
  onPeriodChange?: (p: Granularity) => void
}

export function CategoryTrendChart({
  history,
  categories,
  periodType,
  maturity,
  onNavigate,
  onPeriodChange,
}: CategoryTrendChartProps) {
  const [selected, setSelected] = useState<CategoryId[]>(loadSelection)
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => { saveSelection(selected) }, [selected])

  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth < 720)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const toggleCategory = useCallback((id: CategoryId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }, [])

  const catMap = useMemo(() => {
    const map = new Map<CategoryId, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  /* ── Chart data ──────────────────────────── */

  const chartData = useMemo(() => {
    return history.map((b) => {
      const label = formatBucketLabel(b, periodType)
      const row: Record<string, string | number> = { label }
      for (const id of CATEGORY_IDS) {
        row[id] = b.byCategory[id] ?? 0
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

    const days = (current.end.getTime() - current.start.getTime()) / DAY_MS
    const dailyAvg = days > 0 ? selectedTotal / days : 0

    let peakId: CategoryId = selected[0] || 'accent'
    let peakHours = 0
    for (const id of selected) {
      const h = current.byCategory[id] || 0
      if (h > peakHours) { peakHours = h; peakId = id }
    }

    let wowPct: number | null = null
    let wowAbs: number | null = null
    if (prev) {
      const prevTotal = selected.reduce((sum, id) => sum + (prev.byCategory[id] || 0), 0)
      wowAbs = selectedTotal - prevTotal
      wowPct = prevTotal > 0 ? (wowAbs / prevTotal) * 100 : null
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

      {/* ── Title area ─────────────────────────────────── */}
      <div className={`trend-title-area${isCompact ? ' trend-title-compact' : ''}`}>
        <div className="trend-title-left">
          <div className="trend-title-row">
            {onNavigate && (
              <button
                onClick={() => onNavigate(-1)}
                className="trend-title-arrow"
                title={'上一周期'}
              >‹</button>
            )}
            <span className="trend-title-main">
              {periodLabel(periodType)}
            </span>
            {onNavigate && (
              <button
                onClick={() => onNavigate(1)}
                className="trend-title-arrow"
                title={'下一周期'}
              >›</button>
            )}
            {onPeriodChange && (
              <div className="trend-title-periods">
                {(['day', 'week', 'month'] as Granularity[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => onPeriodChange(p)}
                    className={`trend-title-period${periodType === p ? ' trend-title-period-active' : ''}`}
                  >
                    {p === 'day' ? '日' : p === 'week' ? '周' : '月'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="trend-title-desc">{periodDesc(periodType)}</p>
        </div>

        {/* Category pills */}
        <div className="trend-pills">
          {CATEGORY_IDS.map((id) => {
            const cat = catMap.get(id)
            const active = selected.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggleCategory(id)}
                className={`trend-pill${active ? ' trend-pill-active' : ''}`}
                style={
                  active
                    ? { backgroundColor: `var(--event-${id}-fill)`, color: 'var(--surface)' }
                    : undefined
                }
              >
                {cat?.name ?? id}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Chart ───────────────────────────────────────── */}
      <div className="trend-chart-container">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
            <Tooltip content={<RechartsTooltip decimals={1} />} />

            {selected.length > 0 && (
              <Area
                type="monotone"
                dataKey={selected[0]}
                fill={`var(--event-${selected[0]}-fill)`}
                fillOpacity={0.08}
                stroke="none"
                name={catMap.get(selected[0])?.name ?? selected[0]}
                dot={false}
                connectNulls={false}
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
                  strokeWidth={1.5}
                  dot={{ r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  connectNulls={false}
                />
              )
            })}

            {budgetLine > 0 && (
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
            <div
              className="trend-stat-value"
              style={{
                color: stats.wowPct !== null
                  ? (stats.wowPct >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)')
                  : undefined,
              }}
            >
              {stats.wowPct !== null ? `${stats.wowPct >= 0 ? '+' : ''}${stats.wowPct.toFixed(0)}%` : '—'}
            </div>
            <div className="trend-stat-detail">
              {stats.hasPrev
                ? (stats.wowAbs !== null
                    ? `${stats.wowAbs >= 0 ? '+' : ''}${stats.wowAbs.toFixed(1)}h`
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

/* ── Title area ──────────────────────────── */
.trend-title-area {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.trend-title-compact {
  flex-direction: column;
}
.trend-title-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.trend-title-main {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.trend-title-desc {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--heatmap-ink-3);
  margin: 0;
}
.trend-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.trend-title-arrow {
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
.trend-title-arrow:hover {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg-card);
}
.trend-title-periods {
  display: flex;
  gap: 2px;
  margin-left: 6px;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  padding: 2px;
}
.trend-title-period {
  padding: 2px 8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--heatmap-ink-3);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.trend-title-period:hover {
  color: var(--heatmap-ink-1);
}
.trend-title-period-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}

/* ── Pills ───────────────────────────────── */
.trend-pills {
  display: flex;
  gap: 6px;
  background: var(--heatmap-bg-card);
  border-radius: 999px;
  padding: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.trend-pill {
  padding: 6px 16px;
  border-radius: 999px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-2);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.25s ease, color 0.25s ease;
  white-space: nowrap;
}
.trend-pill:hover {
  color: var(--heatmap-ink-1);
}
.trend-pill-active {
  font-weight: 600;
}

/* ── Chart container ─────────────────────── */
.trend-chart-container {
  margin-top: 28px;
  position: relative;
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
  .trend-title-main {
    font-size: 22px;
  }
  .trend-title-desc {
    font-size: 13px;
  }
  .trend-pills {
    width: 100%;
  }
  .trend-stat-value {
    font-size: 22px;
  }
  .trend-stat {
    padding: 18px 14px;
  }
}
`
