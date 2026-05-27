import { useMemo, useState, startTransition, memo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Customized } from 'recharts'
import type { CalendarEvent } from '@/domain/event'
import { computeNapStats } from '@/domain/napStats'

/* ── Types ─────────────────────────────────────────────────── */

interface SleepNight {
  day: number
  label: string
  bedTime: number   // hour of day (0-24)
  wakeTime: number  // hour of day (0-24)
  duration: number
}

interface RawNight {
  nightKey: number  // local midnight epoch ms
  bedTime: number
  wakeTime: number
  duration: number
  day: number       // day of month (1-31)
  dayOfYear: number // 1-366
}

type SleepViewMode = 'month' | 'quarter' | 'year'

/* ── Helpers ────────────────────────────────────────────────── */

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

function monthLabel(date: Date, short: boolean): string {
  if (true) return `${date.getMonth() + 1}月`
  return date.toLocaleDateString('en-US', { month: short ? 'short' : 'long' })
}

function viewLabel(vm: SleepViewMode, anchor: Date): string {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  {
    switch (vm) {
      case 'month':   return `${y} 年 ${m + 1} 月`
      case 'quarter': return `${m + 1}月-${m + 4}月`
      case 'year':    return `${y} 年`
    }
  }
  switch (vm) {
    case 'month':
      return anchor.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    case 'quarter': {
      const end = new Date(y, m + 3, 1)
      return `${anchor.toLocaleDateString('en-US', { month: 'short' })}-${end.toLocaleDateString('en-US', { month: 'short' })} ${y}`
    }
    case 'year':
      return String(y)
  }
}

function viewDesc(vm: SleepViewMode): string {
  switch (vm) {
    case 'month':   return '就寝与起床时间'
    case 'quarter': return '季度睡眠模式'
    case 'year':    return '全年睡眠模式'
  }
}

/* ── Vertical sleep bands (SVG overlay) ────────────────────── */

const SleepBands = memo(function SleepBands({ formattedGraphicalItems }: any) {
  if (!formattedGraphicalItems) return null
  const bed = formattedGraphicalItems.find((i: any) => i.props?.dataKey === 'bedTime')
  const wake = formattedGraphicalItems.find((i: any) => i.props?.dataKey === 'wakeTime')
  if (!bed?.props?.points?.length || !wake?.props?.points?.length) return null

  return (
    <g>
      {bed.props.points.map((pt: any, i: number) => {
        const wp = wake.props.points[i]
        if (!wp) return null
        return (
          <line
            key={i}
            x1={pt.x} y1={pt.y}
            x2={wp.x} y2={wp.y}
            stroke="var(--event-accent-fill)"
            strokeWidth={1.5} strokeOpacity={0.15}
          />
        )
      })}
    </g>
  )
})

/* ── Component ──────────────────────────────────────────────── */

interface SleepScatterChartProps {
  rangeEvents: CalendarEvent[]
}

