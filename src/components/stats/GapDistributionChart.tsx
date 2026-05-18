import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { computeGapDistribution } from '@/domain/gaps'
import type { CalendarEvent } from '@/domain/event'

/* ---------- helpers ---------- */

function fmtPct(v: number): string {
  return `${Math.round(v)}%`
}

/* ---------- component ---------- */

interface GapDistributionChartProps {
  rangeEvents: CalendarEvent[]
  language: 'zh' | 'en'
}

export function GapDistributionChart({ rangeEvents, language }: GapDistributionChartProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const { byHour, avgGap, totalDays } = useMemo(
    () => computeGapDistribution(rangeEvents, 90),
    [rangeEvents],
  )

  const chartData = useMemo(
    () =>
      byHour.map((rate, hour) => ({
        label: `${String(hour).padStart(2, '0')}:00`,
        gapPct: +(rate * 100).toFixed(1),
        avg: +(avgGap * 100).toFixed(1),
      })),
    [byHour, avgGap],
  )

  /* ---- tooltip ---- */

  const GapTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
  }) => {
    if (!active || !payload?.length || !label) return null
    return (
      <div className="bg-surface-sunken border border-border-default px-3.5 py-2.5 shadow-tooltip">
        <div className="text-body-xs text-text-tertiary italic mb-1.5">{label}</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--color-text-tertiary)] opacity-40 flex-shrink-0" />
          <span className="text-xs text-text-secondary font-sans">{t('缺口率', 'Gap rate')}</span>
          <span className="text-body-sm text-text-primary font-mono font-semibold ml-auto pl-4">
            {fmtPct(payload[0].value)}
          </span>
        </div>
      </div>
    )
  }

  /* ---- empty ---- */

  if (totalDays < 2) {
    return (
      <section className="pt-10 pb-6">
        <h3 className="font-serif text-lg text-text-primary font-semibold mb-3 tracking-tight">
          {t('未覆盖时间分布', 'Uncovered Time Distribution')}
        </h3>
        <p className="font-serif text-sm text-text-tertiary italic">{t('暂无足够数据', 'Not enough data yet')}</p>
      </section>
    )
  }

  return (
    <section className="pt-10 pb-6">
      <h3 className="font-serif text-lg text-text-primary font-semibold mb-1 tracking-tight">
        {t('未覆盖时间分布', 'Uncovered Time Distribution')}
      </h3>
      <p className="font-serif text-body-sm text-text-tertiary italic mb-5">
        {t(
          `过去 ${totalDays} 天中，每小时未被任何事件覆盖的天数占比`,
          `% of days with zero coverage at each hour (last ${totalDays} days)`,
        )}
      </p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            interval={3}
          />

          <YAxis
            domain={[0, 100]}
            tickFormatter={fmtPct}
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />

          <Tooltip content={<GapTooltip />} />

          <ReferenceLine
            y={+(avgGap * 100).toFixed(1)}
            stroke="var(--text-tertiary)"
            strokeDasharray="4 4"
            strokeWidth={1.2}
            label={{
              value: t('平均', 'Avg'),
              position: 'insideTopRight',
              fontSize: 10,
              fill: 'var(--text-tertiary)',
            }}
          />

          <Bar
            dataKey="gapPct"
            fill="var(--text-tertiary)"
            opacity={0.35}
            radius={[2, 2, 0, 0]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const { x, y, width, height, payload } = props
              // Darker bar = higher gap rate
              const intensity = Math.min(0.6, 0.15 + (payload.gapPct / 100) * 0.5)
              return <rect x={x} y={y} width={width} height={height} fill={`rgba(128, 128, 128, ${intensity})`} rx={2} />
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary font-sans">
        <span>
          {t('平均缺口率', 'Avg gap rate')}: <span className="font-mono font-semibold">{fmtPct(avgGap * 100)}</span>
        </span>
        <span>
          {t('分析天数', 'Days analyzed')}: <span className="font-mono font-semibold">{totalDays}</span>
        </span>
      </div>
    </section>
  )
}
