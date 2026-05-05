import { useMemo } from 'react'
import type { Category, CategoryId } from '@/domain/category'
import type { Granularity, Bucket } from '@/hooks/useStatsAggregation'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

function scaleBudgetToPeriod(weeklyBudget: number, _periodType: Granularity, bucket: Bucket): number {
  const days = (bucket.end.getTime() - bucket.start.getTime()) / (24 * 3600_000)
  return weeklyBudget * (days / 7)
}

interface CategoryBarChartProps {
  current: Bucket
  categories: Category[]
  periodType: Granularity
  language: 'zh' | 'en'
  compact?: boolean
  globalMax?: number
}

export function CategoryBarChart({
  current,
  categories,
  periodType,
  language,
  compact = false,
  globalMax,
}: CategoryBarChartProps) {
  const catMap = useMemo(() => {
    const map = new Map<CategoryId, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  const bars = useMemo(() => {
    return CATEGORY_IDS.map((id) => {
      const cat = catMap.get(id)
      const actual = current.byCategory[id] ?? 0
      const budget = cat ? scaleBudgetToPeriod(cat.weeklyBudget, periodType, current) : 0
      return { id, actual, budget, cat }
    })
  }, [current, catMap, periodType])

  const scale = useMemo(() => {
    if (globalMax !== undefined) return globalMax
    const maxBudget = Math.max(...bars.map((b) => b.budget), 0)
    const maxActual = Math.max(...bars.map((b) => b.actual), 0)
    const raw = Math.max(maxBudget, maxActual)
    if (raw === 0) return 10
    return raw * 1.12
  }, [bars, globalMax])

  const fontSize = compact ? 'text-[10px]' : 'text-xs'
  const labelWidth = compact ? 'w-[80px]' : 'w-[110px]'
  const barH = compact ? 'h-[14px]' : 'h-[22px]'
  const gap = compact ? 'gap-[5px]' : 'gap-[7px]'
  const valueWidth = compact ? 'w-[56px]' : 'w-[72px]'

  if (bars.every((b) => b.actual === 0 && b.budget === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-text-tertiary text-sm font-sans">
        {language === 'zh' ? '暂无数据' : 'No data yet'}
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${gap}`}>
      {bars.map(({ id, actual, budget, cat }) => {
        const name = cat?.name?.[language] ?? id
        const budgetPct = scale > 0 ? (budget / scale) * 100 : 0
        const actualPct = scale > 0 ? (Math.min(actual, budget) / scale) * 100 : 0
        const overflowPct = actual > budget ? ((actual - budget) / scale) * 100 : 0
        const isOver = actual > budget

        return (
          <div key={id} className="flex items-center gap-2">
            <span
              className={`${labelWidth} ${fontSize} font-serif text-text-primary truncate text-right leading-tight`}
            >
              {name}
            </span>
            <div
              className={`flex-1 relative ${barH} rounded-[3px] overflow-hidden`}
              style={{ backgroundColor: 'var(--surface-sunken)' }}
            >
              {/* Budget track fills the full budget width */}
              <div
                className={`absolute inset-y-0 left-0 rounded-[3px]`}
                style={{
                  width: `${budgetPct}%`,
                  borderRight: '1px dashed var(--border-default)',
                }}
              />
              {/* Actual fill up to budget */}
              {actual > 0 && (
                <div
                  className="absolute inset-y-0 left-0 rounded-[3px]"
                  style={{
                    width: `${actualPct}%`,
                    backgroundColor: `var(--event-${id}-fill)`,
                  }}
                />
              )}
              {/* Overflow beyond budget */}
              {isOver && (
                <div
                  className="absolute inset-y-0 rounded-[3px]"
                  style={{
                    left: `${budgetPct}%`,
                    width: `${overflowPct}%`,
                    backgroundColor: 'var(--color-text-warning)',
                    opacity: 0.85,
                  }}
                />
              )}
            </div>
            <span className={`${valueWidth} ${fontSize} font-mono text-text-secondary text-right whitespace-nowrap leading-tight`}>
              {actual.toFixed(1)}/{budget.toFixed(1)}h
            </span>
          </div>
        )
      })}
    </div>
  )
}

export { CATEGORY_IDS }
