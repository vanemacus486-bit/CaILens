import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { computeTypeSplit } from '@/domain/stats'
import { LYUBISHCHEV_BENCHMARK } from '@/domain/projection'
import type { Bucket, Granularity } from '@/hooks/useStatsAggregation'
import { getDataMaturity } from '@/domain/maturity'
import { MaturityPlaceholder } from './MaturityPlaceholder'

/* ---------- helpers ---------- */

const PERIOD_MULT: Record<string, number> = {
  week: 52,
  month: 12,
}

function fmtBucketLabel(bucket: Bucket, periodType: Granularity, language: 'zh' | 'en'): string {
  const s = bucket.start
  if (periodType === 'week') {
    const y = s.getFullYear()
    const m = s.getMonth() + 1
    const d = s.getDate()
    return language === 'zh' ? `${y}/${m}/${d}` : `${m}/${d}`
  }
  if (periodType === 'month') {
    return language === 'zh' ? `${s.getFullYear()}年${s.getMonth() + 1}月` : `${s.getFullYear()}/${s.getMonth() + 1}`
  }
  return `${s.getFullYear()}`
}

/* ---------- tooltip ---------- */

function TypeTooltip({
  active,
  payload,
  label,
  language,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color?: string }>
  label?: string
  language: 'zh' | 'en'
}) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  if (!active || !payload?.length || !label) return null

  const typeI = payload.find((p) => p.name === 'typeI')
  const typeII = payload.find((p) => p.name === 'typeII')
  const total = (typeI?.value ?? 0) + (typeII?.value ?? 0)
  const pct = total > 0 ? Math.round(((typeI?.value ?? 0) / total) * 100) : 0

  return (
    <div className="bg-surface-sunken border border-border-default px-3.5 py-2.5 shadow-tooltip">
      <div className="text-body-xs text-text-tertiary italic mb-1.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-xs text-text-secondary font-sans">{p.name}</span>
          <span className="text-body-sm text-text-primary font-mono font-semibold ml-auto pl-4">
            {p.value.toFixed(1)}h
          </span>
        </div>
      ))}
      <div className="text-body-xs text-text-tertiary mt-1.5 pt-1.5 border-t border-border-subtle">
        {t('Type I 占比', 'Type I share')}: <span className="font-mono font-semibold">{pct}%</span>
      </div>
    </div>
  )
}

/* ---------- component ---------- */

interface TypeTrendChartProps {
  history: Bucket[]
  periodType: Granularity
  language: 'zh' | 'en'
  rangeEvents: import('@/domain/event').CalendarEvent[]
}

const TYPE_I_COLOR = 'var(--event-accent-fill)'
const TYPE_II_COLOR = 'var(--text-tertiary)'

