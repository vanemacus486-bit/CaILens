// Required: npm install recharts
import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Bucket } from '@/hooks/useStatsAggregation'
import type { Category } from '@/domain/category'
import { cn } from '@/lib/utils'
import { HourHeatmap } from '@/components/stats/HourHeatmap'

const CAT_ORDER = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as const
const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface RhythmScheduleProps {
  current: Bucket
  history: Bucket[]
  categories: Category[]
  language: 'zh' | 'en'
}

function formatHourTick(h: number): string {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

export function RhythmSchedule({ current, categories, language }: RhythmScheduleProps) {
  const [hmCat, setHmCat] = useState('accent')
  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const days = language === 'zh' ? DAYS_ZH : DAYS_EN

  // Hourly distribution data — average across bucket
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const entry: Record<string, number | string> = { hour: h }
    for (const id of CAT_ORDER) {
      let sum = 0
      for (let d = 0; d < 7; d++) {
        sum += current.byHourSlot[d]?.[h] || 0
      }
      entry[id] = +(sum / 7).toFixed(2)
    }
    return entry
  })

  // Weekly rhythm — dominant category per day
  const rhythm = days.map((day, di) => {
    let dominant = 'stone'
    let domHrs = 0
    let secondary = 'stone'
    let secHrs = 0
    for (const id of CAT_ORDER) {
      let sum = 0
      for (let h = 0; h < 24; h++) {
        sum += current.byHourSlot[di]?.[h] || 0
      }
      // byHourSlot is total hours, not per-category, so dominant detection is approximate
    }
    // Use byCategory distributed evenly as approximation
    const perCat = Object.fromEntries(
      CAT_ORDER.map((id, i) => [id, (current.byCategory[id] || 0) / 7])
    )
    const sorted = CAT_ORDER
      .map(id => ({ id, hrs: perCat[id]! }))
      .sort((a, b) => b.hrs - a.hrs)
    dominant = sorted[0].id
    domHrs = sorted[0].hrs
    secondary = sorted[1].id
    secHrs = sorted[1].hrs

    return { day, dominant, domHrs, secondary, secHrs }
  })

  const RechartsTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-surface-sunken border border-border-default px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="text-[11px] text-text-tertiary italic mb-1.5">{formatHourTick(label)}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-xs text-text-secondary font-sans">{p.name}</span>
            <span className="text-[13px] text-text-primary font-mono font-semibold ml-auto pl-4">
              {p.value.toFixed(2)}h
            </span>
          </div>
        ))}
      </div>
    )
  }

  const hmCats = ['accent', 'sage', 'sky']

  return (
    <div className="space-y-6">
      {/* 24h Area Chart */}
      <div className="bg-surface-raised border border-border-subtle p-6">
        <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
          {t('24小时能量分布', '24-Hour Energy Distribution')}
        </h3>
        <p className="text-[11px] text-text-tertiary mb-4">
          {t('一天中各时段平均时间分配', 'Average time allocation across hours of the day')}
        </p>

        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={hourlyData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="hour" tickFormatter={formatHourTick}
              tick={{ fontSize: 10, fontFamily: 'Source Sans 3, sans-serif', fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false} interval={2}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<RechartsTooltip />} />
            {CAT_ORDER.map((id) => {
              const cat = categories.find((c) => c.id === id)
              if (!cat) return null
              return (
                <Area
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={cat.name[language]}
                  stackId="1"
                  stroke={`var(--event-${id}-fill)`}
                  fill={`var(--event-${id}-fill)`}
                  fillOpacity={0.75}
                  strokeWidth={0}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>

        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 mt-3">
          {CAT_ORDER.map((id) => {
            const cat = categories.find((c) => c.id === id)
            if (!cat) return null
            return (
              <div key={id} className="flex items-center gap-1.5">
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: `var(--event-${id}-fill)` }} />
                <span className="text-[10px] text-text-tertiary">{cat.name[language]}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Weekly Rhythm */}
        <div className="bg-surface-raised border border-border-subtle p-6">
          <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
            {t('每周节奏', 'Weekly Rhythm')}
          </h3>
          <p className="text-[11px] text-text-tertiary mb-4">
            {t('每日主导活动', 'Dominant activity per day')}
          </p>

          {rhythm.map((r) => {
            const cat = categories.find((c) => c.id === r.dominant)
            const secCat = categories.find((c) => c.id === r.secondary)
            return (
              <div key={r.day} className="flex items-center gap-2.5 py-2 border-b border-border-subtle last:border-b-0">
                <span className="text-xs text-text-tertiary w-[72px] flex-shrink-0">{r.day}</span>
                <span
                  className="inline-flex items-center px-2.5 py-[3px] rounded-xl text-[11px] font-sans font-medium text-white"
                  style={{ backgroundColor: `var(--event-${r.dominant}-fill)` }}
                >
                  {cat?.name[language] ?? r.dominant}
                </span>
                {r.secHrs > 0 && (
                  <span className="inline-flex items-center px-2.5 py-[3px] rounded-xl text-[11px] font-sans text-text-secondary bg-surface-sunken border border-border-subtle">
                    {secCat?.name[language] ?? r.secondary}
                  </span>
                )}
                <span className="ml-auto font-mono text-[11px] text-text-tertiary">
                  {r.domHrs > 0 ? `${r.domHrs.toFixed(1)}h` : '—'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Heatmap */}
        <div className="bg-surface-raised border border-border-subtle p-6">
          <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
            {t('周度热力图', 'Weekly Heatmap')}
          </h3>
          <p className="text-[11px] text-text-tertiary mb-4">
            {t('7×24 活动密度', '7×24 activity density')}
          </p>

          <HourHeatmap bucket={current} />
        </div>
      </div>
    </div>
  )
}
