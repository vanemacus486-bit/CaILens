import { addDays } from 'date-fns'
import { getDayStart } from '@/domain/time'
import { computeWeekStats } from '@/domain/stats'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { StatsBar } from './StatsBar'

interface WeekStatsProps {
  weekStart: Date
}

export function WeekStats({ weekStart }: WeekStatsProps) {
  const events     = useEventStore((s) => s.events)
  const categories = useCategoryStore((s) => s.categories)
  const language   = useAppSettingsStore((s) => s.settings.language)

  // Hide until categories are loaded
  if (categories.length === 0) return null

  const weekStartMs = getDayStart(weekStart)
  const weekEndMs   = getDayStart(addDays(weekStart, 7))
  const stats       = computeWeekStats(events, categories, weekStartMs, weekEndMs)
  const totalHrs    = (stats.totalMinutes / 60).toFixed(1)

  return (
    <div className="border-b border-border-subtle bg-surface-base px-4 py-2">
      {/* Header: total recorded time */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-sans text-text-tertiary">
          {language === 'zh' ? '本周记录' : 'This week'}
        </span>
        <span className="text-xs font-mono text-text-secondary">
          {totalHrs}h
        </span>
      </div>

      {/* 各分类统计条 */}
      <div className="flex flex-col gap-1.5">
        {stats.byCategory
          .filter((s) => s.minutes > 0)
          .map((stat) => {
            const cat = categories.find((c) => c.id === stat.categoryId)
            if (!cat) return null
            return (
              <StatsBar
                key={stat.categoryId}
                category={cat}
                minutes={stat.minutes}
                percentage={stat.percentage}
                language={language}
              />
            )
          })}
        {stats.totalMinutes === 0 && (
          <p className="text-xs font-sans text-text-tertiary text-center py-1">
            {language === 'zh' ? '本周暂无记录' : 'No events this week'}
          </p>
        )}
      </div>
    </div>
  )
}
