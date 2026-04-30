import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { WeekStats as WeekStatsData } from '@/domain/stats'
import { cn } from '@/lib/utils'

interface WeekStatsProps {
  stats: WeekStatsData
}

export function WeekStats({ stats }: WeekStatsProps) {
  const categories = useCategoryStore((s) => s.categories)
  const language   = useAppSettingsStore((s) => s.settings.language)

  if (categories.length === 0) return null

  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const activeStats = stats.byCategory.filter((s) => s.minutes > 0)

  if (activeStats.length === 0) {
    return (
      <p className="text-sm font-sans text-text-tertiary text-center py-12">
        {t('本周暂无记录', 'No events this week')}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
      {activeStats.map((stat) => {
        const cat = categories.find((c) => c.id === stat.categoryId)
        if (!cat) return null
        const hrs     = (stat.minutes / 60).toFixed(1)
        const pct     = stat.percentage.toFixed(1)
        const colorId = cat.id

        return (
          <div
            key={stat.categoryId}
            className="rounded-xl border border-border-subtle bg-surface-base px-4 py-3.5 flex flex-col gap-2.5"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: `var(--event-${colorId}-text)` }}
              />
              <span className="font-serif text-sm text-text-primary">
                {cat.name[language]}
              </span>
            </div>

            <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500')}
                style={{
                  width: `${Math.min(stat.percentage, 100)}%`,
                  backgroundColor: `var(--event-${colorId}-text)`,
                  opacity: 0.7,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-text-secondary">
                {hrs}h
              </span>
              <span className="text-xs font-mono text-text-tertiary">
                {pct}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