export function TypeTrendChart({ history, periodType, language, rangeEvents }: TypeTrendChartProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  /* ---- maturity gate ---- */

  const maturity = useMemo(() => getDataMaturity(rangeEvents), [rangeEvents])
  if (maturity.maturityLevel === 'cold') {
    return (
      <section className="mt-12 pt-8" style={{ borderTop: '1px solid var(--heatmap-rule)' }}>
        <h3 className="font-serif text-lg text-text-primary font-semibold mb-3 tracking-tight">
          {t('Type I / II 长期演化', 'Type I / II Long-term Trend')}
        </h3>
        <MaturityPlaceholder daysRecorded={maturity.daysRecorded} language={language} />
      </section>
    )
  }

  /* ---- data ---- */

  const chartData = useMemo(() => {
    return history.map((bucket) => {
      const split = computeTypeSplit(bucket.byCategory)
      return {
        label: fmtBucketLabel(bucket, periodType, language),
        typeI: +split.typeI.hours.toFixed(1),
        typeII: +split.typeII.hours.toFixed(1),
        typeIPct: split.typeI.pct,
      }
    })
  }, [history, periodType, language])

  /* ---- benchmark reference ---- */

  const benchmarkPeriod = PERIOD_MULT[periodType] ?? null
  const benchmarkVal = benchmarkPeriod ? +(LYUBISHCHEV_BENCHMARK / benchmarkPeriod).toFixed(1) : null

  /* ---- domain ---- */

  const maxVal = useMemo(() => {
    let mx = 0
    for (const d of chartData) {
      if (d.typeI > mx) mx = d.typeI
      if (d.typeII > mx) mx = d.typeII
    }
    return Math.ceil((mx * 1.15) / 10) * 10 || 50
  }, [chartData])

  /* ---- empty ---- */

  if (chartData.length === 0 || (chartData.length === 1 && chartData[0].typeI === 0 && chartData[0].typeII === 0)) {
    return (
      <section className="pt-10 pb-6">
        <h3 className="font-serif text-lg text-text-primary font-semibold mb-3 tracking-tight">
          {t('Type I / II 长期演化', 'Type I / II Long-term Trend')}
        </h3>
        <p className="font-serif text-sm text-text-tertiary italic">{t('暂无数据', 'No data yet')}</p>
      </section>
    )
  }

  return (
    <section className="mt-12 pt-8" style={{ borderTop: '1px solid var(--heatmap-rule)' }}>
      <h3 className="font-serif text-lg text-text-primary font-semibold mb-1 tracking-tight">
        {t('Type I / II 长期演化', 'Type I / II Long-term Trend')}
      </h3>
      <p className="font-serif text-body-sm text-text-tertiary italic mb-5">
        {t('Type I（主要矛盾 + 个人提升）与 Type II 的演化趋势', 'Type I (Core Focus + Personal Growth) vs Type II over time')}
      </p>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            interval="preserveStartEnd"
          />

          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={[0, maxVal]}
            tickFormatter={(v: number) => `${v}h`}
          />

          <Tooltip content={<TypeTooltip language={language} />} />

          {/* Lyubishchev benchmark reference line */}
          {benchmarkVal !== null && (
            <ReferenceLine
              y={benchmarkVal}
              stroke="var(--event-accent-fill)"
              strokeDasharray="6 3"
              strokeWidth={1}
              label={{
                value: t(`柳比歇夫基准 ${benchmarkVal}h`, `Lyubishchev ${benchmarkVal}h`),
                position: 'insideTopRight',
                fontSize: 9,
                fill: 'var(--event-accent-fill)',
                opacity: 0.7,
              }}
            />
          )}

          {/* Type II line (background, dashed) */}
          <Line
            type="monotone"
            dataKey="typeII"
            stroke={TYPE_II_COLOR}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls={false}
            name={t('Type II', 'Type II')}
          />

          {/* Type I line (foreground, solid accent) */}
          <Line
            type="monotone"
            dataKey="typeI"
            stroke={TYPE_I_COLOR}
            strokeWidth={2}
            dot={{ r: 2.5, fill: TYPE_I_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls={false}
            name={t('Type I', 'Type I')}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend + summary */}
      <div className="flex items-center gap-5 mt-3 text-xs text-text-tertiary font-sans">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0 border-t-2 border-[var(--event-accent-fill)]" />
          {t('Type I', 'Type I')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0 border-t border-dashed border-[var(--text-tertiary)]" />
          {t('Type II', 'Type II')}
        </span>
        {benchmarkVal !== null && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0 border-t border-dashed border-[var(--event-accent-fill)]" style={{ borderTopWidth: 1 }} />
            {t('柳比歇夫基准', 'Lyubishchev benchmark')}
          </span>
        )}
        {chartData.length >= 2 && (
          <span className="ml-auto">
            {(() => {
              const last = chartData[chartData.length - 1]
              const prev = chartData[chartData.length - 2]
              const diff = last.typeIPct - prev.typeIPct
              const sign = diff >= 0 ? '+' : ''
              return t(
                `最新 Type I ${last.typeIPct}% (${sign}${diff.toFixed(0)}pp)`,
                `Latest Type I ${last.typeIPct}% (${sign}${diff.toFixed(0)}pp)`,
              )
            })()}
          </span>
        )}
      </div>
    </section>
  )
}
