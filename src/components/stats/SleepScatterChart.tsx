import { useMemo, useState } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { getDayStart, formatMonthDay } from '@/domain/time'
import type { CalendarEvent } from '@/domain/event'

/* ── Types ─────────────────────────────────────────────────── */

interface SleepNight {
  date: number
  label: string
  dow: number           // 0=Mon … 6=Sun
  bedHours: number      // hours from midnight (18–24 evening, 24–36 next-day morning)
  wakeHours: number     // hours from midnight, +24 when next-day
  duration: number      // wakeHours - bedHours
  isRecent: boolean     // within last 7 days
}

type ViewMode = 'all' | 'weekday' | 'weekend'

/* ── Helpers ────────────────────────────────────────────────── */

function fmtHour(h: number): string {
  const hr = Math.floor(h % 24)
  const mi = Math.round((h - Math.floor(h)) * 60)
  return `${String(hr).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

function fmtDuration(h: number): string {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m`
}

function fmtMeanTime(h: number): string {
  // Average of circular time values — wrap display correctly
  return fmtHour(h < 18 ? h + 24 : h)
}

const MODE_KEY = 'cailens-sleep-mode'

function loadMode(): ViewMode {
  try {
    const v = localStorage.getItem(MODE_KEY) as ViewMode | null
    if (v && ['all', 'weekday', 'weekend'].includes(v)) return v
  } catch { /* ignore */ }
  return 'all'
}

function saveMode(m: ViewMode) {
  try { localStorage.setItem(MODE_KEY, m) } catch { /* ignore */ }
}

/* ── Component ──────────────────────────────────────────────── */

interface SleepRhythmChartProps {
  rangeEvents: CalendarEvent[]
  language: 'zh' | 'en'
}

