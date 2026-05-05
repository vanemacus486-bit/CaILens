import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Category } from '@/domain/category'
import type { Granularity, Bucket } from '@/hooks/useStatsAggregation'
import { CategoryBarChart } from './CategoryBarChart'

const N_OPTIONS = [2, 3, 6, 12]

function formatPeriodLabel(bucket: Bucket, periodType: Granularity): string {
  const fmt = 'MM.dd'
  const start = format(bucket.start, fmt)
  if (periodType === 'week') {
    const end = format(new Date(bucket.end.getTime() - 24 * 3600_000), fmt)
    return `${start}-${end}`
  }
  if (periodType === 'month') return format(bucket.start, 'yyyy-MM')
  if (periodType === 'quarter') return `Q${Math.ceil((bucket.start.getMonth() + 1) / 3)} ${bucket.start.getFullYear()}`
  return format(bucket.start, 'yyyy')
}

interface MultiPeriodComparisonProps {
  history: Bucket[]
  categories: Category[]
  periodType: Granularity
  language: 'zh' | 'en'
}

export function MultiPeriodComparison({
  history,
  categories,
  periodType,
  language,
}: MultiPeriodComparisonProps) {
  const [count, setCount] = useState(3)

  const buckets = useMemo(() => {
    const n = Math.min(count, history.length)
    return history.slice(history.length - n)
  }, [history, count])

  const globalMax = useMemo(() => {
    let max = 0
    for (const b of buckets) {
      for (const id of ['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as const) {
        const v = b.byCategory[id] ?? 0
        if (v > max) max = v
      }
    }
    return max === 0 ? 10 : max * 1.12
  }, [buckets])

  const maxN = Math.min(12, history.length)
  const availableN = N_OPTIONS.filter((n) => n <= maxN)
  if (availableN.length === 0) availableN.push(1)

  return (
    <div className="h-full flex flex-col">
      {/* N selector */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <span className="text-xs text-text-tertiary font-sans">
          {language === 'zh' ? '对比期数' : 'Periods'}
        </span>
        <div className="flex gap-0.5 bg-surface-sunken rounded p-0.5">
          {availableN.map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={cn(
                'px-2.5 py-1 rounded-sm text-xs font-sans font-medium transition-colors duration-200 cursor-pointer',
                count === n
                  ? 'bg-surface-base text-text-primary shadow-pill'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-side mini charts */}
      <div
        className="grid gap-4 flex-1 min-h-0"
        style={{ gridTemplateColumns: `repeat(${buckets.length}, 1fr)` }}
      >
        {buckets.map((bucket) => (
          <div key={bucket.start.getTime()} className="flex flex-col gap-1.5 h-full">
            <span className="text-[10px] font-sans font-medium text-text-tertiary text-center tracking-caps flex-shrink-0">
              {formatPeriodLabel(bucket, periodType)}
            </span>
            <div className="flex-1 min-h-0">
              <CategoryBarChart
                current={bucket}
                categories={categories}
                periodType={periodType}
                language={language}
                compact
                globalMax={globalMax}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
