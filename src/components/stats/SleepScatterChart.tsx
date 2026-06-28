import { useMemo, useState, useCallback, useEffect } from 'react'
import { ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Customized, usePlotArea } from 'recharts'
import type { CalendarEvent } from '@/domain/event'
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

interface HoverInfo {
  night: SleepNight
  /** plot-pixel x of the focused day (crosshair + popup anchor) */
  cx: number
  plotTop: number
  plotLeft: number
  plotRight: number
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
  hoveredDay: number | null
  crosshairColor: string
  onHover: (info: HoverInfo | null) => void
}

function SleepMarks({
  nights, days, colorBedDot, colorWakeDot,
  avgBedY, avgWakeY, avgBedLabel, avgWakeLabel, avgLineColor, avgLabelColor,
  hoveredDay, crosshairColor, onHover,
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

  // Map a pointer's clientX to the nearest night that actually has data, so the
  // crosshair always snaps onto real dots (and skips empty days gracefully).
  const emit = (clientX: number, target: SVGRectElement) => {
    if (nights.length === 0) { onHover(null); return }
    const box = target.getBoundingClientRect()
    const frac = box.width > 0 ? (clientX - box.left) / box.width : 0
    const day = 1 + frac * (days - 1)
    let best = nights[0]
    for (const n of nights) {
      if (Math.abs(n.day - day) < Math.abs(best.day - day)) best = n
    }
    onHover({ night: best, cx: xOf(best.day), plotTop: py, plotLeft: px, plotRight: px + pw })
  }

  const hovered = hoveredDay != null ? nights.find((n) => n.day === hoveredDay) ?? null : null

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

      {/* Hover crosshair — a vertical guide that pins the focused day */}
      {hovered && (
        <line
          x1={xOf(hovered.day)} x2={xOf(hovered.day)} y1={py} y2={py + ph}
          stroke={crosshairColor} strokeWidth={1} strokeDasharray="3 3" opacity={0.5}
        />
      )}

      {/* Per-night bed/wake dots — the focused night gets a halo + larger dots */}
      {nights.map((n, i) => {
        const cx = xOf(n.day)
        const y1 = yOf(n.bedY)
        const y2 = yOf(n.wakeY)
        const isHovered = hovered?.day === n.day
        return (
          <g key={i}>
            {isHovered && (
              <>
                <circle cx={cx} cy={y1} r={9} fill="none" stroke={colorBedDot} strokeWidth={1.5} opacity={0.45} />
                <circle cx={cx} cy={y2} r={9} fill="none" stroke={colorWakeDot} strokeWidth={1.5} opacity={0.45} />
              </>
            )}
            <circle cx={cx} cy={y1} r={isHovered ? 6 : 5} fill={colorBedDot} />
            <circle cx={cx} cy={y2} r={isHovered ? 6 : 5} fill={colorWakeDot} />
          </g>
        )
      })}

      {/* Transparent capture layer (on top) drives the hover / touch readout */}
      <rect
        data-sleep-capture="1"
        x={px} y={py} width={pw} height={ph}
        fill="rgba(0,0,0,0)"
        style={{ pointerEvents: 'all', cursor: 'crosshair' }}
        onMouseMove={(e) => emit(e.clientX, e.currentTarget)}
        onMouseLeave={() => onHover(null)}
        onTouchStart={(e) => { const t = e.touches[0]; if (t) emit(t.clientX, e.currentTarget) }}
        onTouchMove={(e) => { const t = e.touches[0]; if (t) emit(t.clientX, e.currentTarget) }}
      />
    </g>
  )
}

/* ── Component ──────────────────────────────────────────── */

interface SleepScatterChartProps {
  rangeEvents: CalendarEvent[]
  /** 外部控制的锚点日期（来自 URL date 参数），提供后组件锚点由此驱动 */
  anchorDate?: Date
  /** 外部受控的视图模式 */
  viewMode: SleepViewMode
  /** 视图模式切换回调 */
  onViewModeChange: (mode: SleepViewMode) => void
}

