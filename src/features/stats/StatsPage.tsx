import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays } from 'date-fns'
import { addWeeks, formatMonthDay, getWeekStart } from '@/domain/time'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useWeekFromURL } from '@/features/week-view/hooks/useWeekFromURL'
import { WeekStats } from '@/features/week-view/WeekStats'
import { cn } from '@/lib/utils'

export function StatsPage() {
  const { weekStart, setWeekStart } = useWeekFromURL()

  const loadWeek       = useEventStore((s) => s.loadWeek)
  const loadCategories = useCategoryStore((s) => s.loadCategories)
  const loadSettings   = useAppSettingsStore((s) => s.loadSettings)
  const language       = useAppSettingsStore((s) => s.settings.language)

  useEffect(() => {
    void loadCategories()
    void loadSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { void loadWeek(weekStart) }, [weekStart, loadWeek])

  const weekEnd         = addDays(weekStart, 6)
  const rangeLabel      = `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}, ${weekEnd.getFullYear()}`
  const currentWeekStart = getWeekStart(new Date(), 1)
  const isOnCurrentWeek  = weekStart.getTime() === currentWeekStart.getTime()

  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  return (
    <div className="h-full flex flex-col bg-surface-base text-text-primary overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors duration-200"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </Link>
          <h1 className="font-serif text-lg text-text-primary">
            {t('时间统计', 'Time Stats')}
          </h1>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors duration-200 cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>

          <button
            onClick={() => setWeekStart(currentWeekStart)}
            disabled={isOnCurrentWeek}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-sans transition-colors duration-200',
              isOnCurrentWeek
                ? 'text-text-tertiary cursor-not-allowed'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised cursor-pointer',
            )}
          >
            {t('本周', 'This week')}
          </button>

          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors duration-200 cursor-pointer"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Week range subtitle */}
      <p className="px-6 pt-4 text-xs font-sans text-text-tertiary">
        {rangeLabel}
      </p>

      {/* Stats content */}
      <div className="flex-1 px-6 py-4">
        <WeekStats weekStart={weekStart} />
      </div>
    </div>
  )
}