export function SleepScatterChart({ rangeEvents, language }: SleepRhythmChartProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const [viewMode, setViewMode] = useState<ViewMode>(loadMode)

  const isCompact = typeof window !== 'undefined' && window.innerWidth < 720

  /* ── Data preparation ─────────────────────────── */

  const allNights = useMemo(() => {
    const cutoff = Date.now() - 180 * 86_400_000
    const now = Date.now()

    const sleeps = rangeEvents.filter(
      (e) => e.categoryId === 'stone' && e.endTime - e.startTime >= 3 * 3_600_000 && e.endTime > cutoff,
    )

    // One event per night (by bedtime date), longest wins
    const byNight = new Map<number, CalendarEvent>()
    for (const e of sleeps) {
      const key = getDayStart(new Date(e.startTime))
      const prev = byNight.get(key)
      if (!prev || e.endTime - e.startTime > prev.endTime - prev.startTime) byNight.set(key, e)
    }

    const result: SleepNight[] = []

    for (const [nightDate, ev] of byNight) {
      const bedMs = ev.startTime - nightDate
      const wakeMs = ev.endTime - nightDate
      let bedH = bedMs / 3_600_000
      let wakeH = wakeMs / 3_600_000

      if (wakeH < bedH) wakeH += 24

      // Sanity filter
      if (bedH < 18 && wakeH - (wakeH >= 24 ? 24 : 0) > 14) continue
      if (wakeH - bedH < 3) continue

      const nightDateObj = new Date(nightDate)
      result.push({
        date: nightDate,
        label: formatMonthDay(nightDateObj),
        dow: (nightDateObj.getDay() + 6) % 7, // 0=Mon
        bedHours: bedH,
        wakeHours: wakeH,
        duration: wakeH - bedH,
        isRecent: nightDate > now - 7 * 86_400_000,
      })
    }

    return result.sort((a, b) => a.date - b.date)
  }, [rangeEvents])

  /* ── Filter by view mode ──────────────────────── */

  const nights = useMemo(() => {
    if (viewMode === 'all') return allNights
    // Weekend: Fri(4), Sat(5), Sun(6); Weekday: Mon(0)–Thu(3)
    const isWeekend = (dow: number) => dow >= 4
    return allNights.filter((n) => viewMode === 'weekend' ? isWeekend(n.dow) : !isWeekend(n.dow))
  }, [allNights, viewMode])

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    saveMode(mode)
  }

  /* ── Linear regression ────────────────────────── */

  const trend = useMemo(() => {
    const n = nights.length
    if (n < 3) return null

    const fn = (data: { x: number; y: number }[]) => {
      const len = data.length
      const sx = data.reduce((s, d) => s + d.x, 0)
      const sy = data.reduce((s, d) => s + d.y, 0)
      const sxy = data.reduce((s, d) => s + d.x * d.y, 0)
      const sxx = data.reduce((s, d) => s + d.x * d.x, 0)
      const slope = (len * sxy - sx * sy) / (len * sxx - sx * sx)
      return { slope, intercept: (sy - slope * sx) / len }
    }

    return {
      bed: fn(nights.map((d, i) => ({ x: i, y: d.bedHours }))),
      wake: fn(nights.map((d, i) => ({ x: i, y: d.wakeHours }))),
    }
  }, [nights])

  const chartData = useMemo(() => {
    if (!trend) return nights
    return nights.map((d, i) => ({
      ...d,
      bedTrend: +(trend.bed.slope * i + trend.bed.intercept).toFixed(2),
      wakeTrend: +(trend.wake.slope * i + trend.wake.intercept).toFixed(2),
    }))
  }, [nights, trend])

  /* ── Summary stats ────────────────────────────── */

  const stats = useMemo(() => {
    const n = nights.length
    if (n === 0) return null

    const avgDuration = nights.reduce((s, d) => s + d.duration, 0) / n
    const avgBed = nights.reduce((s, d) => s + d.bedHours, 0) / n
    const avgWake = nights.reduce((s, d) => s + d.wakeHours, 0) / n

    // Consistency = inverted std dev of sleep midpoint
    const midpoints = nights.map((d) => (d.bedHours + d.wakeHours) / 2)
    const avgMid = midpoints.reduce((s, m) => s + m, 0) / n
    const variance = midpoints.reduce((s, m) => s + (m - avgMid) ** 2, 0) / n
    const stdDev = Math.sqrt(variance)
    const consistency = Math.max(0, Math.min(100, Math.round(100 - (stdDev / 3) * 100)))

    // Duration stats
    const maxDur = Math.max(...nights.map((d) => d.duration))
    const minDur = Math.min(...nights.map((d) => d.duration))

    // Recent trend (last 7 vs previous 7)
    const recent = nights.filter((d) => d.isRecent)
    const prev = nights.filter((d) => !d.isRecent).slice(-7)
    const durDelta = recent.length >= 2 && prev.length >= 2
      ? (recent.reduce((s, d) => s + d.duration, 0) / recent.length) - (prev.reduce((s, d) => s + d.duration, 0) / prev.length)
      : null

    return { n, avgDuration, avgBed, avgWake, consistency, maxDur, minDur, durDelta }
  }, [nights])

  /* ── Empty state ──────────────────────────────── */

  if (chartData.length === 0) {
    return (
      <div className="sleep-rhythm-root" style={{ paddingTop: 40 }}>
        <style>{SLEEP_CSS}</style>
        <h3 className="sleep-title" style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 24, fontWeight: 600, color: 'var(--heatmap-ink-1)', marginBottom: 16 }}>
          {t('睡眠节律', 'Sleep Rhythm')}
        </h3>
        <p className="sleep-empty" style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 14, color: 'var(--heatmap-ink-3)', fontStyle: 'italic' }}>
          {t('暂无睡眠数据', 'No sleep data yet')}
        </p>
      </div>
    )
  }

  /* ── Insight text ─────────────────────────────── */

  const insightText = useMemo(() => {
    if (!stats || stats.n < 3) return null

    if (stats.consistency >= 80) {
      return t(
        '你的睡眠节律非常规律，保持在稳定的生物钟轨道上。',
        'Your sleep rhythm is remarkably consistent — a well-tuned circadian clock.',
      )
    }
    if (stats.durDelta !== null && stats.durDelta > 0.5) {
      const mins = Math.round(stats.durDelta * 60)
      return t(
        `最近一周睡眠时长增加了 ${mins} 分钟，趋势向好。`,
        `Your sleep duration has increased by ${mins} min in the past week — heading in the right direction.`,
      )
    }
    if (stats.durDelta !== null && stats.durDelta < -0.5) {
      const mins = Math.round(Math.abs(stats.durDelta * 60))
      return t(
        `最近一周睡眠时长减少了 ${mins} 分钟，留意节奏。`,
        `Your sleep duration has decreased by ${mins} min in the past week — keep an eye on it.`,
      )
    }

    const avgH = Math.floor(stats.avgDuration)
    const avgM = Math.round((stats.avgDuration - avgH) * 60)
    if (avgH >= 7) {
      return t(
        `平均睡眠 ${avgH} 小时 ${avgM} 分钟，达到推荐标准。`,
        `Average sleep ${avgH}h ${avgM}m — within the recommended range.`,
      )
    }
    return t(
      `平均睡眠 ${avgH} 小时 ${avgM} 分钟，可以考虑增加休息时间。`,
      `Average sleep ${avgH}h ${avgM}m — consider allowing more rest.`,
    )
  }, [stats, t])

  /* ── Colors ───────────────────────────────────── */

  const colorBed = 'var(--event-accent-fill)'    // warm amber
  const colorWake = 'var(--event-sky-fill)'       // cool steel

  /* ── Render ──────────────────────────────────── */

  return (
    <div className="sleep-rhythm-root">
      <style>{SLEEP_CSS}</style>

      {/* ── Title area ─────────────────────────────────── */}
      <div className={`sleep-title-area${isCompact ? ' sleep-title-compact' : ''}`}>
        <div className="sleep-title-left">
          <div className="sleep-title-row">
            <span className="sleep-title-main">
              {t('睡眠节律', 'Sleep Rhythm')}
            </span>
          </div>
          <p className="sleep-title-desc">
            {t('过去 180 天的就寝与起床模式', 'Bedtime & wake patterns over the last 180 days')}
          </p>
        </div>

        {/* View mode pills */}
        <div className="sleep-pills">
          {([
            { key: 'all' as ViewMode, label: t('全 部', 'All') },
            { key: 'weekday' as ViewMode, label: t('工作日', 'Weekday') },
            { key: 'weekend' as ViewMode, label: t('周 末', 'Weekend') },
          ]).map((m) => (
            <button
              key={m.key}
              onClick={() => handleModeChange(m.key)}
              className={`sleep-pill${viewMode === m.key ? ' sleep-pill-active' : ''}`}
              style={
                viewMode === m.key
                  ? { backgroundColor: colorBed, color: '#F1EADB' }
                  : undefined
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart ───────────────────────────────────────── */}
      <div className="sleep-chart-container">
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              interval="preserveStartEnd"
            />

            <YAxis
              domain={[18, 36]}
              tickFormatter={(v: number) => fmtHour(v)}
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}
              tickLine={false}
              axisLine={false}
              width={52}
              ticks={[18, 21, 24, 27, 30, 33, 36]}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length || !label) return null
                const bedEntry = payload.find((p) => p.name === 'bed')
                const wakeEntry = payload.find((p) => p.name === 'wake')
                const durEntry = payload.find((p) => p.name === 'dur')
                return (
                  <div className="sleep-tooltip">
                    <div className="sleep-tooltip-date">{label}</div>
                    {bedEntry && (
                      <div className="sleep-tooltip-row">
                        <span className="sleep-tooltip-dot" style={{ background: colorBed }} />
                        <span className="sleep-tooltip-label">{t('就寝', 'Bed')}</span>
                        <span className="sleep-tooltip-val">{fmtHour(bedEntry.value as number)}</span>
                      </div>
                    )}
                    {wakeEntry && (
                      <div className="sleep-tooltip-row">
                        <span className="sleep-tooltip-dot" style={{ background: colorWake }} />
                        <span className="sleep-tooltip-label">{t('起床', 'Wake')}</span>
                        <span className="sleep-tooltip-val">{fmtHour(wakeEntry.value as number)}</span>
                      </div>
                    )}
                    {durEntry && (
                      <div className="sleep-tooltip-divider" />
                    )}
                    {durEntry && (
                      <div className="sleep-tooltip-row">
                        <span className="sleep-tooltip-label">{t('时长', 'Duration')}</span>
                        <span className="sleep-tooltip-val">{fmtDuration(durEntry.value as number)}</span>
                      </div>
                    )}
                  </div>
                )
              }}
            />

            {/* Midnight reference */}
            <ReferenceLine
              y={24}
              stroke="var(--border-subtle)"
              strokeDasharray="2 2"
              label={{
                value: t('午夜', 'Midnight'),
                position: 'insideTopLeft',
                fontSize: 10,
                fill: 'var(--text-tertiary)',
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            />

            {/* Sleep bands — stacked Area creates filled band from bed up through duration */}
            <Area dataKey="bedHours" stackId="sleep" fill="transparent" stroke="none" />
            <Area
              dataKey="duration"
              stackId="sleep"
              fill={colorBed}
              fillOpacity={0.08}
              stroke="none"
              name="dur"
            />

            {/* Trend lines */}
            {trend && (
              <>
                <Line type="linear" dataKey="bedTrend" stroke={colorBed} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls={false} />
                <Line type="linear" dataKey="wakeTrend" stroke={colorWake} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls={false} />
              </>
            )}

            {/* Bedtime dots */}
            <Line
              type="linear"
              dataKey="bedHours"
              stroke="transparent"
              dot={{ r: 3.5, fill: colorBed, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: colorBed, strokeWidth: 0 }}
              connectNulls={false}
              name="bed"
            />

            {/* Wake-up dots */}
            <Line
              type="linear"
              dataKey="wakeHours"
              stroke="transparent"
              dot={{ r: 3.5, fill: colorWake, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: colorWake, strokeWidth: 0 }}
              connectNulls={false}
              name="wake"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend ────────────────────────────────────────── */}
      <div className="sleep-legend">
        <span className="sleep-legend-item">
          <span className="sleep-legend-dot" style={{ background: colorBed }} />
          {t('就寝', 'Bed')}
        </span>
        <span className="sleep-legend-item">
          <span className="sleep-legend-dot" style={{ background: colorWake }} />
          {t('起床', 'Wake')}
        </span>
        <span className="sleep-legend-item">
          <span className="sleep-legend-line" style={{ borderColor: colorBed }} />
          {t('趋势', 'Trend')}
        </span>
        <span className="sleep-legend-note">
          {viewMode === 'weekday'
            ? t('仅显示周一至周四', 'Mon–Thu only')
            : viewMode === 'weekend'
              ? t('仅显示周五至周日', 'Fri–Sun only')
              : t('每点 = 一晚', 'Each dot = one night')}
        </span>
      </div>

      {/* ── Stats bar ────────────────────────────────────── */}
      {stats && (
        <div className={`sleep-stats-bar${isCompact ? ' sleep-stats-compact' : ''}`}>
          <div className="sleep-stat">
            <div className="sleep-stat-label">{t('时 长', 'Duration')}</div>
            <div className="sleep-stat-value">
              {fmtDuration(stats.avgDuration)}
            </div>
            <div className="sleep-stat-detail">
              {stats.durDelta !== null
                ? (stats.durDelta >= 0
                    ? t(`较上周 +${Math.round(stats.durDelta * 60)} 分钟`, `+${Math.round(stats.durDelta * 60)}m vs last wk`)
                    : t(`较上周 ${Math.round(stats.durDelta * 60)} 分钟`, `${Math.round(stats.durDelta * 60)}m vs last wk`))
                : t('平 均', 'Average')}
            </div>
          </div>

          <div className="sleep-stat">
            <div className="sleep-stat-label">{t('就 寝', 'Bedtime')}</div>
            <div className="sleep-stat-value">
              {fmtMeanTime(stats.avgBed)}
            </div>
            <div className="sleep-stat-detail">
              {t('平均就寝时间', 'Avg bedtime')}
            </div>
          </div>

          <div className="sleep-stat">
            <div className="sleep-stat-label">{t('起 床', 'Wake-up')}</div>
            <div className="sleep-stat-value">
              {fmtMeanTime(stats.avgWake)}
            </div>
            <div className="sleep-stat-detail">
              {t('平均起床时间', 'Avg wake-up')}
            </div>
          </div>

          <div className="sleep-stat">
            <div className="sleep-stat-label">{t('规 律', 'Routine')}</div>
            <div className="sleep-stat-value">
              {stats.consistency}
              <span className="sleep-stat-unit">%</span>
            </div>
            <div className="sleep-stat-detail">
              {stats.consistency >= 80
                ? t('非常规律', 'Very consistent')
                : stats.consistency >= 50
                  ? t('较为规律', 'Moderately consistent')
                  : t('波动较大', 'Highly variable')}
            </div>
          </div>

          <div className="sleep-stat">
            <div className="sleep-stat-label">{t('天 数', 'Nights')}</div>
            <div className="sleep-stat-value">
              {stats.n}
              <span className="sleep-stat-unit">{t('晚', 'n')}</span>
            </div>
            <div className="sleep-stat-detail">
              {viewMode === 'weekday'
                ? t('180 天内的平日', 'Weekdays in 180d')
                : viewMode === 'weekend'
                  ? t('180 天内的周末', 'Weekends in 180d')
                  : t('180 天内', 'In 180 days')}
            </div>
          </div>
        </div>
      )}

      {/* ── Insight bar ──────────────────────────────────── */}
      {insightText && (
        <div className="sleep-insight">
          <div className="sleep-insight-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="0.8" />
              <path d="M7 4V8M7 9.5V10" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </div>
          <p className="sleep-insight-text">{insightText}</p>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="sleep-footer">
        <div className="sleep-footer-rule"><span>——</span></div>
        <p className="sleep-footer-quote">
          {t(
            '睡眠是灵魂的锚，在时间的河流中标记我们的节奏。',
            'Sleep is the soul\'s anchor, marking our rhythm in the river of time.',
          )}
        </p>
      </div>
    </div>
  )
}

/* ── Scoped CSS ──────────────────────────────────────────────── */

const SLEEP_CSS = `
.sleep-rhythm-root {
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
  align-items: baseline;
  gap: 12px;
}
.sleep-title-main {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
  letter-spacing: 0.02em;
}
.sleep-title-desc {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--heatmap-ink-3);
  margin: 0;
}

/* ── Mode pills ──────────────────────────── */
.sleep-pills {
  display: flex;
  gap: 6px;
  background: var(--heatmap-bg-card);
  border-radius: 999px;
  padding: 4px;
  flex-shrink: 0;
}
.sleep-pill {
  padding: 6px 16px;
  border-radius: 999px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-2);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.25s ease, color 0.25s ease;
  white-space: nowrap;
}
.sleep-pill:hover {
  color: var(--heatmap-ink-1);
}
.sleep-pill-active {
  font-weight: 600;
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
.sleep-legend-line {
  width: 20px;
  height: 0;
  border-top: 1.5px dashed;
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
  grid-template-columns: repeat(5, 1fr);
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

/* ── Insight bar ─────────────────────────── */
.sleep-insight {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 20px;
  padding: 12px 16px;
  background: var(--color-bg-info);
  border-radius: 8px;
}
.sleep-insight-icon {
  flex-shrink: 0;
  color: var(--color-text-info);
  margin-top: 1px;
}
.sleep-insight-text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 12px;
  color: var(--color-text-info);
  margin: 0;
  line-height: 1.5;
}

/* ── Footer ──────────────────────────────── */
.sleep-footer {
  text-align: center;
  margin-top: 48px;
}
.sleep-footer-rule {
  color: var(--heatmap-ink-3);
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  letter-spacing: 0.5em;
  margin-bottom: 20px;
}
.sleep-footer-quote {
  font-family: 'Noto Serif SC', serif;
  font-style: italic;
  font-size: 14px;
  color: var(--heatmap-ink-2);
  margin: 0;
}

/* ── Tooltip (Recharts override) ─────────── */
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

/* ── Responsive ──────────────────────────── */
@media (max-width: 719px) {
  .sleep-title-main {
    font-size: 22px;
  }
  .sleep-title-desc {
    font-size: 13px;
  }
  .sleep-pills {
    width: 100%;
  }
  .sleep-stat-value {
    font-size: 22px;
  }
  .sleep-stat {
    padding: 18px 14px;
  }
}
`