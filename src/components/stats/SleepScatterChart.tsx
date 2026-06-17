import { useMemo, useState, startTransition } from 'react'
import { ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Customized, usePlotArea } from 'recharts'
import type { CalendarEvent } from '@/domain/event'
import { InsomniaSummary } from './InsomniaSummary'

/* ── Types ─────────────────────────────────────────────────── */

interface SleepNight {
  day: number
  label: string
  /** wrapped Y: minutes in [1080, 2280] (18:00→14:00 next day) */
  bedY: number
  wakeY: number
  /** original decimal hours (for tooltip display) */
  bedTime: number
  wakeTime: number
  duration: number
}

interface RawNight {
  nightKey: number
  bedTime: number
  wakeTime: number
  duration: number
  day: number
  dayOfYear: number
}

type SleepViewMode = 'month' | 'quarter' | 'year'

/* ── Helpers ────────────────────────────────────────────── */

function fmtHour(h: number): string {
  const hr = Math.floor(h)
  const mi = Math.round((h - hr) * 60)
  return `${String(hr).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

function fmtDuration(h: number): string {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m`
}

/** Wrap a decimal-hour value into the [1080, 2280] minute range (18:00→14:00 next day) */
function toWrapY(decimalHours: number): number {
  const minutes = Math.round(decimalHours * 60)
  const wrapped = minutes < 1080 ? minutes + 1440 : minutes
  return Math.max(1080, Math.min(2280, wrapped))
}

