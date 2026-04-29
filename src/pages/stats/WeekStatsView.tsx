import { useEffect } from 'react'
import { addDays } from 'date-fns'
import { formatMonthDay, getDayStart } from '@/domain/time'
import { computeWeekStats } from '@/domain/stats'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { WeekStats } from '@/features/week-view/WeekStats'

interface WeekStatsViewProps {
  weekAnchor: Date
}

export function WeekStatsView({ weekAnchor }: WeekStatsViewProps) {
  const categories     = useCategoryStore((s) => s.categories)
  const loadRange      = useEventStore((s) => s.loadRange)
  const rangeEvents    = useEventStore((s) => s.rangeEvents)
  const language       = useAppSettingsStore((s) => s.settings.language)

  const weekStartMs  = getDayStart(weekAnchor)
  const weekEndMs    = getDayStart(addDays(weekAnchor, 7))

  useEffect(() => {
    void loadRange(weekStartMs, weekEndMs)
  }, [weekStartMs, weekEndMs, loadRange])

  const weekEnd    = addDays(weekAnchor, 6)
  const rangeLabel = `${formatMonthDay(weekAnchor)} – ${formatMonthDay(weekEnd)}, ${weekEnd.getFullYear()}`

  const stats    = computeWeekStats(rangeEvents, categories, weekStartMs, weekEndMs)
  const totalHrs = (stats.totalMinutes / 60).toFixed(1)

  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  return (
    <div className="flex-1 w-full px-8 py-8 overflow-y-auto lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">
      {/* Hero column */}
      <div className="flex flex-col items-center lg:items-start gap-1 mb-8 lg:mb-0">
        <span className="font-serif text-5xl text-text-primary tabular-nums tracking-tight">
          {totalHrs}
          <span className="text-2xl text-text-secondary ml-0.5">h</span>
        </span>
        <span className="text-xs font-sans text-text-tertiary tracking-wide">
          {t('本周总记录', 'Total tracked')}
        </span>
        <span className="text-xs font-sans text-text-tertiary mt-1">
          {rangeLabel}
        </span>
      </div>

      {/* Cards column — PR 1 will add useStatsAggregation hook and mount HourHeatmap above */}
      <div className="lg:col-span-2 space-y-6">
        {/* PR 1: add useStatsAggregation + import HourHeatmap + <HourHeatmap bucket={current} /> */}
        <WeekStats stats={stats} />
      </div>
    </div>
  )
}
