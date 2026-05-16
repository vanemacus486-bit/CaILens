import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
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
const CAT_STORAGE_KEY = 'cailens-trend-categories'
const GROUPS_STORAGE_KEY = 'cailens-trend-groups'

const GROUP_LINE_COLORS = ['var(--accent)', 'var(--color-text-info)']

interface MergedGroup {
  id: string
  nameZh: string
  nameEn: string
  categoryIds: CategoryId[]
  enabled: boolean
}

function defaultGroups(): MergedGroup[] {
  return [
    { id: 'group-1', nameZh: '投入合计', nameEn: 'Core Total', categoryIds: ['accent', 'sage'], enabled: true },
    { id: 'group-2', nameZh: '投入合计 2', nameEn: 'Core Total 2', categoryIds: [], enabled: false },
  ]
}

function loadSelection(): CategoryId[] {
  try {
    const raw = localStorage.getItem(CAT_STORAGE_KEY)
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
  try { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}

function loadGroups(): MergedGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length === 2) return parsed as MergedGroup[]
    }
  } catch { /* ignore */ }
  return defaultGroups()
}

function saveGroups(groups: MergedGroup[]) {
  try { localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups)) } catch { /* ignore */ }
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
  const [groups, setGroups] = useState<MergedGroup[]>(loadGroups)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const editRef = useRef<HTMLDivElement>(null)

  useEffect(() => { saveSelection(selected) }, [selected])
  useEffect(() => { saveGroups(groups) }, [groups])

  // Close editor on outside click
  useEffect(() => {
    if (!editingGroupId) return
    const handler = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditingGroupId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editingGroupId])

  const toggleCategory = useCallback((id: CategoryId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }, [])

  const toggleGroup = useCallback((groupId: string) => {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, enabled: !g.enabled } : g))
  }, [])

  const updateGroup = useCallback((groupId: string, patch: Partial<MergedGroup>) => {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, ...patch } : g))
  }, [])

  const catMap = useMemo(() => {
    const map = new Map<CategoryId, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  const enabledGroups = useMemo(() => groups.filter((g) => g.enabled), [groups])

  const categoriesInEnabledGroups = useMemo(() => {
    const set = new Set<CategoryId>()
    for (const g of enabledGroups) {
      for (const id of g.categoryIds) set.add(id)
    }
    return set
  }, [enabledGroups])

  const chartData = useMemo(() => {
    return history.map((b) => {
      const row: Record<string, string | number> = {
        label: formatBucketLabel(b, periodType),
      }
      for (const id of CATEGORY_IDS) {
        row[id] = b.byCategory[id] ?? 0
      }
      for (const g of groups) {
        let sum = 0
        for (const id of g.categoryIds) {
          sum += (b.byCategory[id] as number) ?? 0
        }
        row[groupDataKey(g.id)] = sum
      }
      return row
    })
  }, [history, periodType, groups])

  const dynamicMax = useMemo(() => {
    if (chartData.length === 0) return 80
    let maxVal = 0
    for (const row of chartData) {
      for (const id of selected) {
        const v = row[id] as number
        if (v > maxVal) maxVal = v
      }
      for (const g of enabledGroups) {
        const v = (row[groupDataKey(g.id)] as number) || 0
        if (v > maxVal) maxVal = v
      }
    }
    if (maxVal === 0) return 80
    const scaled = maxVal * 1.15
    return Math.ceil(scaled / 10) * 10
  }, [chartData, selected, enabledGroups])

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
  }, [categories, selected, periodType, catMap])

  if (maturity.maturityLevel === 'cold') {
    return (
      <div className="flex items-center justify-center min-h-[280px] text-text-tertiary text-sm font-sans">
        {language === 'zh'
          ? '记录天数不足，趋势图需要至少 3 天数据'
          : 'Not enough data — trend chart needs at least 3 days of records'}
      </div>
    )
  }

  const editingGroup = editingGroupId ? groups.find((g) => g.id === editingGroupId) : null

  return (
    <div className="h-full flex flex-col">
      {/* Category selector chips */}
      <div className="flex flex-nowrap overflow-x-auto items-center gap-1.5 mb-4 pb-1 scrollbar-hide">
        <span className="text-xs text-text-tertiary font-sans mr-1 flex-shrink-0">
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
                'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans transition-colors duration-200 cursor-pointer border flex-shrink-0',
                active
                  ? 'border-transparent text-white'
                  : 'border-border-subtle text-text-secondary hover:text-text-primary',
              )}
              style={active ? { backgroundColor: `var(--event-${id}-fill)` } : undefined}
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
        <span className="w-px h-4 bg-border-subtle mx-1 flex-shrink-0" />
        <span className="text-[9px] text-event-accent-fill font-semibold leading-none flex-shrink-0">新</span>

        {/* Merged group chips */}
        {groups.map((group, idx) => (
          <div key={group.id} className="relative flex-shrink-0 flex items-center gap-0.5">
            <button
              onClick={() => toggleGroup(group.id)}
              onContextMenu={(e) => { e.preventDefault(); setEditingGroupId(group.id) }}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-l text-xs font-sans transition-colors duration-200 cursor-pointer border flex-shrink-0',
                group.enabled
                  ? 'border-border-default bg-surface-raised text-text-primary font-medium'
                  : 'border-border-subtle text-text-tertiary hover:text-text-secondary',
              )}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: GROUP_LINE_COLORS[idx] ?? GROUP_LINE_COLORS[0] }}
              />
              {language === 'zh' ? group.nameZh : group.nameEn}
            </button>
            <button
              onClick={() => setEditingGroupId(editingGroupId === group.id ? null : group.id)}
              className={cn(
                'px-1 py-1 rounded-r border border-l-0 text-xs transition-colors duration-200 cursor-pointer flex-shrink-0',
                group.enabled
                  ? 'border-border-default bg-surface-raised text-text-tertiary hover:text-text-primary'
                  : 'border-border-subtle text-text-tertiary hover:text-text-secondary',
              )}
              title={language === 'zh' ? '编辑合并组' : 'Edit merged group'}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M2 8L2 6.5 8 1 9 2 3 8 2 8Z" />
                <path d="M7 2L8 3" />
              </svg>
            </button>

            {/* Config popover */}
            {editingGroupId === group.id && editingGroup && (
              <div
                ref={editRef}
                className="absolute top-full mt-1 left-0 z-50 w-52 bg-surface-raised border border-border-default rounded-lg shadow-lg p-3 space-y-2.5"
              >
                <div className="space-y-1">
                  <label className="text-[10px] text-text-tertiary font-sans">
                    {language === 'zh' ? '名称' : 'Name'}
                  </label>
                  <div className="space-y-1">
                    <input
                      value={editingGroup.nameZh}
                      onChange={(e) => updateGroup(group.id, { nameZh: e.target.value })}
                      placeholder={language === 'zh' ? '中文名' : 'Chinese name'}
                      className="w-full px-2 py-1 text-xs font-sans rounded border border-border-subtle bg-surface-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-default"
                    />
                    <input
                      value={editingGroup.nameEn}
                      onChange={(e) => updateGroup(group.id, { nameEn: e.target.value })}
                      placeholder={language === 'zh' ? '英文名' : 'English name'}
                      className="w-full px-2 py-1 text-xs font-sans rounded border border-border-subtle bg-surface-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-default"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-text-tertiary font-sans">
                    {language === 'zh' ? '包含分类' : 'Categories'}
                  </label>
                  <div className="space-y-0.5">
                    {CATEGORY_IDS.map((id) => {
                      const cat = catMap.get(id)
                      const checked = editingGroup.categoryIds.includes(id)
                      return (
                        <label
                          key={id}
                          className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-surface-sunken cursor-pointer text-xs font-sans text-text-secondary"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? editingGroup.categoryIds.filter((x) => x !== id)
                                : [...editingGroup.categoryIds, id]
                              updateGroup(group.id, { categoryIds: next })
                            }}
                            className="w-3 h-3 rounded accent-[var(--event-accent-fill)]"
                          />
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: `var(--event-${id}-fill)` }}
                          />
                          {cat?.name?.[language] ?? id}
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
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

            {/* Stacked areas + total lines for each enabled merged group */}
            {enabledGroups.map((group, gi) => {
              const groupCategories = group.categoryIds.filter((id) => selected.includes(id))
              return (
                <g key={group.id}>
                  {groupCategories.map((id) => (
                    <Area
                      key={id}
                      dataKey={id}
                      stackId={group.id}
                      fill={`var(--event-${id}-fill)`}
                      fillOpacity={0.25}
                      stroke={`var(--event-${id}-fill)`}
                      strokeWidth={1}
                      name={catMap.get(id)?.name?.[language] ?? id}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  ))}
                  <Line
                    dataKey={groupDataKey(group.id)}
                    name={language === 'zh' ? group.nameZh : group.nameEn}
                    stroke={GROUP_LINE_COLORS[gi] ?? GROUP_LINE_COLORS[0]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                </g>
              )
            })}

            {/* Individual lines for selected categories NOT in any enabled group */}
            {selected
              .filter((id) => !categoriesInEnabledGroups.has(id))
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

function groupDataKey(groupId: string): string {
  return `__group__${groupId}`
}