/** Y-axis tick → display label */
function tickLabel(minutes: number): string {
  let m = minutes
  if (m >= 1440) m -= 1440
  const h = Math.floor(m / 60)
  const mi = m % 60
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

function monthLabel(date: Date): string {
  return `${date.getMonth() + 1}月`
}

function viewLabel(vm: SleepViewMode, anchor: Date): string {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  switch (vm) {
    case 'month':   return `${y} 年 ${m + 1} 月`
    case 'quarter': return `${m + 1}月-${m + 4}月`
    case 'year':    return `${y} 年`
  }
}

function viewDesc(vm: SleepViewMode): string {
  switch (vm) {
    case 'month':   return '就寝与起床时间'
    case 'quarter': return '季度睡眠模式'
    case 'year':    return '全年睡眠模式'
  }
}

/* ── Y-axis config ─────────────────────────────────────── */

/** Every 2 hours from 18:00 → 14:00 next day */
const Y_TICKS = [1080, 1200, 1320, 1440, 1560, 1680, 1800, 1920, 2040, 2160, 2280]

/* ── Custom SVG overlay: bars + dots + average lines ──────
   Recharts v3 only exposes axis scales (useX/YAxisScale, and what
   <ReferenceLine> relies on) once a graphical series (Bar/Line/Scatter)
   is registered on the axis. This chart has none, so those return
   undefined and nothing draws. Instead we read the plot-area geometry
   — which is series-independent — and map our fixed domains to pixels
   ourselves: X over [1, days], Y over [Y_TICKS min, max] with the axis
   reversed (18:00 at top → 14:00 next day at bottom). */

interface SleepMarksProps {
  nights: SleepNight[]
  days: number
  colorBedDot: string
  colorWakeDot: string
  avgBedY?: number
  avgWakeY?: number
  avgBedLabel?: string
  avgWakeLabel?: string
  avgLineColor: string
  avgLabelColor: string
}

function SleepMarks({
  nights, days, colorBedDot, colorWakeDot,
  avgBedY, avgWakeY, avgBedLabel, avgWakeLabel, avgLineColor, avgLabelColor,
}: SleepMarksProps) {
  const plot = usePlotArea()
  if (!plot) return null

  const { x: px, y: py, width: pw, height: ph } = plot
  const yMin = Y_TICKS[0]
  const yMax = Y_TICKS[Y_TICKS.length - 1]
  const ySpan = yMax - yMin

  // X domain is [1, days]; Y domain is [yMin, yMax] with the axis reversed,
  // so yMin sits at the top (py) and yMax at the bottom (py + ph).
  const xOf = (day: number) => (days <= 1 ? px + pw / 2 : px + ((day - 1) / (days - 1)) * pw)
  const yOf = (v: number) => py + ((v - yMin) / ySpan) * ph

  return (
    <g>
      {/* Average bed/wake reference lines (behind the marks) */}
      {avgBedY != null && (
        <>
          <line x1={px} x2={px + pw} y1={yOf(avgBedY)} y2={yOf(avgBedY)} stroke={avgLineColor} strokeDasharray="4 4" strokeWidth={1} />
          {avgBedLabel && (
            <text x={px + pw} y={yOf(avgBedY) - 4} textAnchor="end" fill={avgLabelColor} fontSize={11} style={{ fontFamily: 'var(--font-mono)' }}>{avgBedLabel}</text>
          )}
        </>
      )}
      {avgWakeY != null && (
        <>
          <line x1={px} x2={px + pw} y1={yOf(avgWakeY)} y2={yOf(avgWakeY)} stroke={avgLineColor} strokeDasharray="4 4" strokeWidth={1} />
          {avgWakeLabel && (
            <text x={px + pw} y={yOf(avgWakeY) - 4} textAnchor="end" fill={avgLabelColor} fontSize={11} style={{ fontFamily: 'var(--font-mono)' }}>{avgWakeLabel}</text>
          )}
        </>
      )}

      {/* Per-night sleep bar + bed/wake dots */}
      {nights.map((n, i) => {
        const cx = xOf(n.day)
        const y1 = yOf(n.bedY)
        const y2 = yOf(n.wakeY)
        return (
          <g key={i}>
            <circle cx={cx} cy={y1} r={5} fill={colorBedDot} />
            <circle cx={cx} cy={y2} r={5} fill={colorWakeDot} />
          </g>
        )
      })}
    </g>
  )
}

/* ── Component ──────────────────────────────────────────── */

interface SleepScatterChartProps {
  rangeEvents: CalendarEvent[]
}

export function SleepScatterChart({ rangeEvents }: SleepScatterChartProps) {
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 720
  const cutoff = Date.now() - 365 * 86_400_000

  /* ════════════════════════════════════════════════
     Step 1 — Filter sleep events
     ════════════════════════════════════════════════ */

  const sleepEvents = useMemo(() => {
    return rangeEvents.filter(
      (e) => e.categoryId === 'stone'
           && e.endTime - e.startTime >= 3 * 3_600_000
           && e.startTime > cutoff
           && !(e.typedData?.type === 'sleep'
             && (e.typedData.sleepType === 'nap' || e.typedData.sleepType === 'insomnia')),
    )
  }, [rangeEvents, cutoff])

  /* ════════════════════════════════════════════════
     Step 2 — Pre-compute all nights
     ════════════════════════════════════════════════ */

  const allNights = useMemo(() => {
    const byNight = new Map<number, RawNight>()

    for (const ev of sleepEvents) {
      const d = new Date(ev.startTime)
      const year = d.getFullYear()
      const month = d.getMonth()
      const day = d.getDate()

      const nightKey = new Date(year, month, day).getTime()
      const prev = byNight.get(nightKey)

      if (prev && ev.endTime - ev.startTime <= prev.duration * 3_600_000) continue

      const bedTime = d.getHours() + d.getMinutes() / 60
      const wd = new Date(ev.endTime)
      const wakeTime = wd.getHours() + wd.getMinutes() / 60
      const duration = wakeTime > bedTime ? wakeTime - bedTime : wakeTime + 24 - bedTime

      if (duration < 3) continue

      const startOfYear = new Date(year, 0, 1).getTime()
      const dayOfYear = Math.floor((nightKey - startOfYear) / 86_400_000) + 1

      byNight.set(nightKey, { nightKey, bedTime, wakeTime, duration, day, dayOfYear })
    }

    return Array.from(byNight.values()).sort((a, b) => a.nightKey - b.nightKey)
  }, [sleepEvents])

  /* ════════════════════════════════════════════════
     Step 3 — View state
     ════════════════════════════════════════════════ */

  const [viewMode, setViewMode] = useState<SleepViewMode>('month')
  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const goPrev = () => {
    startTransition(() => {
      setAnchorDate((d) => {
        switch (viewMode) {
          case 'month':   return new Date(d.getFullYear(), d.getMonth() - 1, 1)
          case 'quarter': return new Date(d.getFullYear(), d.getMonth() - 4, 1)
          case 'year':    return new Date(d.getFullYear() - 1, 0, 1)
        }
      })
    })
  }

  const goNext = () => {
    startTransition(() => {
      setAnchorDate((d) => {
        switch (viewMode) {
          case 'month':   return new Date(d.getFullYear(), d.getMonth() + 1, 1)
          case 'quarter': return new Date(d.getFullYear(), d.getMonth() + 4, 1)
          case 'year':    return new Date(d.getFullYear() + 1, 0, 1)
        }
      })
    })
  }

  const changeViewMode = (vm: SleepViewMode) => {
    if (vm === viewMode) return
    startTransition(() => {
      setViewMode(vm)
      setAnchorDate(() => {
        const now = new Date()
        switch (vm) {
          case 'month':   return new Date(now.getFullYear(), now.getMonth(), 1)
          case 'quarter': return new Date(now.getFullYear(), Math.floor(now.getMonth() / 4) * 4, 1)
          case 'year':    return new Date(now.getFullYear(), 0, 1)
        }
      })
    })
  }

  /* ════════════════════════════════════════════════
     Step 4 — View window
     ════════════════════════════════════════════════ */

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
        const start = new Date(y, m, 1)
        const end = new Date(y, m + 4, 1)
        return { start, end, days: (end.getTime() - start.getTime()) / 86_400_000 }
      }
      case 'year': {
        const start = new Date(y, 0, 1)
        const end = new Date(y + 1, 0, 1)
        return { start, end, days: (end.getTime() - start.getTime()) / 86_400_000 }
      }
    }
  }, [viewMode, anchorDate])

  /* ════════════════════════════════════════════════
     Step 5 — Ticks
     ════════════════════════════════════════════════ */

  const xTicks = useMemo(() => {
    if (viewMode === 'month') {
      const d = viewWindow.days
      const nums = [1, 5, 10, 15, 20, 25].filter((v) => v <= d)
      if (d > 25) nums.push(d)
      return nums.map((v) => ({ value: v, label: String(v) }))
    }

    const ticks: { value: number; label: string }[] = []
    const months = viewMode === 'quarter' ? 4 : 12
    const startTs = viewWindow.start.getTime()
    for (let m = 0; m <= months; m++) {
      const ms = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + m, 1)
      const offset = Math.floor((ms.getTime() - startTs) / 86_400_000) + 1
      if (offset >= 1 && offset <= viewWindow.days) {
        ticks.push({ value: offset, label: m < months ? monthLabel(ms) : '' })
      }
    }
    return ticks
  }, [viewMode, viewWindow, anchorDate])

  /* ════════════════════════════════════════════════
     Step 6 — Filter to view + wrap Y
     ════════════════════════════════════════════════ */

  const viewNights = useMemo(() => {
    const startTs = viewWindow.start.getTime()
    const endTs = viewWindow.end.getTime()

    const result: SleepNight[] = []
    for (const n of allNights) {
      if (n.nightKey < startTs || n.nightKey >= endTs) continue

      let dayNum: number
      if (viewMode === 'month') {
        dayNum = n.day
      } else if (viewMode === 'year') {
        dayNum = n.dayOfYear
      } else {
        dayNum = Math.floor((n.nightKey - startTs) / 86_400_000) + 1
      }

      result.push({
        day: dayNum,
        label: String(dayNum),
        bedY: toWrapY(n.bedTime),
        wakeY: toWrapY(n.wakeTime),
        bedTime: n.bedTime,
        wakeTime: n.wakeTime,
        duration: n.duration,
      })
    }
    return result
  }, [allNights, viewWindow, viewMode])

  /* ════════════════════════════════════════════════
     Step 7 — Stats
     ════════════════════════════════════════════════ */

  const stats = useMemo(() => {
    const n = viewNights.length
    if (n === 0) return null
    const avgDuration = viewNights.reduce((s, d) => s + d.duration, 0) / n
    const avgBed = viewNights.reduce((s, d) => s + d.bedTime, 0) / n
    const avgWake = viewNights.reduce((s, d) => s + d.wakeTime, 0) / n
    const avgBedY = toWrapY(avgBed)
    const avgWakeY = toWrapY(avgWake)
    return { n, avgDuration, avgBed, avgWake, avgBedY, avgWakeY }
  }, [viewNights])

  /* ── Colors ────────────────────────────── */

  const colorBedDot = 'var(--accent)'
  const colorWakeDot = 'var(--cat-sleep)'
  const avgLineColor = 'var(--line-strong)'
  const avgLabelColor = 'var(--ink-2)'

  /* ════════════════════════════════════════════════
     Step 8 — Render
     ════════════════════════════════════════════════ */

  const label = viewLabel(viewMode, anchorDate)
  const desc = viewDesc(viewMode)

  const xTickFont = viewMode === 'month'
    ? { fontSize: 11, fontFamily: 'var(--font-mono)' }
    : { fontSize: 11, fontFamily: 'var(--font-ui)' }

  return (
    <div className="sleep-root">
      <style>{SLEEP_CSS}</style>
      <style>{`
        .sleep-chart-container .recharts-cartesian-axis-tick text {
          fill: var(--ink-3) !important;
        }
      `}</style>

      {/* ── Title area ──────────────────────────────── */}
      <div className={`sleep-title-area${isCompact ? ' sleep-title-compact' : ''}`}>
        <div className="sleep-title-left">
          <div className="sleep-title-row">
            <button onClick={goPrev} className="sleep-title-arrow" title={'上一周期'}>‹</button>
            <span className="sleep-title-main">{label}</span>
            <button onClick={goNext} className="sleep-title-arrow" title={'下一周期'}>›</button>

            <div className="sleep-title-periods">
              {(['month', 'quarter', 'year'] as SleepViewMode[]).map((vm) => (
                <button
                  key={vm}
                  onClick={() => changeViewMode(vm)}
                  className={`sleep-title-period${viewMode === vm ? ' sleep-title-period-active' : ''}`}
                >
                  {vm === 'month' ? '月' : vm === 'quarter' ? '季' : '年'}
                </button>
              ))}
            </div>
          </div>
          <p className="sleep-title-desc">{desc}</p>
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────── */}
      {viewNights.length === 0 ? (
        <p className="sleep-empty">{'暂无睡眠数据'}</p>
      ) : (
        <>
          {/* ── Chart ─────────────────────────────── */}
          <div className="sleep-chart-container">
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={viewNights} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} syncWithTicks={true} />

                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[1, viewWindow.days]}
                  tickFormatter={(v: number) => {
                    const tick = xTicks.find((t) => t.value === v)
                    return tick ? tick.label : ''
                  }}
                  ticks={xTicks.map((t) => t.value)}
                  tick={xTickFont}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--line)' }}
                  interval={0}
                />

                <YAxis
                  domain={[1080, 2280]}
                  reversed={true}
                  tickFormatter={tickLabel}
                  tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  ticks={Y_TICKS}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0]?.payload as SleepNight | undefined
                    if (!row) return null
                    return (
                      <div style={{
                        background: 'var(--surface-raised)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-s)',
                        padding: '8px 12px',
                        boxShadow: 'var(--shadow-tooltip)',
                      }}>
                        <div style={{
                          fontSize: 11,
                          color: 'var(--ink-3)',
                          fontFamily: 'var(--font-mono)',
                          marginBottom: 6,
                        }}>
                          {viewMode === 'month' ? `${anchorDate.getMonth() + 1}月${row.day}日` : `第 ${label} 日`}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: colorBedDot }} />
                          <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}>就寝</span>
                          <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 500, marginLeft: 'auto', paddingLeft: 16 }}>
                            {fmtHour(row.bedTime)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: colorWakeDot }} />
                          <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}>起床</span>
                          <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 500, marginLeft: 'auto', paddingLeft: 16 }}>
                            {fmtHour(row.wakeTime)}
                          </span>
                        </div>
                        <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}>时长</span>
                          <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 500, marginLeft: 'auto', paddingLeft: 16 }}>
                            {fmtDuration(row.duration)}
                          </span>
                        </div>
                      </div>
                    )
                  }}
                />

                {/* Bars + dots + average lines (custom SVG overlay).
                    Drawn from plot-area geometry because this chart has no
                    graphical series for the axis-scale hooks to attach to. */}
                <Customized
                  component={SleepMarks}
                  nights={viewNights}
                  days={viewWindow.days}
                  colorBedDot={colorBedDot}
                  colorWakeDot={colorWakeDot}
                  avgBedY={stats?.avgBedY}
                  avgWakeY={stats?.avgWakeY}
                  avgBedLabel={stats ? `平均就寝 ${fmtHour(stats.avgBed)}` : undefined}
                  avgWakeLabel={stats ? `平均起床 ${fmtHour(stats.avgWake)}` : undefined}
                  avgLineColor={avgLineColor}
                  avgLabelColor={avgLabelColor}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* ── Legend ──────────────────────────────── */}
          <div className="sleep-legend">
            <span className="sleep-legend-item">
              <span className="sleep-legend-dot" style={{ background: colorBedDot }} />
              {'就寝'}
            </span>
            <span className="sleep-legend-item">
              <span className="sleep-legend-dot" style={{ background: colorWakeDot }} />
              {'起床'}
            </span>
          </div>

          {/* ── Stats bar ───────────────────────────── */}
          {stats && (
            <div className={`sleep-stats-bar${isCompact ? ' sleep-stats-compact' : ''}`}>
              <div className="sleep-stat">
                <div className="sleep-stat-label">{'时 长'}</div>
                <div className="sleep-stat-value">{fmtDuration(stats.avgDuration)}</div>
                <div className="sleep-stat-detail">{'平均'}</div>
              </div>
              <div className="sleep-stat">
                <div className="sleep-stat-label">{'就 寝'}</div>
                <div className="sleep-stat-value">{fmtHour(stats.avgBed)}</div>
                <div className="sleep-stat-detail">{'平均就寝'}</div>
              </div>
              <div className="sleep-stat">
                <div className="sleep-stat-label">{'起 床'}</div>
                <div className="sleep-stat-value">{fmtHour(stats.avgWake)}</div>
                <div className="sleep-stat-detail">{'平均起床'}</div>
              </div>
              <div className="sleep-stat">
                <div className="sleep-stat-label">{'天 数'}</div>
                <div className="sleep-stat-value">
                  {stats.n}<span className="sleep-stat-unit">{'晚'}</span>
                </div>
                <div className="sleep-stat-detail">{label}</div>
              </div>
            </div>
          )}

          <InsomniaSummary rangeEvents={rangeEvents} />
        </>
      )}
    </div>
  )
}