export function SleepScatterChart({ rangeEvents, anchorDate: anchorDateProp, viewMode, onViewModeChange: _ovmc }: SleepScatterChartProps) {
  void _ovmc
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 720
  // Memoized so the sleepEvents → allNights → viewNights chain keeps a stable
  // identity across renders (a bare Date.now() recomputes every render and churns it).
  const cutoff = useMemo(() => Date.now() - 365 * 86_400_000, [])

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

  const [anchorDate, setAnchorDate] = useState(() => anchorDateProp ?? (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })())

  // 外部 anchorDate 变化时同步内部状态
  useEffect(() => {
    if (anchorDateProp !== undefined) setAnchorDate(anchorDateProp)
  }, [anchorDateProp])

  // Hover/tap readout (replaces recharts' <Tooltip>, which never fires here
  // because the chart registers no graphical series for it to attach to).
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const handleHover = useCallback((info: HoverInfo | null) => {
    setHover((prev) => {
      if (!prev && !info) return prev
      if (prev && info && prev.night.day === info.night.day) return prev
      return info
    })
  }, [])

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
  const crosshairColor = 'var(--accent)'

  /* ════════════════════════════════════════════════
     Step 8 — Render
     ════════════════════════════════════════════════ */

  const xTickFont = viewMode === 'month'
    ? { fontSize: 11, fontFamily: 'var(--font-mono)' }
    : { fontSize: 11, fontFamily: 'var(--font-ui)' }

  return (
    <div className="sleep-root">
      <style>{SLEEP_CSS}</style>
      <style>{`
        .sleep-chart-container .recharts-cartesian-axis-tick text {
          fill: var(--ink-2) !important;
        }
      `}</style>

      {/* ── Empty state ─────────────────────────────── */}
      {viewNights.length === 0 ? (
        <p className="sleep-empty">{'暂无睡眠数据'}</p>
      ) : (
        <>
          {/* ── Chart ─────────────────────────────── */}
          <div className="sleep-chart-container">
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={viewNights} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={true} syncWithTicks={true} />

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

                {/* Dots + average lines + hover crosshair (custom SVG overlay).
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
                  hoveredDay={hover?.night.day ?? null}
                  crosshairColor={crosshairColor}
                  onHover={handleHover}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Hover/tap readout — date + exact bed/wake/duration, to the minute */}
            {hover && (() => {
              const n = hover.night
              const tipLeft = Math.min(Math.max(hover.cx, hover.plotLeft + 82), hover.plotRight - 82)
              const dateLabel = viewMode === 'month'
                ? `${anchorDate.getMonth() + 1}月${n.day}日`
                : `第 ${n.day} 日`
              return (
                <div style={{
                  position: 'absolute',
                  left: tipLeft,
                  top: hover.plotTop + 4,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                  zIndex: 5,
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-s)',
                  padding: '8px 12px',
                  boxShadow: 'var(--shadow-tooltip)',
                  whiteSpace: 'nowrap',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{dateLabel}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: colorBedDot }} />
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}>就寝</span>
                    <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 500, marginLeft: 'auto', paddingLeft: 16 }}>{fmtHour(n.bedTime)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: colorWakeDot }} />
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}>起床</span>
                    <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 500, marginLeft: 'auto', paddingLeft: 16 }}>{fmtHour(n.wakeTime)}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}>时长</span>
                    <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 500, marginLeft: 'auto', paddingLeft: 16 }}>{fmtDuration(n.duration)}</span>
                  </div>
                </div>
              )
            })()}
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
                <div className="sleep-stat-detail">{viewMode === 'month' ? '月' : viewMode === 'quarter' ? '季' : '年'}</div>
              </div>
            </div>
          )}

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
  .sleep-stat-value {
    font-size: 22px;
  }
  .sleep-stat {
    padding: 18px 14px;
  }
}
`
