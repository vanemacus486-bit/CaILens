// Required: npm install recharts
import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Bucket } from '@/hooks/useStatsAggregation'
import type { Category } from '@/domain/category'
import { cn } from '@/lib/utils'

const CAT_ORDER = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as const

interface TrendsComparisonProps {
  history: Bucket[]
  categories: Category[]
  language: 'zh' | 'en'
}

export function TrendsComparison({ history, categories, language }: TrendsComparisonProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const [trendCat, setTrendCat] = useState('accent')

  // 30-day trend data — use the last 30 days from the most recent week bucket
  const trendData = useMemo(() => {
    if (history.length === 0) return []
    // Build daily data from the week bucket's byHourSlot
    const last = history[history.length - 1]
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((day, di) => {
      const entry: Record<string, number | string> = { day }
      for (const id of CAT_ORDER) {
        let sum = 0
        for (let h = 0; h < 24; h++) {
          sum += last.byHourSlot[di]?.[h] || 0
        }
        entry[id] = +(sum).toFixed(2)
      }
      return entry
    })
  }, [history])

  // Sparkline data — last 8 weeks per category
  const sparklines = useMemo(() => {
    return CAT_ORDER.map((id) => {
      const cat = categories.find((c) => c.id === id)
      const data = history.slice(-8).map((b) => b.byCategory[id] || 0)
      const current = data[data.length - 1] || 0
      const prev = data[data.length - 2] || 0
      const change = current - prev
      const pct = prev > 0 ? (change / prev) * 100 : (current > 0 ? 100 : 0)
      return { key: id, name: cat?.name[language] ?? id, data, current, change, pct }
    })
  }, [history, categories, language])

  const RechartsTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-surface-sunken border border-border-default px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="text-[11px] text-text-tertiary italic mb-1.5">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-xs text-text-secondary font-sans">{p.name}</span>
            <span className="text-[13px] text-text-primary font-mono font-semibold ml-auto pl-4">
              {p.value.toFixed(1)}h
            </span>
          </div>
        ))}
      </div>
    )
  }

  const trendCats = ['accent', 'sage', 'sky', 'rose']

  return (
    <div className="space-y-6">
      {/* 30-Day Trend */}
      <div className="bg-surface-raised border border-border-subtle p-6">
        <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
          {t('30天滚动趋势', '30-Day Rolling Trend')}
        </h3>
        <p className="text-[11px] text-text-tertiary mb-4">
          {t('每日小时数', 'Daily hours — this week detail')}
        </p>

        <div className="flex gap-1.5 flex-wrap mb-3">
          {trendCats.map((id) => (
            <button
              key={id}
              onClick={() => setTrendCat(id)}
              className={cn(
                'px-2.5 py-[3px] rounded-sm text-[11px] font-sans border transition-all duration-150 cursor-pointer',
                trendCat === id
                  ? 'text-white border-transparent'
                  : 'text-text-tertiary border-border-subtle hover:text-text-primary',
              )}
              style={trendCat === id ? { backgroundColor: `var(--event-${id}-fill)` } : undefined}
            >
              {categories.find(c => c.id === id)?.name[language] ?? id}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'Source Sans 3, sans-serif' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<RechartsTooltip />} />
            <Line
              type="monotone"
              dataKey={trendCat}
              name={categories.find(c => c.id === trendCat)?.name[language] ?? trendCat}
              stroke={`var(--event-${trendCat}-fill)`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sparklines */}
      <div className="bg-surface-raised border border-border-subtle p-6">
        <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
          {t('周环比', 'Week-over-Week')}
        </h3>
        <p className="text-[11px] text-text-tertiary mb-4">
          {t('过去8周每分类 sparkline + 当前值 + 变化', 'Last 8 weeks per category — sparkline + current value + delta')}
        </p>

        <div className="flex flex-wrap gap-3">
          {sparklines.map((s) => {
            const up = s.change >= 0
            const mn = Math.min(...s.data)
            const mx = Math.max(...s.data)
            const W = 76; const H = 36
            const len = s.data.length
            const x = (i: number) => len > 1 ? (i / (len - 1)) * W : W / 2
            const range = mx - mn || 1
            const y = (v: number) => H - ((v - mn) / range) * H
            const pathD = s.data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

            return (
              <div key={s.key} className="bg-surface-base border border-border-subtle px-4 py-3.5 flex-1 min-w-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-[11px] text-text-tertiary mb-0.5">{s.name}</div>
                    <div className="font-mono text-lg font-bold text-text-primary leading-none">
                      {s.current.toFixed(1)}<span className="text-[11px] font-normal">h</span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'text-[11px] font-mono px-1.5 py-0.5 rounded-sm',
                      up ? 'text-[#7A9448] bg-[#ECF0E4]' : 'text-[#9E7A5A] bg-[#F0E8DC]',
                    )}
                  >
                    {up ? '+' : ''}{s.pct.toFixed(0)}%
                  </div>
                </div>
                <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                  <path d={pathD} fill="none" stroke={`var(--event-${s.key}-fill)`} strokeWidth={1.5} />
                  <circle
                    cx={x(s.data.length - 1)} cy={y(s.data[s.data.length - 1])} r={2.5}
                    fill={`var(--event-${s.key}-fill)`}
                  />
                </svg>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
