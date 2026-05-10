import { useMemo, useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { cn } from '@/lib/utils'
import { RechartsTooltip } from './RechartsTooltip'
import type { Category, CategoryId } from '@/domain/category'
import type { DataMaturity } from '@/domain/maturity'
import type { Granularity, Bucket } from '@/hooks/useStatsAggregation'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']
const STORAGE_KEY = 'cailens-trend-categories'
const TOTAL_STORAGE_KEY = 'cailens-trend-total'

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

function loadTotal(): boolean {
  try {
    const raw = localStorage.getItem(TOTAL_STORAGE_KEY)
    if (raw !== null) return raw === 'true'
  } catch { /* ignore */ }
  return true
}

function saveTotal(v: boolean) {
  try {
    localStorage.setItem(TOTAL_STORAGE_KEY, String(v))
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
  const [showTotal, setShowTotal] = useState<boolean>(loadTotal)

  useEffect(() => {
    saveSelection(selected)
  }, [selected])

  useEffect(() => {
    saveTotal(showTotal)
  }, [showTotal])

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
      row.total = ((row.accent as number) || 0) + ((row.sage as number) || 0)
      return row
    })
  }, [history, periodType])

  const dynamicMax = useMemo(() => {
    if (chartData.length === 0) return 80
    let maxVal = 0
    for (const row of chartData) {
      for (const id of selected) {
        const v = row[id] as number
        if (v > maxVal) maxVal = v
      }
      if (showTotal) {
        const totalV = (row.total as number) || 0
        if (totalV > maxVal) maxVal = totalV
      }
    }
    if (maxVal === 0) return 80
    const scaled = maxVal * 1.15
    return Math.ceil(scaled / 10) * 10
  }, [chartData, selected, showTotal])

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
    <div className="h-full flex flex-col">
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

        {/* Separator */}
        <span className="w-px h-4 bg-border-subtle mx-1" />

        {/* Total investment toggle */}
        <button
          onClick={() => setShowTotal((prev) => !prev)}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans transition-colors duration-200 cursor-pointer border',
            showTotal
              ? 'border-border-default bg-surface-raised text-text-primary font-medium'
              : 'border-border-subtle text-text-tertiary hover:text-text-secondary',
          )}
        >
          {language === 'zh' ? '投入合计' : 'Core Total'}
          <span className="text-[9px] text-event-accent-fill font-semibold leading-none ml-0.5">新</span>
        </button>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 72, left: 0, bottom: 8 }}>
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
              domain={[0, dynamicMax]}
            />
            <Tooltip content={<RechartsTooltip decimals={1} />} />

            {/* Stacked areas for accent + sage when total investment is on */}
            {showTotal && (
              <>
                {selected.includes('accent') && (
                  <Area
                    dataKey="accent"
                    stackId="total"
                    fill="var(--event-accent-fill)"
                    fillOpacity={0.25}
                    stroke="var(--event-accent-fill)"
                    strokeWidth={1}
                    name={catMap.get('accent')?.name?.[language] ?? 'accent'}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                )}
                {selected.includes('sage') && (
                  <Area
                    dataKey="sage"
                    stackId="total"
                    fill="var(--event-sage-fill)"
                    fillOpacity={0.25}
                    stroke="var(--event-sage-fill)"
                    strokeWidth={1}
                    name={catMap.get('sage')?.name?.[language] ?? 'sage'}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                )}
                <Line
                  dataKey="total"
                  name={language === 'zh' ? '投入合计' : 'Core Total'}
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  connectNulls={false}
                />
              </>
            )}

            {/* Lines for categories not rendered as stacked areas */}
            {selected
              .filter((id) => !showTotal || (id !== 'accent' && id !== 'sage'))
              .map((id) => {
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
                  value: `${language === 'zh' ? '预算' : 'Budget'} ${budgetLine.toFixed(1)}h`,
                  position: 'right',
                  fill: 'var(--color-text-warning)',
                  fontSize: 10,
                }}
              />
            )}
          </ComposedChart>
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
