import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { WeekStats } from '@/domain/stats'

interface WeekStatsSidebarProps {
  stats: WeekStats
  streak: number
}

export function WeekStatsSidebar({ stats, streak }: WeekStatsSidebarProps) {
  const categories = useCategoryStore((s) => s.categories)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  if (categories.length === 0) return null

  const activeStats = stats.byCategory.filter((s) => s.minutes > 0)
  const totalHours = (stats.totalMinutes / 60).toFixed(0)

  return (
    <div className="w-[168px] border-l border-border-subtle px-4 py-5 flex flex-col gap-5 flex-shrink-0">
      {/* Total hours */}
      <div>
        <div
          className="text-[11px] font-sans font-semibold uppercase tracking-[0.1em] text-text-tertiary mb-3.5 select-none"
        >
          {t('本周', 'This week')}
        </div>
        <div className="font-mono text-[26px] font-medium text-text-primary tracking-[-0.02em] leading-none">
          {totalHours}h
        </div>
        <div className="font-sans text-[11px] text-text-secondary mt-0.5 select-none">
          {t('已记录', 'logged so far')}
        </div>
      </div>

      {/* Category breakdown */}
      {activeStats.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {activeStats.map((stat) => {
            const cat = categories.find((c) => c.id === stat.categoryId)
            if (!cat) return null
            const hrs = (stat.minutes / 60).toFixed(0)
            const pct = stat.percentage

            return (
              <div key={stat.categoryId}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `var(--event-${cat.id}-fill)` }}
                    />
                    <span className="font-sans text-[11px] text-text-secondary">
                      {cat.name[language]}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-text-secondary">
                    {hrs}h
                  </span>
                </div>
                <div className="h-[3px] bg-border-subtle rounded-sm">
                  <div
                    className="h-full rounded-sm transition-all duration-500"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: `var(--event-${cat.id}-fill)`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {activeStats.length === 0 && (
        <p className="text-[11px] font-sans text-text-tertiary">
          {t('本周暂无记录', 'No events this week')}
        </p>
      )}

      {/* Streak */}
      <div className="mt-auto pt-4 border-t border-border-subtle">
        <div
          className="text-[11px] font-sans font-semibold uppercase tracking-[0.1em] text-text-tertiary mb-2.5 select-none"
        >
          {t('连续记录', 'Streak')}
        </div>
        <div className="font-mono text-[22px] text-accent leading-none">
          {streak} wk
        </div>
        <div className="font-sans text-[11px] text-text-secondary mt-0.5 select-none">
          {t('持续记录周数', 'consecutive logging')}
        </div>
      </div>
    </div>
  )
}
