import { useEffect } from 'react'
import { startOfMonth, addMonths, subMonths } from 'date-fns'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useStatsAggregation } from '@/hooks/useStatsAggregation'
import { TrendChart12M } from '@/components/stats/TrendChart12M'
import { MonthCompareCards } from '@/components/stats/MonthCompareCards'

interface MonthStatsViewProps {
  monthAnchor: Date
}

export function MonthStatsView({ monthAnchor }: MonthStatsViewProps) {
  const loadRange      = useEventStore((s) => s.loadRange)
  const loadCategories = useCategoryStore((s) => s.loadCategories)
  const loadSettings   = useAppSettingsStore((s) => s.loadSettings)

  useEffect(() => {
    void loadCategories()
    void loadSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const rangeStart = startOfMonth(subMonths(monthAnchor, 11)).getTime()
    const rangeEnd   = startOfMonth(addMonths(monthAnchor, 1)).getTime()
    void loadRange(rangeStart, rangeEnd)
  }, [monthAnchor, loadRange])

  const { current, history, previous } = useStatsAggregation({
    granularity: 'month',
    anchorDate: monthAnchor,
    lookbackBuckets: 12,
  })

  return (
    <div className="flex-1 w-full px-8 py-8 overflow-y-auto space-y-6">
      <TrendChart12M history={history} />
      <MonthCompareCards current={current} previous={previous} />
    </div>
  )
}