/* ── Scoped CSS ─────────────────────────────────────────── */

const SLEEP_CSS = `
.sleep-root {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-1);
  padding-top: 8px;
}

/* ── Title area ──────────────────────────── */
.sleep-title-area {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.sleep-title-compact {
  flex-direction: column;
}
.sleep-title-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sleep-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sleep-title-main {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
  letter-spacing: 0.02em;
  min-width: 120px;
  text-align: center;
}
.sleep-title-arrow {
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
.sleep-title-arrow:hover {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg-card);
}
.sleep-title-periods {
  display: flex;
  gap: 2px;
  margin-left: 6px;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  padding: 2px;
}
.sleep-title-period {
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
.sleep-title-period:hover {
  color: var(--heatmap-ink-1);
}
.sleep-title-period-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}
.sleep-title-desc {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--heatmap-ink-3);
  margin: 0;
}

/* ── Chart container ─────────────────────── */
.sleep-chart-container {
  margin-top: 28px;
  position: relative;
}

/* ── Legend ──────────────────────────────── */
.sleep-legend {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 12px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 12px;
  color: var(--heatmap-ink-3);
}
.sleep-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sleep-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Stats bar ───────────────────────────── */
.sleep-stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--heatmap-rule);
  border-bottom: 1px solid var(--heatmap-rule);
  margin-top: 28px;
}
.sleep-stats-compact {
  grid-template-columns: repeat(2, 1fr);
}
.sleep-stat {
  padding: 24px 20px;
  border-right: 1px solid var(--heatmap-rule);
}
.sleep-stat:last-child {
  border-right: none;
}
.sleep-stats-compact .sleep-stat:nth-child(even) {
  border-right: none;
}
.sleep-stat-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  letter-spacing: 0.4em;
  margin-bottom: 8px;
}
.sleep-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
  line-height: 1.1;
  margin-bottom: 6px;
}
.sleep-stat-unit {
  font-size: 14px;
  color: var(--heatmap-ink-2);
  margin-left: 2px;
}
.sleep-stat-detail {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
}

/* ── Empty ───────────────────────────────── */
.sleep-empty {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  color: var(--heatmap-ink-3);
  font-style: italic;
  margin-top: 40px;
}

/* ── Responsive ──────────────────────────── */
@media (max-width: 719px) {
  .sleep-title-main {
    font-size: 22px;
    min-width: 100px;
  }
  .sleep-title-desc {
    font-size: 13px;
  }
  .sleep-stat-value {
    font-size: 22px;
  }
  .sleep-stat {
    padding: 18px 14px;
  }
}
`
