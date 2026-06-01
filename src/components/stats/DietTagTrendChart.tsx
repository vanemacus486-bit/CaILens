/**
 * # DietTagTrendChart — 食物标签趋势
 *
 * 堆叠面积图展示近 90 天每周各食物标签的出现次数。
 * 使用 computeWeeklyTagTrend 聚合，Recharts AreaChart 渲染。
 */

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { CalendarEvent, MealTag } from '@/domain/event'
import { MEAL_TAG_LABELS } from '@/domain/event'
import { computeWeeklyTagTrend } from '@/domain/dietStats'
import { dateRange } from '@/domain/dateRange'

// ── 标签颜色 ────────────────────────────────────────────────

const TAG_COLORS: Record<MealTag, string> = {
  protein: '#E8734A',
  staple: '#D4A44A',
  vegetable: '#5B9E5B',
  fruit: '#C7A04A',
  caffeine: '#7B5B3A',
  sugar: '#C97B7B',
  alcohol: '#9B6B9B',
  fried: '#A08060',
}

const TAG_ORDER: MealTag[] = [
  'protein', 'staple', 'vegetable', 'fruit',
  'caffeine', 'sugar', 'alcohol', 'fried',
]

// ── 组件 ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
}

export function DietTagTrendChart({ rangeEvents }: Props) {
  const now = useMemo(() => Date.now(), [])
  const ninetyDaysAgo = now - 90 * 86_400_000

  const data = useMemo(() => {
    const range = dateRange(ninetyDaysAgo, now)
    const trend = computeWeeklyTagTrend(rangeEvents, range)
    // Format for Recharts (weekLabel for display, weekStart for sorting)
    return trend.map((w) => ({
      ...w,
      name: w.weekLabel,
    }))
  }, [rangeEvents, ninetyDaysAgo, now])

  if (data.length === 0) return null

  // Check if there's any non-zero data
  const hasData = data.some((w) =>
    TAG_ORDER.some((tag) => w[tag] > 0),
  )
  if (!hasData) return null

  return (
    <div className="dttc-root">
      <style>{DTTC_CSS}</style>

      <h4 className="dttc-title">食物标签周趋势（近 90 天）</h4>

      <div className="dttc-chart-container">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: "'Noto Sans SC', sans-serif" }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}
              tickLine={false}
              axisLine={false}
              width={32}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="dttc-tooltip">
                    <div className="dttc-tooltip-week">{label}</div>
                    {payload
                      .filter((p) => (p.value as number) > 0)
                      .sort((a, b) => (b.value as number) - (a.value as number))
                      .map((p) => (
                        <div key={String(p.dataKey)} className="dttc-tooltip-row">
                          <span
                            className="dttc-tooltip-dot"
                            style={{ background: p.color }}
                          />
                          <span>{MEAL_TAG_LABELS[p.dataKey as MealTag] ?? p.dataKey}</span>
                          <span className="dttc-tooltip-val">{p.value}</span>
                        </div>
                      ))}
                  </div>
                )
              }}
            />
            {TAG_ORDER.map((tag) => (
              <Area
                key={tag}
                type="monotone"
                dataKey={tag}
                stackId="1"
                stroke={TAG_COLORS[tag]}
                fill={TAG_COLORS[tag]}
                fillOpacity={0.4}
                strokeWidth={1}
                name={MEAL_TAG_LABELS[tag]}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="dttc-legend">
        {TAG_ORDER.map((tag) => (
          <span key={tag} className="dttc-legend-item">
            <span
              className="dttc-legend-dot"
              style={{ background: TAG_COLORS[tag] }}
            />
            {MEAL_TAG_LABELS[tag]}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const DTTC_CSS = `
.dttc-root {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}
.dttc-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
  margin: 0 0 12px 0;
}
.dttc-chart-container {
  position: relative;
}

/* ── Tooltip ─────────────────────────────── */
.dttc-tooltip {
  background: var(--heatmap-ink-1);
  color: var(--heatmap-bg);
  padding: 8px 12px;
  border-radius: 6px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 11px;
  line-height: 1.5;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}
.dttc-tooltip-week {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 11px;
  opacity: 0.85;
}
.dttc-tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dttc-tooltip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dttc-tooltip-val {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  margin-left: auto;
}

/* ── Legend ──────────────────────────────── */
.dttc-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 10px;
  color: var(--heatmap-ink-3);
}
.dttc-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.dttc-legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
`