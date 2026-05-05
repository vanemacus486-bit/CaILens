import { useMemo, useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { RechartsTooltip } from './RechartsTooltip'
import type { Category, CategoryId } from '@/domain/category'
import type { DataMaturity } from '@/domain/maturity'
import type { Granularity, Bucket } from '@/hooks/useStatsAggregation'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']
const STORAGE_KEY = 'cailens-trend-categories'

function loadSelection(): CategoryId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.every((v) => CATEGORY_IDS.includes(v))) {
        return parsed
      }
    }
  } catch { /* ignore */ }
  return ['accent']
}

function saveSelection(ids: CategoryId[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch { /* ignore */ }
}

function formatBucketLabel(bucket: Bucket, periodType: Granularity): string {
  const d = bucket.start
  if (periodType === 'week') return format(d, 'MM.dd')
  if (periodType === 'month') return format(d, 'yyyy-MM')
  if (periodType === 'quarter') return `Q${Math.ceil((d.getMonth() + 1) / 3)}`
  return format(d, 'yyyy')
}

interface CategoryTrendChartProps {
  history: Bucket[]
  categories: Category[]
  periodType: Granularity
  language: 'zh' | 'en'
  maturity: DataMaturity
}

export function CategoryTrendChart({
  history,
  categories,
  periodType,
  language,
  maturity,
}: CategoryTrendChartProps) {
  const [selected, setSelected] = useState<CategoryId[]>(loadSelection)

  useEffect(() => {
    saveSelection(selected)
  }, [selected])

  const toggleCategory = useCallback((id: CategoryId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }, [])

  const catMap = useMemo(() => {
    const map = new Map<CategoryId, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  const chartData = useMemo(() => {
    return history.map((b) => {
      const row: Record<string, string | number> = {
        label: formatBucketLabel(b, periodType),
      }
      for (const id of CATEGORY_IDS) {
        row[id] = b.byCategory[id] ?? 0
      }
      return row
    })
  }, [history, periodType])

  const budgetLine = useMemo(() => {
    if (categories.length === 0) return 0
    let total = 0
    let count = 0
    for (const id of selected) {
      const cat = catMap.get(id)
      if (cat && cat.weeklyBudget > 0) {
        const days = periodType === 'week' ? 7
          : periodType === 'month' ? 30.44
          : periodType === 'quarter' ? 91.3
          : periodType === 'year' ? 365.25
          : 365.25
        total += cat.weeklyBudget * (days / 7)
        count++
      }
    }
    return count > 0 ? total / count : 0
  }, [categories, selected, periodType, history, catMap])

  if (maturity.maturityLevel === 'cold') {
    return (
      <div className="flex items-center justify-center min-h-[280px] text-text-tertiary text-sm font-sans">
        {language === 'zh'
          ? '记录天数不足，趋势图需要至少 3 天数据'
          : 'Not enough data — trend chart needs at least 3 days of records'}
      </div>
    )
  }

  return (
    <div>
      {/* Category selector chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="text-xs text-text-tertiary font-sans mr-1">
          {language === 'zh' ? '分类' : 'Categories'}
        </span>
        {CATEGORY_IDS.map((id) => {
          const cat = catMap.get(id)
          const active = selected.includes(id)
          return (
            <button
              key={id}
              onClick={() => toggleCategory(id)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans transition-colors duration-200 cursor-pointer border',
                active
                  ? 'border-transparent text-white'
                  : 'border-border-subtle text-text-secondary hover:text-text-primary',
              )}
              style={
                active
                  ? { backgroundColor: `var(--event-${id}-fill)` }
                  : undefined
              }
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: `var(--event-${id}-fill)` }}
              />
              {cat?.name?.[language] ?? id}
            </button>
          )
        })}
      </div>

      {/* Chart */}
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}h`}
              width={48}
            />
            <Tooltip content={<RechartsTooltip decimals={1} />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter, sans-serif' }}
              iconType="circle"
              iconSize={8}
            />
            {CATEGORY_IDS.filter((id) => selected.includes(id)).map((id) => {
              const cat = catMap.get(id)
              return (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={cat?.name?.[language] ?? id}
                  stroke={`var(--event-${id}-fill)`}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  connectNulls={false}
                />
              )
            })}
            {budgetLine > 0 && (
              <ReferenceLine
                y={budgetLine}
                stroke="var(--color-text-warning)"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: language === 'zh' ? '预算' : 'budget',
                  position: 'right',
                  fill: 'var(--color-text-warning)',
                  fontSize: 10,
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {maturity.maturityLevel === 'warming' && (
        <p className="text-[11px] text-text-tertiary font-sans mt-3 text-center">
          {language === 'zh'
            ? '数据预热中，趋势仅供参考'
            : 'Data is still warming — trends are approximate'}
        </p>
      )}
    </div>
  )
}
