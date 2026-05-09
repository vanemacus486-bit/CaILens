import { useState, useMemo } from 'react'
import type { Category, CategoryId } from '@/domain/category'
import type { Granularity, Bucket } from '@/hooks/useStatsAggregation'
import { MiniChart } from './MiniChart'

type ChartType = 'line' | 'bar'

const CAT_ORDER: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']
const N_OPTIONS = [2, 3, 6]

interface SmallMultiplesProps {
  history: Bucket[]
  categories: Category[]
  periodType: Granularity
  language: 'zh' | 'en'
}

export function SmallMultiples({
  history,
  categories,
  periodType,
  language,
}: SmallMultiplesProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const [count, setCount] = useState(3)
  const [chartType, setChartType] = useState<ChartType>('line')

  const catMap = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  // Pick last N buckets
  const buckets = useMemo(() => {
    const n = Math.min(count, history.length)
    return history.slice(history.length - n)
  }, [history, count])

  const maxN = Math.min(6, history.length)
  const availableN = N_OPTIONS.filter((n) => n <= maxN)
  if (availableN.length === 0) availableN.push(1)

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-sm font-sans" style={{ color: '#6F6453' }}>
        {t('暂无历史数据', 'No historical data yet')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* N-selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-sans" style={{ color: '#6F6453' }}>
            {t('对比期数', 'Periods')}
          </span>
          <div className="flex gap-0.5 rounded p-0.5" style={{ backgroundColor: '#E8DFCC' }}>
            {availableN.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className="px-2.5 py-1 rounded-sm text-xs font-sans font-medium transition-colors duration-200 cursor-pointer border-none"
                style={{
                  backgroundColor: count === n ? '#F1EADB' : 'transparent',
                  color: count === n ? '#2E2823' : '#A89B83',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Chart type toggle */}
        <div className="flex gap-0.5 rounded p-0.5" style={{ backgroundColor: '#E8DFCC' }}>
          {(['line', 'bar'] as const).map((ct) => (
            <button
              key={ct}
              onClick={() => setChartType(ct)}
              className="px-2.5 py-1 rounded-sm text-xs font-sans transition-colors duration-200 cursor-pointer border-none"
              style={{
                backgroundColor: chartType === ct ? '#F1EADB' : 'transparent',
                color: chartType === ct ? '#2E2823' : '#A89B83',
                fontWeight: chartType === ct ? 600 : 400,
              }}
            >
              {ct === 'line' ? t('折线', 'Line') : t('柱状', 'Bar')}
            </button>
          ))}
        </div>
      </div>

      {/* 3×2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {CAT_ORDER.map((id) => {
          const cat = catMap.get(id)
          const name = cat?.name?.[language] ?? id
          return (
            <MiniChart
              key={id}
              categoryId={id}
              categoryName={name}
              buckets={buckets}
              periodType={periodType}
              budget={cat?.weeklyBudget ?? 0}
              chartType={chartType}
              language={language}
            />
          )
        })}
      </div>
    </div>
  )
}
