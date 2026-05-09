import { useMemo } from 'react'
import { computeDelta } from '@/domain/diagnosis'

interface TrendVsLastWeekProps {
  currentTotal: number
  historyTotals: number[]
  language: 'zh' | 'en'
}

export function TrendVsLastWeek({ currentTotal, historyTotals, language }: TrendVsLastWeekProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const delta = useMemo(
    () => {
      const prev = historyTotals.length >= 2 ? historyTotals[historyTotals.length - 2] : null
      return computeDelta(currentTotal, prev, historyTotals)
    },
    [currentTotal, historyTotals],
  )

  // Sparkline SVG params
  const W = 140
  const H = 50
  const padding = { top: 4, bottom: 4, left: 0, right: 0 }
  const plotW = W - padding.left - padding.right
  const plotH = H - padding.top - padding.bottom

  const data = delta.sparklineData
  const mn = data.length > 0 ? Math.min(...data) : 0
  const mx = data.length > 0 ? Math.max(...data) : 1
  const range = mx - mn || 1

  const x = (i: number) =>
    padding.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2)
  const y = (v: number) => padding.top + plotH - ((v - mn) / range) * plotH

  const pathD =
    data.length > 0
      ? data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
      : ''

  const arrow = delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '→'
  const arrowColor =
    delta.direction === 'up' ? '#6E9476' : delta.direction === 'down' ? '#B53535' : '#6F6453'

  return (
    <div
      className="rounded-lg px-4 py-4 flex flex-col"
      style={{ backgroundColor: '#EDE8DA' }}
    >
      <span
        className="text-xs font-semibold mb-1"
        style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#2E2823' }}
      >
        {t('趋势：vs 上期', 'Trend: vs Last Period')}
      </span>

      {/* Sparkline */}
      <div className="flex items-center justify-center py-1">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {data.length > 1 && (
            <>
              {/* Gradient fill under line */}
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C8693E" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#C8693E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path
                d={`${pathD} L${x(data.length - 1)},${padding.top + plotH} L${x(0)},${padding.top + plotH} Z`}
                fill="url(#trendFill)"
              />
              <path d={pathD} fill="none" stroke="#C8693E" strokeWidth={1.5} />
            </>
          )}
          {data.length > 0 && (
            <circle
              cx={x(data.length - 1)}
              cy={y(data[data.length - 1])}
              r={2.5}
              fill="#C8693E"
            />
          )}
        </svg>
      </div>

      {/* Delta indicator */}
      <div className="flex items-center gap-1.5 justify-center mt-1">
        <span style={{ color: arrowColor, fontSize: 16, lineHeight: 1 }}>{arrow}</span>
        <span className="font-mono text-xs" style={{ color: arrowColor }}>
          {delta.deltaHours >= 0 ? '+' : ''}{delta.deltaHours.toFixed(1)}h
        </span>
        {delta.deltaPct !== 0 && (
          <span className="text-[10px] font-mono" style={{ color: '#6F6453' }}>
            ({delta.deltaPct >= 0 ? '+' : ''}{delta.deltaPct}%)
          </span>
        )}
      </div>
    </div>
  )
}
