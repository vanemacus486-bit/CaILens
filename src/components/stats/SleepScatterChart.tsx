import { useMemo } from 'react'
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { getDayStart, formatMonthDay } from '@/domain/time'
import type { CalendarEvent } from '@/domain/event'

/* ---------- helpers ---------- */

interface SleepNight {
  date: number
  label: string
  bedHours: number   // hours from midnight of the night's calendar date
  wakeHours: number  // hours from midnight, adjusted +24h when wake is next-day
}

function fmtHour(h: number): string {
  const hr = Math.floor(h % 24)
  const mi = Math.round((h - Math.floor(h)) * 60)
  return `${String(hr).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

/* ---------- component ---------- */

interface SleepScatterChartProps {
  rangeEvents: CalendarEvent[]
  language: 'zh' | 'en'
}

export function SleepScatterChart({ rangeEvents, language }: SleepScatterChartProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  /* ---- data preparation ---- */

  const nights = useMemo(() => {
    const cutoff = Date.now() - 180 * 86_400_000

    const sleeps = rangeEvents.filter(
      (e) => e.categoryId === 'stone' && e.endTime - e.startTime >= 3 * 3_600_000 && e.endTime > cutoff,
    )

    // one event per night (by bedtime date), longest wins
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

      // wake-up on the next calendar day → add 24 so it sits above bedtime visually
      if (wakeH < bedH) wakeH += 24

      // sanity: bed should be roughly evening/midnight (18:00–06:00), wake roughly morning (04:00–14:00 local)
      if (bedH < 18 && wakeH - (wakeH >= 24 ? 24 : 0) > 14) continue
      // skip very short outlier sleeps caught by the 3h filter but still odd
      if (wakeH - bedH < 3) continue

      result.push({ date: nightDate, label: formatMonthDay(new Date(nightDate)), bedHours: bedH, wakeHours: wakeH })
    }

    return result.sort((a, b) => a.date - b.date)
  }, [rangeEvents])

  /* ---- linear regression ---- */

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

  /* ---- chart data ---- */

  const chartData = useMemo(() => {
    if (!trend) return nights
    return nights.map((d, i) => ({
      ...d,
      bedTrend: +(trend.bed.slope * i + trend.bed.intercept).toFixed(2),
      wakeTrend: +(trend.wake.slope * i + trend.wake.intercept).toFixed(2),
    }))
  }, [nights, trend])

  /* ---- empty state ---- */

  if (chartData.length === 0) {
    return (
      <section className="pt-10 pb-6">
        <h3 className="font-serif text-lg text-text-primary font-semibold mb-3 tracking-tight">
          {t('睡眠节律', 'Sleep Rhythm')}
        </h3>
        <p className="font-serif text-sm text-text-tertiary italic">{t('暂无睡眠数据', 'No sleep data yet')}</p>
      </section>
    )
  }

  /* ---- tooltip ---- */

  const SleepTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) => {
    if (!active || !payload?.length || !label) return null
    return (
      <div className="bg-surface-sunken border border-border-default px-3.5 py-2.5 shadow-tooltip">
        <div className="text-body-xs text-text-tertiary italic mb-1.5">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-0.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: p.name === t('就寝', 'Bed') ? 'var(--event-stone-fill)' : 'var(--event-stone-text)' }}
            />
            <span className="text-xs text-text-secondary font-sans">{p.name}</span>
            <span className="text-body-sm text-text-primary font-mono font-semibold ml-auto pl-4">
              {fmtHour(p.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  /* ---- reference lines (annotations) ---- */

  const midnightLabel = language === 'zh' ? '午夜' : 'Midnight'

  return (
    <section className="pt-10 pb-6">
      <h3 className="font-serif text-lg text-text-primary font-semibold mb-1 tracking-tight">
        {t('睡眠节律', 'Sleep Rhythm')}
      </h3>
      <p className="font-serif text-body-sm text-text-tertiary italic mb-5">
        {t('过去 180 天的就寝与起床时间', 'Bedtime & wake-up time over the last 180 days')}
      </p>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[18, 36]}
            tickFormatter={(v: number) => fmtHour(v)}
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            tickLine={false}
            axisLine={false}
            width={48}
            ticks={[18, 20, 22, 24, 26, 28, 30, 32, 34, 36]}
          />

          <Tooltip content={<SleepTooltip />} />

          {/* Reference lines */}
          <ReferenceLine y={24} stroke="var(--border-subtle)" strokeDasharray="2 2" label={{ value: midnightLabel, position: 'insideTopLeft', fontSize: 10, fill: 'var(--text-tertiary)' }} />

          {/* Trend lines */}
          {trend && (
            <>
              <Line type="linear" dataKey="bedTrend" stroke="var(--event-stone-fill)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line type="linear" dataKey="wakeTrend" stroke="var(--event-stone-text)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </>
          )}

          {/* Scatter dots via transparent lines */}
          <Line
            type="linear"
            dataKey="bedHours"
            stroke="transparent"
            dot={{ r: 3, fill: 'var(--event-stone-fill)', strokeWidth: 0 }}
            activeDot={false}
            connectNulls={false}
            name={t('就寝', 'Bed')}
          />
          <Line
            type="linear"
            dataKey="wakeHours"
            stroke="transparent"
            dot={{ r: 3, fill: 'var(--event-stone-text)', strokeWidth: 0 }}
            activeDot={false}
            connectNulls={false}
            name={t('起床', 'Wake')}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 text-xs text-text-tertiary font-sans">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--event-stone-fill)]" />
          {t('就寝', 'Bed')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--event-stone-text)]" />
          {t('起床', 'Wake')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0 border-t border-dashed border-[var(--event-stone-fill)]" />
          {t('趋势', 'Trend')}
        </span>
      </div>
    </section>
  )
}
