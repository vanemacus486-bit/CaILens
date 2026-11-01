import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useCategoryStore } from '@/stores/categoryStore'
import { useEventStore } from '@/stores/eventStore'
import { getDataMaturity } from '@/domain/maturity'
import { useStatsAggregation } from '@/hooks/useStatsAggregation'
import { useShortcutManager } from '@/hooks/useShortcutManager'
import type { CategoryId } from '@/domain/category'
import type { ShortcutAction } from '@/domain/shortcuts'
import { CategoryTrendChart } from '@/components/stats/charts/CategoryTrendChart'
import { HabitTrendCard } from '@/components/stats/charts/HabitTrendCard'
import { StatsHeader } from '@/components/stats/charts/StatsHeader'
import { StatsRail } from '@/components/stats/charts/StatsRail'
import { useReviewQuery } from '@/components/stats/charts/useReviewQuery'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']
const STORAGE_KEY = 'cailens-trend-categories'
const DAY_MS = 24 * 60 * 60 * 1000

const SEGMENTS = [
  { id: 'day', label: '日' },
  { id: 'week', label: '周' },
  { id: 'month', label: '月' },
]

function loadSelection(): CategoryId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const unique = [...new Set(parsed)] as CategoryId[]
        const valid = unique.filter((v) => CATEGORY_IDS.includes(v))
        if (valid.length > 0) return valid
      }
    }
  } catch { /* localStorage 不可用时退回默认，不影响渲染 */ }
  return ['accent']
}

const TITLES: Record<string, string> = { day: '日趋势', week: '周趋势', month: '月趋势' }

/** 步进按钮的 tooltip / aria-label，随粒度变化 */
const STEP_LABELS: Record<string, { prev: string; next: string }> = {
  day: { prev: '前一天', next: '后一天' },
  week: { prev: '前一周', next: '后一周' },
  month: { prev: '前一月', next: '后一月' },
}

/** 当前锚点覆盖的日期区间，显示在标题下方 */
function rangeLabelOf(period: string, anchor: Date): string {
  if (period === 'day') return format(anchor, 'yyyy.MM.dd')
  if (period === 'month') return format(anchor, 'yyyy.MM')
  const end = new Date(anchor.getTime() + 6 * DAY_MS)
  return `${format(anchor, 'MM.dd')} – ${format(end, 'MM.dd')}`
}

export function TrendView() {
  const { period, anchor, setPeriod, setDate } = useReviewQuery()
  const rangeEvents = useEventStore((s) => s.rangeEvents)
  const categories = useCategoryStore((s) => s.categories)
  const [selected, setSelected] = useState<CategoryId[]>(loadSelection)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selected)) } catch { /* 同上 */ }
  }, [selected])

  const lookback = period === 'day' ? 14 : period === 'week' ? 8 : 12
  const { history } = useStatsAggregation({ granularity: period, anchorDate: anchor, lookbackBuckets: lookback })
  const maturity = useMemo(() => getDataMaturity(rangeEvents), [rangeEvents])

  const toggle = useCallback((id: CategoryId) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.length === 1 ? prev : prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }, [])

  /** 按当前粒度前后移动一个周期：日 ±1 天、周 ±7 天、月 ±1 月 */
  const step = useCallback((dir: -1 | 1) => {
    const d = new Date(anchor.getTime())
    if (period === 'day') d.setDate(d.getDate() + dir)
    else if (period === 'week') d.setDate(d.getDate() + 7 * dir)
    else d.setMonth(d.getMonth() + dir)
    setDate(d)
  }, [anchor, period, setDate])

  const rangeLabel = useMemo(() => rangeLabelOf(period, anchor), [period, anchor])

  // 分类色与周期步进的快捷键随视图走：只有当前视图挂载时才注册，
  // 免得两个视图抢同一个键（暖色在趋势是多选，在热力是单选）。
  const shortcutHandlers = useMemo<Partial<Record<ShortcutAction, () => void>>>(() => ({
    statsColor1: () => toggle(CATEGORY_IDS[0]),
    statsColor2: () => toggle(CATEGORY_IDS[1]),
    statsColor3: () => toggle(CATEGORY_IDS[2]),
    statsColor4: () => toggle(CATEGORY_IDS[3]),
    statsColor5: () => toggle(CATEGORY_IDS[4]),
    statsColor6: () => toggle(CATEGORY_IDS[5]),
    statsPrevSeg: () => step(-1),
    statsNextSeg: () => step(1),
  }), [toggle, step])

  useShortcutManager(shortcutHandlers)

  return (
    <>
      <StatsHeader
        title={TITLES[period] ?? '周趋势'}
        subtitle={rangeLabel}
        segments={SEGMENTS}
        value={period}
        onChange={setPeriod}
        rail={<StatsRail mode="multi" selected={selected} onToggle={toggle} />}
        inlineControls
        onStep={step}
        stepLabel={STEP_LABELS[period]}
      />
      <div className="time-category-stack">
        <CategoryTrendChart
          history={history}
          categories={categories}
          periodType={period}
          maturity={maturity}
          selected={selected}
        />
        <HabitTrendCard />
      </div>
    </>
  )
}
