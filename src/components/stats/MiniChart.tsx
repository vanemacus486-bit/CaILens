import { useMemo } from 'react'
import { format } from 'date-fns'
import type { Bucket, Granularity } from '@/hooks/useStatsAggregation'
import { scaleBudgetToPeriod } from '@/domain/diagnosis'

type ChartType = 'line' | 'bar'

interface MiniChartProps {
  categoryId: string
  categoryName: string
  buckets: Bucket[]
  periodType: Granularity
  budget: number  // weekly budget hours
  chartType: ChartType
  language: 'zh' | 'en'
}

// SVG dimensions
const W = 310
const H = 150
const PAD = { top: 14, right: 12, bottom: 22, left: 36 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function formatXLabel(bucket: Bucket, periodType: Granularity): string {
  if (periodType === 'week') {
    return format(bucket.start, 'MM.dd')
  }
  if (periodType === 'month') {
    return format(bucket.start, 'MM.dd')
  }
  if (periodType === 'quarter') {
    return format(bucket.start, 'MM.dd')
  }
  return format(bucket.start, 'MM.dd')
}

export function MiniChart({
  categoryId,
  categoryName,
  buckets,
  periodType,
  budget,
  chartType,
  language,
}: MiniChartProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const scaledBudget = useMemo(
    () => scaleBudgetToPeriod(budget, (buckets[buckets.length - 1]?.end.getTime() - buckets[0]?.start.getTime()) / (24 * 3600_000) / buckets.length || 7),
    [budget, buckets],
  )

  const data = useMemo(
    () => buckets.map((b) => (b.byCategory as Record<string, number>)[categoryId] ?? 0),
    [buckets, categoryId],
  )

  const yMax = useMemo(() => {
    const raw = Math.max(...data, scaledBudget)
    return raw === 0 ? 10 : raw * 1.15
  }, [data, scaledBudget])

  const lastVal = data[data.length - 1] ?? 0
  const prevVal = data.length >= 2 ? data[data.length - 2] : 0
  const change = lastVal - prevVal
  const isUp = change > 0.1

  let statusIcon: string
  let statusText: string
  let statusColor: string

  if (lastVal === 0 && scaledBudget > 0) {
    statusIcon = '⚠'
    statusText = t('完全空缺', 'Zero')
    statusColor = '#B53535'
  } else if (lastVal < scaledBudget * 0.8) {
    statusIcon = '↓'
    statusText = t('偏低', 'Low')
    statusColor = '#D4894A'
  } else if (lastVal > scaledBudget * 1.2) {
    statusIcon = '↑'
    statusText = t('超额', 'Over')
    statusColor = '#C8693E'
  } else {
    statusIcon = '✓'
    statusText = t('达成', 'OK')
    statusColor = '#6E9476'
  }

  const fillColor = `var(--event-${categoryId}-fill)`

  // X positions
  const xPos = (i: number) =>
    PAD.left + (buckets.length > 1 ? (i / (buckets.length - 1)) * PLOT_W : PLOT_W / 2)
  const yPos = (v: number) => PAD.top + PLOT_H - (v / yMax) * PLOT_H

  // Y axis ticks
  const yTicks = [0, Math.round(yMax / 2), Math.round(yMax)]

  return (
    <div
      className="rounded-lg p-3 flex flex-col"
      style={{ backgroundColor: '#EDE8DA' }}
    >
      {/* Header: dot + name */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: fillColor }}
        />
        <span
          className="text-xs font-semibold truncate"
          style={{ fontFamily: "'Noto Serif SC', serif", color: '#2E2823' }}
        >
          {categoryName}
        </span>
      </div>

      {/* SVG chart */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
        {/* Background gridlines */}
        {yTicks.map((tick, ti) => (
          <line
            key={`grid-${ti}`}
            x1={PAD.left}
            y1={yPos(tick)}
            x2={W - PAD.right}
            y2={yPos(tick)}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* Budget target line */}
        {scaledBudget > 0 && (
          <line
            x1={PAD.left}
            y1={yPos(scaledBudget)}
            x2={W - PAD.right}
            y2={yPos(scaledBudget)}
            stroke="#C9B99A"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        )}

        {chartType === 'line' && (
          <>
            {/* Area fill */}
            <defs>
              <linearGradient id={`area-${categoryId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path
              d={`M${xPos(0)},${yPos(data[0])} ${data
                .slice(1)
                .map((v, i) => `L${xPos(i + 1)},${yPos(v)}`)
                .join(' ')} L${xPos(data.length - 1)},${yPos(0)} L${xPos(0)},${yPos(0)} Z`}
              fill={`url(#area-${categoryId})`}
            />
            <path
              d={data
                .map((v, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`)
                .join(' ')}
              fill="none"
              stroke={fillColor}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {data.length > 0 && (
              <circle
                cx={xPos(data.length - 1)}
                cy={yPos(lastVal)}
                r={3}
                fill={fillColor}
                stroke="#fff"
                strokeWidth={1}
              />
            )}
          </>
        )}

        {chartType === 'bar' && (
          <>
            {data.map((v, i) => {
              const barW = Math.max(PLOT_W / data.length * 0.5, 2)
              const cx = xPos(i) - barW / 2
              const barH = v > 0 ? yPos(0) - yPos(v) : 0
              return (
                <rect
                  key={i}
                  x={cx}
                  y={yPos(v)}
                  width={barW}
                  height={barH}
                  rx={2}
                  fill={fillColor}
                  opacity={v >= scaledBudget ? 1 : 0.55}
                />
              )
            })}
          </>
        )}

        {/* X-axis labels */}
        {buckets.map((b, i) => {
          if (buckets.length > 4 && i > 0 && i < buckets.length - 1 && i % 2 !== 0) return null
          return (
            <text
              key={i}
              x={xPos(i)}
              y={H - 4}
              textAnchor="middle"
              fill="#6F6453"
              fontSize={8}
              fontFamily="'JetBrains Mono', monospace"
            >
              {formatXLabel(b, periodType)}
            </text>
          )
        })}

        {/* Y-axis labels */}
        {yTicks.map((tick, ti) => (
          <text
            key={ti}
            x={PAD.left - 4}
            y={yPos(tick) + 3}
            textAnchor="end"
            fill="#6F6453"
            fontSize={8}
            fontFamily="'JetBrains Mono', monospace"
          >
            {tick}
          </text>
        ))}
      </svg>

      {/* Status row */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <span style={{ color: statusColor, fontSize: 13 }}>{statusIcon}</span>
          <span className="text-xs font-medium" style={{ color: statusColor }}>
            {statusText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: '#2E2823' }}>
            {lastVal.toFixed(1)}h
          </span>
          {change !== 0 && (
            <span
              className="font-mono text-[10px]"
              style={{ color: isUp ? '#6E9476' : '#B53535' }}
            >
            {isUp ? '+' : ''}{change.toFixed(1)}h
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
