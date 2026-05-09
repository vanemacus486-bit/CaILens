import { useMemo } from 'react'
import type { Category } from '@/domain/category'
import type { BudgetStatus, DeficitStatus } from '@/domain/diagnosis'

const CATEGORY_IDS = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as const

const STATUS_STYLES: Record<DeficitStatus, { bar: string; bg: string }> = {
  severe_deficit: { bar: '#B53535', bg: 'rgba(181,53,53,0.10)' },
  deficit:        { bar: '#D4894A', bg: 'rgba(212,137,74,0.10)' },
  not_started:    { bar: '#C9B99A', bg: 'rgba(201,185,154,0.10)' },
  on_target:      { bar: '#6E9476', bg: 'rgba(110,148,118,0.10)' },
  surplus:        { bar: '#C8693E', bg: 'rgba(200,105,62,0.10)' },
}

interface DivergenceBarChartProps {
  budgetStatuses: BudgetStatus[]
  categories: Category[]
  language: 'zh' | 'en'
}

export function DivergenceBarChart({
  budgetStatuses,
  categories,
  language,
}: DivergenceBarChartProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  // Map statuses back to category order for display
  const rows = useMemo(() => {
    const byId = new Map(budgetStatuses.map((b) => [b.categoryId, b]))
    return CATEGORY_IDS.map((id) => byId.get(id)!)
  }, [budgetStatuses])

  // Find the max absolute deviation for scaling
  const scale = useMemo(() => {
    let max = 0
    for (const r of rows) {
      if (Math.abs(r.deviation) > max) max = Math.abs(r.deviation)
    }
    return max === 0 ? 10 : max * 1.15
  }, [rows])

  if (budgetStatuses.every((b) => b.actual === 0 && b.scaledBudget === 0)) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary text-sm font-sans">
        {t('暂无数据', 'No data yet')}
      </div>
    )
  }

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name?.[language] ?? id

  const statusLabel = (s: DeficitStatus): string => {
    const labels: Record<DeficitStatus, [string, string]> = {
      severe_deficit: ['严重欠债', 'Severe'],
      deficit: ['不足', 'Below'],
      not_started: ['未启', 'Idle'],
      on_target: ['达成', 'On Track'],
      surplus: ['超额', 'Over'],
    }
    const pair = labels[s]
    return language === 'zh' ? pair[0] : pair[1]
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 text-xs font-sans" style={{ color: '#6F6453' }}>
          <span>{t('欠债', 'Deficit')}</span>
          <span style={{ color: '#C8693E' }}>|</span>
          <span>{t('目标', 'Target')}</span>
          <span style={{ color: '#C8693E' }}>|</span>
          <span>{t('超额', 'Surplus')}</span>
        </div>
      </div>

      {/* Bar rows */}
      <div className="space-y-2.5">
        {rows.map((r) => {
          const isDeficit = r.deviation < 0
          const isSurplus = r.deviation > 0
          const barWidth = scale > 0 ? (Math.abs(r.deviation) / scale) * 100 : 0
          const barPct = Math.min(barWidth, 100)
          const style = STATUS_STYLES[r.status]
          const deltaLabel = `${r.deviation >= 0 ? '+' : ''}${r.deviation.toFixed(1)}h`

          return (
            <div key={r.categoryId} className="flex items-center gap-2 h-[32px]">
              {/* Category label */}
              <span
                className="w-[88px] text-xs font-serif truncate text-right leading-tight"
                style={{ color: '#2E2823' }}
              >
                {catName(r.categoryId)}
              </span>

              {/* Bar area (symmetrical) */}
              <div className="flex-1 relative h-full flex items-center">
                {/* Center target line */}
                <div
                  className="absolute top-0 bottom-0 z-10"
                  style={{
                    left: '50%',
                    width: '1px',
                    backgroundColor: '#C8693E',
                    opacity: 0.6,
                  }}
                />

                {/* Background track */}
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
                />

                {/* Deficit bar (left side) */}
                {isDeficit && (
                  <div
                    className="absolute rounded-sm"
                    style={{
                      right: '50%',
                      width: `${barPct}%`,
                      height: '20px',
                      backgroundColor: style.bg,
                      borderRight: `2.5px solid ${style.bar}`,
                    }}
                  />
                )}

                {/* Surplus bar (right side) */}
                {isSurplus && (
                  <div
                    className="absolute rounded-sm"
                    style={{
                      left: '50%',
                      width: `${barPct}%`,
                      height: '20px',
                      backgroundColor: style.bg,
                      borderLeft: `2.5px solid ${style.bar}`,
                    }}
                  />
                )}
              </div>

              {/* Status + value */}
              <div className="w-[120px] flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: style.bar }}
                />
                <span className="text-[10px] font-sans whitespace-nowrap" style={{ color: '#6F6453' }}>
                  {statusLabel(r.status)}
                </span>
                <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: r.deviation >= 0 ? '#6E9476' : '#B53535' }}>
                  {deltaLabel}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 justify-center">
        {(Object.entries(STATUS_STYLES) as [DeficitStatus, typeof STATUS_STYLES['severe_deficit']][]).map(
          ([status, style]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: style.bar }}
              />
              <span className="text-[10px] font-sans" style={{ color: '#6F6453' }}>
                {statusLabel(status)}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
