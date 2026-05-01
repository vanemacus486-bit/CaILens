// Required: npm install recharts
import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import type { Bucket } from '@/hooks/useStatsAggregation'
import type { Category } from '@/domain/category'
import { cn } from '@/lib/utils'

const CAT_ORDER = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as const

const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface TimeAllocationProps {
  current: Bucket
  history: Bucket[]
  categories: Category[]
  language: 'zh' | 'en'
}

export function TimeAllocation({ current, categories, language }: TimeAllocationProps) {
  const [donutTab, setDonutTab] = useState<'week' | 'month'>('week')
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  // Donut data
  const donutData = CAT_ORDER
    .map((id) => {
      const cat = categories.find((c) => c.id === id)
      return {
        name: cat?.name[language] ?? id,
        key: id,
        value: current.byCategory[id] || 0,
        fill: `var(--event-${id}-fill)`,
      }
    })
    .filter((d) => d.value > 0)

  const totalHrs = current.total

  // Stacked bar data
  const days = language === 'zh' ? DAYS_ZH : DAYS_EN
  const barData = current.byHourSlot.length > 0
    ? days.map((day) => {
        const entry: Record<string, string | number> = { day }
        // Use average distribution across week
        for (const id of CAT_ORDER) {
          entry[id] = (current.byCategory[id] || 0) / 7
        }
        return entry
      })
    : []

  const RechartsTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-surface-sunken border border-border-default px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        {label && <div className="text-[11px] text-text-tertiary italic mb-1.5">{label}</div>}
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
            <span className="text-xs text-text-secondary font-sans">{p.name}</span>
            <span className="text-[13px] text-text-primary font-mono font-semibold ml-auto pl-4">
              {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}h
            </span>
          </div>
        ))}
      </div>
    )
  }

  const [ai, setAi] = useState<number | null>(null)

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Donut Chart */}
      <div className="bg-surface-raised border border-border-subtle p-6">
        <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
          {t('分类分布', 'Category Distribution')}
        </h3>
        <p className="text-[11px] text-text-tertiary mb-4">
          {t('时间如何分配到各分类', 'How the hours break down')}
        </p>

        <div className="flex gap-0.5 mb-4">
          {(['week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setDonutTab(p)}
              className={cn(
                'px-2.5 py-1 rounded-sm text-[11px] font-sans font-medium transition-colors duration-150 cursor-pointer',
                donutTab === p
                  ? 'bg-surface-sunken text-text-primary'
                  : 'text-text-tertiary hover:text-text-primary',
              )}
            >
              {p === 'week' ? t('本周', 'This Week') : t('本月', 'This Month')}
            </button>
          ))}
        </div>

        <div className="relative">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%" cy="50%"
                innerRadius={68} outerRadius={105}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={(_, i) => setAi(i)}
                onMouseLeave={() => setAi(null)}
              >
                {donutData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.fill}
                    opacity={ai === null || ai === i ? 1 : 0.4}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip content={<RechartsTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="font-mono text-2xl font-bold text-text-primary leading-none">
              {ai !== null ? donutData[ai]?.value.toFixed(1) : totalHrs.toFixed(0)}
            </div>
            <div className="font-serif text-[11px] text-text-tertiary mt-1 italic">
              {ai !== null ? donutData[ai]?.name : t('本周', 'this week')}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 mt-3.5">
          {donutData.map((d) => (
            <div key={d.key} className="flex items-center gap-1.5">
              <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: d.fill }} />
              <span className="text-[10px] text-text-secondary">{d.name}</span>
              <span className="text-[10px] text-text-primary font-mono">{d.value.toFixed(1)}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stacked Bar Chart */}
      <div className="bg-surface-raised border border-border-subtle p-6">
        <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
          {t('每日分布', 'Daily Breakdown')}
        </h3>
        <p className="text-[11px] text-text-tertiary mb-4">
          {t('每天各分类小时数', 'Hours per category, stacked by day')}
        </p>

        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={barData} barSize={26} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fontFamily: 'Source Sans 3, sans-serif', fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<RechartsTooltip />} />
            {CAT_ORDER.map((id, idx) => {
              const cat = categories.find((c) => c.id === id)
              if (!cat) return null
              return (
                <Bar
                  key={id}
                  dataKey={id}
                  name={cat.name[language]}
                  stackId="a"
                  fill={`var(--event-${id}-fill)`}
                  radius={idx === CAT_ORDER.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                />
              )
            })}
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
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
    </div>
  )
}