export function SleepScatterChart({ rangeEvents }: SleepScatterChartProps) {
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 720

  const cutoff = Date.now() - 365 * 86_400_000

  /* ════════════════════════════════════════════════════════════
     Step 1 — 原始睡眠事件（一次性筛选，不建 Date）
     ════════════════════════════════════════════════════════════ */

  /** 只统计主睡眠：排除小睡和失眠 */
  const sleepEvents = useMemo(() => {
    return rangeEvents.filter(
      (e) => e.categoryId === 'stone'
           && e.endTime - e.startTime >= 3 * 3_600_000
           && e.startTime > cutoff
           && !(e.typedData?.type === 'sleep'
             && (e.typedData.sleepType === 'nap' || e.typedData.sleepType === 'insomnia')),
    )
  }, [rangeEvents, cutoff])

  /* ════════════════════════════════════════════════════════════
     Step 2 — 预计算所有夜晚（只在 sleepEvents 变化时重算）
               每个事件只建一次 Date，存入 RawNight
     ════════════════════════════════════════════════════════════ */

  const allNights = useMemo(() => {
    const byNight = new Map<number, RawNight>()

    for (const ev of sleepEvents) {
      const d = new Date(ev.startTime)
      const year = d.getFullYear()
      const month = d.getMonth()
      const day = d.getDate()

      const nightKey = new Date(year, month, day).getTime()
      const prev = byNight.get(nightKey)

      // 同夜只保留最长的一条
      if (prev && ev.endTime - ev.startTime <= prev.duration * 3_600_000) continue

      const bedTime = d.getHours() + d.getMinutes() / 60

      const wd = new Date(ev.endTime)
      const wakeTime = wd.getHours() + wd.getMinutes() / 60
      const duration = wakeTime > bedTime ? wakeTime - bedTime : wakeTime + 24 - bedTime

      if (duration < 3) continue

      // 年内第几天
      const startOfYear = new Date(year, 0, 1).getTime()
      const dayOfYear = Math.floor((nightKey - startOfYear) / 86_400_000) + 1

      byNight.set(nightKey, { nightKey, bedTime, wakeTime, duration, day, dayOfYear })
    }

    return Array.from(byNight.values()).sort((a, b) => a.nightKey - b.nightKey)
  }, [sleepEvents])

  /* ════════════════════════════════════════════════════════════
     Step 3 — 视图状态
     ════════════════════════════════════════════════════════════ */

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

  /* ════════════════════════════════════════════════════════════
     Step 4 — 视图窗口（轻量计算，无循环）
     ════════════════════════════════════════════════════════════ */

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

  /* ════════════════════════════════════════════════════════════
     Step 5 — 刻度（每月一次计算）
     ════════════════════════════════════════════════════════════ */

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
        ticks.push({ value: offset, label: m < months ? monthLabel(ms, true) : '' })
      }
    }
    return ticks
  }, [viewMode, viewWindow, anchorDate])

  /* ════════════════════════════════════════════════════════════
     Step 6 — 按视图筛选（filter + map，不建 Date）
     ════════════════════════════════════════════════════════════ */

  const viewNights = useMemo(() => {
    const startTs = viewWindow.start.getTime()
    const endTs = viewWindow.end.getTime()

    const result: SleepNight[] = []
    for (const n of allNights) {
      if (n.nightKey < startTs || n.nightKey >= endTs) continue

      let day: number
      if (viewMode === 'month') {
        day = n.day
      } else if (viewMode === 'year') {
        day = n.dayOfYear
      } else {
        day = Math.floor((n.nightKey - startTs) / 86_400_000) + 1
      }

      result.push({
        day,
        label: String(day),
        bedTime: n.bedTime,
        wakeTime: n.wakeTime,
        duration: n.duration,
      })
    }
    return result
  }, [allNights, viewWindow, viewMode])

  /* ════════════════════════════════════════════════════════════
     Step 7 — 统计
     ════════════════════════════════════════════════════════════ */

  const stats = useMemo(() => {
    const n = viewNights.length
    if (n === 0) return null
    const avgDuration = viewNights.reduce((s, d) => s + d.duration, 0) / n
    const avgBed = viewNights.reduce((s, d) => s + d.bedTime, 0) / n
    const avgWake = viewNights.reduce((s, d) => s + d.wakeTime, 0) / n
    return { n, avgDuration, avgBed, avgWake }
  }, [viewNights])

  // ════════════════════════════════════════════════════════════
  // 小睡统计（与视图窗口对齐）
  // ════════════════════════════════════════════════════════════

  const napStats = useMemo(
    () => computeNapStats(rangeEvents, { start: viewWindow.start.getTime(), end: viewWindow.end.getTime() }),
    [rangeEvents, viewWindow],
  )

  /* ── Colors ────────────────────────────────── */

  const colorBed = 'var(--event-accent-fill)'
  const colorWake = 'var(--event-sky-fill)'

  /* ════════════════════════════════════════════════════════════
     Step 8 — Render
     ════════════════════════════════════════════════════════════ */

  const label = viewLabel(viewMode, anchorDate)
  const desc = viewDesc(viewMode)

  // X-axis props (split to avoid conditional hooks)
  const xTickFont = viewMode === 'month'
    ? { fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }
    : { fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: "'Noto Sans SC', sans-serif" }

  return (
    <div className="sleep-root">
      <style>{SLEEP_CSS}</style>

      {/* ── Title area (matches trend chart style) ───────── */}
      <div className={`sleep-title-area${isCompact ? ' sleep-title-compact' : ''}`}>
        <div className="sleep-title-left">
          <div className="sleep-title-row">
            <button onClick={goPrev} className="sleep-title-arrow" title={'上一周期'}>‹</button>
            <span className="sleep-title-main">{label}</span>
            <button onClick={goNext} className="sleep-title-arrow" title={'下一周期'}>›</button>

            {/* View mode pills */}
            <div className="sleep-title-periods">
              {(['month', 'quarter', 'year'] as SleepViewMode[]).map((vm) => (
                <button
                  key={vm}
                  onClick={() => changeViewMode(vm)}
                  className={`sleep-title-period${viewMode === vm ? ' sleep-title-period-active' : ''}`}
                >
                  {vm === 'month' ? '月'
                   : vm === 'quarter' ? '季'
                   : '年'}
                </button>
              ))}
            </div>
          </div>
          <p className="sleep-title-desc">{desc}</p>
        </div>
      </div>

      {/* ── Empty state ──────────────────────────────── */}
      {viewNights.length === 0 ? (
        <p className="sleep-empty">{'暂无睡眠数据'}</p>
      ) : (
        <>
          {/* ── Chart ─────────────────────────────────── */}
          <div className="sleep-chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={viewNights} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
                  tick={xTickFont}
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
                    const bed = payload.find((p) => p.name === 'bed')
                    const wake = payload.find((p) => p.name === 'wake')
                    const raw = payload[0]?.payload as Record<string, any> | undefined
                    return (
                      <div className="sleep-tooltip">
                        <div className="sleep-tooltip-date">
                          {'第 '}{raw?.day ?? ''}{' 日'}
                        </div>
                        {bed && (
                          <div className="sleep-tooltip-row">
                            <span className="sleep-tooltip-dot" style={{ background: colorBed }} />
                            <span className="sleep-tooltip-label">{'就寝'}</span>
                            <span className="sleep-tooltip-val">{fmtHour(bed.value as number)}</span>
                          </div>
                        )}
                        {wake && (
                          <div className="sleep-tooltip-row">
                            <span className="sleep-tooltip-dot" style={{ background: colorWake }} />
                            <span className="sleep-tooltip-label">{'起床'}</span>
                            <span className="sleep-tooltip-val">{fmtHour(wake.value as number)}</span>
                          </div>
                        )}
                        {bed && wake && (
                          <>
                            <div className="sleep-tooltip-divider" />
                            <div className="sleep-tooltip-row">
                              <span className="sleep-tooltip-label">{'时长'}</span>
                              <span className="sleep-tooltip-val">
                                {fmtDuration(
                                  (wake.value as number) > (bed.value as number)
                                    ? (wake.value as number) - (bed.value as number)
                                    : (wake.value as number) + 24 - (bed.value as number),
                                )}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  }}
                />

                {/* Sleep bands */}
                <Customized component={SleepBands} />

                {/* Bedtime dots */}
                <Line
                  type="linear"
                  dataKey="bedTime"
                  stroke="transparent"
                  dot={{ r: 3.5, fill: colorBed, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: colorBed, strokeWidth: 0 }}
                  connectNulls={false}
                  isAnimationActive={false}
                  name="bed"
                />

                {/* Wake-up dots */}
                <Line
                  type="linear"
                  dataKey="wakeTime"
                  stroke="transparent"
                  dot={{ r: 3.5, fill: colorWake, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: colorWake, strokeWidth: 0 }}
                  connectNulls={false}
                  isAnimationActive={false}
                  name="wake"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Legend ──────────────────────────────────── */}
          <div className="sleep-legend">
            <span className="sleep-legend-item">
              <span className="sleep-legend-dot" style={{ background: colorBed }} />
              {'就寝'}
            </span>
            <span className="sleep-legend-item">
              <span className="sleep-legend-dot" style={{ background: colorWake }} />
              {'起床'}
            </span>
            <span className="sleep-legend-note">
              {'每天一个点'}
            </span>
          </div>

          {/* ── Stats bar ──────────────────────────────── */}
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

          {/* ── 小睡统计 ──────────────────────────── */}
          {napStats.totalNaps > 0 && (
            <NapStatsPanel stats={napStats} />
          )}
        </>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   小睡统计面板
   ════════════════════════════════════════════════════════════ */

function NapStatsPanel({
  stats,
}: {
  stats: import('@/domain/napStats').NapStats
}) {
  const maxHourCount = Math.max(...stats.hourDistribution, 1)
  const hourLabels = ['0', '', '2', '', '4', '', '6', '', '8', '', '10', '',
    '12', '', '14', '', '16', '', '18', '', '20', '', '22', '']

  return (
    <div className="mt-10 pt-6 border-t border-border-subtle">
      <h3 className="font-serif text-sm font-medium text-text-primary mb-4">
        {'小睡统计'}
      </h3>

      {/* 概览行 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-raised border border-border-default rounded-xl p-4 text-center">
          <div className="font-mono text-xl font-semibold text-text-primary">
            {stats.totalNaps}
          </div>
          <div className="font-sans text-xs text-text-tertiary mt-1">
            {'小睡次数'}
          </div>
        </div>
        <div className="bg-surface-raised border border-border-default rounded-xl p-4 text-center">
          <div className="font-mono text-xl font-semibold text-text-primary">
            {stats.avgDurationMinutes}
            <span className="text-sm text-text-tertiary ml-1">
              {'分'}
            </span>
          </div>
          <div className="font-sans text-xs text-text-tertiary mt-1">
            {'平均时长'}
          </div>
        </div>
        <div className="bg-surface-raised border border-border-default rounded-xl p-4 text-center">
          <div className="font-mono text-xl font-semibold text-text-primary">
            {stats.medianDurationMinutes}
            <span className="text-sm text-text-tertiary ml-1">
              {'分'}
            </span>
          </div>
          <div className="font-sans text-xs text-text-tertiary mt-1">
            {'中位时长'}
          </div>
        </div>
      </div>

      {/* 小睡时间分布 */}
      <div className="flex flex-col gap-1.5">
        <span className="font-sans text-xs text-text-tertiary">
          {'小睡时间分布'}
        </span>
        <div className="flex items-end gap-0.5 h-20">
          {stats.hourDistribution.map((count, hour) => {
            const height = (count / maxHourCount) * 100
            return (
              <div
                key={hour}
                className="flex-1 flex flex-col items-center justify-end"
                title={`${hour}:00 — ${count} ${'次'}`}
              >
                <span className="font-mono text-[9px] text-text-tertiary tabular-nums leading-none mb-0.5">
                  {count > 0 ? count : ''}
                </span>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(height, count > 0 ? 4 : 1)}%`,
                    backgroundColor: 'var(--event-stone-text)',
                    opacity: 0.3 + 0.5 * (count / maxHourCount),
                  }}
                />
              </div>
            )
          })}
        </div>
        {/* X 轴标签 */}
        <div className="flex gap-0.5">
          {hourLabels.map((label, i) => (
            <div
              key={i}
              className="flex-1 text-center font-sans text-[8px] text-text-tertiary"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Scoped CSS (matches trend chart style) ─────────────────── */

const SLEEP_CSS = `
.sleep-root {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Noto Sans SC', sans-serif;
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
  font-family: 'Noto Sans SC', sans-serif;
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
  font-family: 'Noto Sans SC', sans-serif;
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
.sleep-legend-note {
  margin-left: auto;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  opacity: 0.65;
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
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
}

/* ── Tooltip ─────────────────────────────── */
.sleep-tooltip {
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
.sleep-tooltip-date {
  font-weight: 500;
  margin-bottom: 6px;
  font-size: 11px;
  opacity: 0.85;
}
.sleep-tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.sleep-tooltip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sleep-tooltip-label {
  opacity: 0.75;
  margin-right: 4px;
}
.sleep-tooltip-val {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  margin-left: auto;
}
.sleep-tooltip-divider {
  height: 1px;
  background: rgba(255,255,255,0.15);
  margin: 5px 0;
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