import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { CalendarEvent } from '@/domain/event'
import { computeMonthlyInsomniaStats } from '@/domain/insomnia'

/* ── Helpers ────────────────────────────────────────────────── */

function fmtDuration(h: number): string {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m`
}

function fmtHour(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function qualityStars(q: number | null | undefined): string {
  if (q == null) return '--'
  return '★'.repeat(q) + '☆'.repeat(5 - q)
}

function monthYearLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${y}年${Number(m)}月`
}

function monthShortLabel(key: string): string {
  return `${Number(key.split('-')[1])}月`
}

/* ── Component ──────────────────────────────────────────────── */

interface InsomniaSummaryProps {
  rangeEvents: CalendarEvent[]
}

export function InsomniaSummary({ rangeEvents }: InsomniaSummaryProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  const result = useMemo(
    () => computeMonthlyInsomniaStats(rangeEvents, 12),
    [rangeEvents],
  )

  const { monthlyStats, totalNights, latestMonth } = result

  // 没有失眠数据 → 不渲染
  if (totalNights === 0) return null

  // Bar chart data
  const chartData = monthlyStats.map((m) => ({
    month: monthShortLabel(m.monthKey),
    count: m.count,
    monthKey: m.monthKey,
  }))

  // 全局平均（取所有有数据的月份的平均）
  const monthsWithData = monthlyStats.filter((m) => m.count > 0)
  const globalAvgDuration = monthsWithData.length > 0
    ? monthsWithData.reduce((s, m) => s + m.avgDurationHours, 0) / monthsWithData.length
    : 0
  const globalAvgQualityArr = monthsWithData
    .map((m) => m.avgQuality)
    .filter((q): q is number => q !== null)
  const globalAvgQuality = globalAvgQualityArr.length > 0
    ? globalAvgQualityArr.reduce((a, b) => a + b, 0) / globalAvgQualityArr.length
    : null

  const currentDetail = expandedMonth
    ? monthlyStats.find((m) => m.monthKey === expandedMonth)
    : latestMonth

  const toggleMonth = (key: string) => {
    setExpandedMonth((prev) => (prev === key ? null : key))
  }

  return (
    <div className="insomnia-root">
      <style>{INSOMNIA_CSS}</style>

      {/* ── Header ─────────────────────────── */}
      <button
        className="insomnia-header"
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="insomnia-header-icon">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </span>
        <span className="insomnia-header-title">{'失眠摘要'}</span>
        <span className="insomnia-header-badge">{`${totalNights}晚`}</span>
      </button>

      {!collapsed && (
        <>
          {/* ── KPI row ──────────────────────── */}
          <div className="insomnia-kpi-row">
            <div className="insomnia-kpi">
              <div className="insomnia-kpi-value">{totalNights}</div>
              <div className="insomnia-kpi-label">{'失眠晚数（近12月）'}</div>
            </div>
            <div className="insomnia-kpi">
              <div className="insomnia-kpi-value">{fmtDuration(globalAvgDuration)}</div>
              <div className="insomnia-kpi-label">{'平均时长'}</div>
            </div>
            <div className="insomnia-kpi">
              <div className="insomnia-kpi-value">{qualityStars(globalAvgQuality)}</div>
              <div className="insomnia-kpi-label">{'平均质量'}</div>
            </div>
          </div>

          {/* ── Bar chart ────────────────────── */}
          <div className="insomnia-chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 10,
                    fill: 'var(--text-tertiary)',
                    fontFamily: "'Noto Sans SC', sans-serif",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, 'auto']}
                  tick={{
                    fontSize: 10,
                    fill: 'var(--text-tertiary)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={20}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]
                    if (!d?.payload) return null
                    const { monthKey, count } = d.payload as { monthKey: string; count: number }
                    const stat = monthlyStats.find((m) => m.monthKey === monthKey)
                    return (
                      <div className="insomnia-tooltip">
                        <div className="insomnia-tooltip-title">
                          {monthYearLabel(monthKey)}
                        </div>
                        <div className="insomnia-tooltip-row">
                          {'失眠 '}{count}{' 晚'}
                        </div>
                        {stat && stat.count > 0 && (
                          <>
                            <div className="insomnia-tooltip-row">
                              {'平均 '}{fmtDuration(stat.avgDurationHours)}
                            </div>
                            {stat.avgQuality != null && (
                              <div className="insomnia-tooltip-row">
                                {qualityStars(stat.avgQuality)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--event-accent-fill)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                  cursor="pointer"
                  onClick={(_data, index) => {
                    const entry = chartData[index]
                    if (entry?.monthKey) toggleMonth(entry.monthKey)
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Detail list ──────────────────── */}
          {currentDetail && currentDetail.count > 0 && (
            <div className="insomnia-detail">
              <div
                className="insomnia-detail-header"
                onClick={() => setExpandedMonth(
                  expandedMonth === currentDetail.monthKey ? null : currentDetail.monthKey,
                )}
              >
                <span className="insomnia-detail-month">
                  {monthYearLabel(currentDetail.monthKey)}
                </span>
                <span className="insomnia-detail-count">
                  {currentDetail.count} 晚
                </span>
                <span className="insomnia-detail-avg">
                  平均 {fmtDuration(currentDetail.avgDurationHours)}
                  {currentDetail.avgQuality != null && ` · ${qualityStars(currentDetail.avgQuality)}`}
                </span>
              </div>

              {/* Month selector pills (only show months with data) */}
              {monthlyStats.some((m) => m.count > 0) && (
                <div className="insomnia-month-pills">
                  {monthlyStats
                    .filter((m) => m.count > 0)
                    .slice()
                    .reverse()
                    .map((m) => (
                      <button
                        key={m.monthKey}
                        className={`insomnia-month-pill${
                          m.monthKey === currentDetail.monthKey ? ' insomnia-month-pill-active' : ''
                        }`}
                        onClick={() => toggleMonth(m.monthKey)}
                      >
                        {monthShortLabel(m.monthKey)}
                        <span className="insomnia-month-pill-count">{m.count}</span>
                      </button>
                    ))}
                </div>
              )}

              {/* Night entries */}
              <div className="insomnia-night-list">
                {currentDetail.nights.map((night) => (
                  <div key={night.id} className="insomnia-night-row">
                    <span className="insomnia-night-date">{night.date.slice(5)}</span>
                    <span className="insomnia-night-dot">🌙</span>
                    <span className="insomnia-night-time">
                      {fmtHour(night.startTime)}–{fmtHour(night.endTime)}
                    </span>
                    <span className="insomnia-night-duration">
                      {fmtDuration(night.durationHours)}
                    </span>
                    {night.quality != null && (
                      <span className="insomnia-night-quality">
                        {qualityStars(night.quality)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Scoped CSS ─────────────────────────────────────────────── */

const INSOMNIA_CSS = `
.insomnia-root {
  margin-top: 24px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 16px;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

/* ── Header ────────────────────────── */
.insomnia-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 14px;
  color: var(--heatmap-ink-1);
  transition: color 0.2s ease;
  text-align: left;
}
.insomnia-header:hover {
  color: var(--event-accent-fill);
}
.insomnia-header-icon {
  display: flex;
  align-items: center;
  color: var(--heatmap-ink-3);
  flex-shrink: 0;
}
.insomnia-header-title {
  font-family: 'Noto Serif SC', serif;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.03em;
}
.insomnia-header-badge {
  margin-left: auto;
  padding: 1px 10px;
  border-radius: 10px;
  background: var(--event-accent-fill);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
}

/* ── KPI row ────────────────────────── */
.insomnia-kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
  margin-top: 12px;
}
.insomnia-kpi {
  background: var(--heatmap-bg-card);
  padding: 16px 12px;
  text-align: center;
}
.insomnia-kpi-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
  margin-bottom: 4px;
}
.insomnia-kpi-label {
  font-size: 11px;
  color: var(--heatmap-ink-3);
  letter-spacing: 0.02em;
}

/* ── Bar chart wrapper ────────────── */
.insomnia-chart-wrap {
  margin-top: 20px;
  padding-right: 4px;
}

/* ── Tooltip ───────────────────────── */
.insomnia-tooltip {
  background: var(--heatmap-ink-1);
  color: var(--heatmap-bg);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.6;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}
.insomnia-tooltip-title {
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 2px;
}
.insomnia-tooltip-row {
  opacity: 0.85;
}

/* ── Detail section ────────────────── */
.insomnia-detail {
  margin-top: 20px;
}
.insomnia-detail-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 4px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}
.insomnia-detail-header:hover {
  background: var(--heatmap-bg-card);
}
.insomnia-detail-month {
  font-family: 'Noto Serif SC', serif;
  font-weight: 600;
  font-size: 14px;
  color: var(--heatmap-ink-1);
}
.insomnia-detail-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--event-accent-fill);
}
.insomnia-detail-avg {
  font-size: 11px;
  color: var(--heatmap-ink-3);
  margin-left: auto;
}

/* ── Month pills ───────────────────── */
.insomnia-month-pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.insomnia-month-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  transition: all 0.15s ease;
}
.insomnia-month-pill:hover {
  border-color: var(--event-accent-fill);
  color: var(--event-accent-fill);
}
.insomnia-month-pill-active {
  background: var(--event-accent-fill);
  border-color: var(--event-accent-fill);
  color: #fff;
}
.insomnia-month-pill-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  opacity: 0.75;
}

/* ── Night list ────────────────────── */
.insomnia-night-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.insomnia-night-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  transition: background-color 0.15s ease;
}
.insomnia-night-row:hover {
  background: var(--heatmap-bg-card);
}
.insomnia-night-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  min-width: 28px;
}
.insomnia-night-dot {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}
.insomnia-night-time {
  font-family: 'JetBrains Mono', monospace;
  color: var(--heatmap-ink-1);
  min-width: 74px;
}
.insomnia-night-duration {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--heatmap-ink-2);
  min-width: 44px;
}
.insomnia-night-quality {
  margin-left: auto;
  font-size: 11px;
  color: var(--heatmap-ink-2);
}

@media (max-width: 719px) {
  .insomnia-kpi-value {
    font-size: 18px;
  }
  .insomnia-night-time {
    min-width: 62px;
  }
}
`
