import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { startOfMonth, addMonths } from 'date-fns'
import { addWeeks, formatISODate, getWeekStart, parseISODate } from '@/domain/time'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { WeekStatsView } from '@/pages/stats/WeekStatsView'
import { MonthStatsView } from '@/pages/stats/MonthStatsView'
import { cn } from '@/lib/utils'

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/

function parseWeekFromURL(param: string | null): Date {
  if (param && DATE_RX.test(param)) {
    const d = parseISODate(param)
    if (!isNaN(d.getTime())) return getWeekStart(d, 1)
  }
  return getWeekStart(new Date(), 1)
}

export function StatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const loadCategories = useCategoryStore((s) => s.loadCategories)
  const loadSettings   = useAppSettingsStore((s) => s.loadSettings)
  const language       = useAppSettingsStore((s) => s.settings.language)

  useEffect(() => {
    void loadCategories()
    void loadSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const view = searchParams.get('view') === 'month' ? 'month' : 'week'

  const weekParam  = searchParams.get('week')
  const weekAnchor = useMemo(() => parseWeekFromURL(weekParam), [weekParam])

  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) next.delete(k)
      else next.set(k, v)
    }
    setSearchParams(next, { replace: true })
  }

  const setView = (v: 'week' | 'month') => {
    updateParams({ view: v === 'month' ? 'month' : undefined })
  }

  const navigateAnchor = (dir: -1 | 1) => {
    if (view === 'week') {
      updateParams({ week: formatISODate(addWeeks(weekAnchor, dir)) })
    } else {
      setMonthAnchor((prev) => addMonths(prev, dir))
    }
  }

  const goToday = () => {
    if (view === 'week') {
      const current = getWeekStart(new Date(), 1)
      updateParams({ week: formatISODate(current) })
    } else {
      setMonthAnchor(startOfMonth(new Date()))
    }
  }

  const currentWeekStart = getWeekStart(new Date(), 1)
  const isOnCurrentWeek  = weekAnchor.getTime() === currentWeekStart.getTime()
  const currentMonthStart = startOfMonth(new Date())
  const isOnCurrentMonth  = monthAnchor.getTime() === currentMonthStart.getTime()
  const isOnCurrent = view === 'week' ? isOnCurrentWeek : isOnCurrentMonth

  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  return (
    <div className="h-full flex flex-col bg-surface-base text-text-primary">
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

        {/* View toggle + navigation */}
        <div className="flex items-center gap-3">
          {/* Week / Month toggle */}
          <div className="flex items-center rounded-lg bg-surface-sunken p-0.5">
            <button
              onClick={() => setView('week')}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-sans transition-colors duration-200 cursor-pointer',
                view === 'week'
                  ? 'bg-surface-base text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {t('周', 'Week')}
            </button>
            <button
              onClick={() => setView('month')}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-sans transition-colors duration-200 cursor-pointer',
                view === 'month'
                  ? 'bg-surface-base text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {t('月', 'Month')}
            </button>
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateAnchor(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors duration-200 cursor-pointer"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>

            <button
              onClick={goToday}
              disabled={isOnCurrent}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-sans transition-colors duration-200',
                isOnCurrent
                  ? 'text-text-tertiary cursor-not-allowed'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised cursor-pointer',
              )}
            >
              {view === 'week' ? t('本周', 'This week') : t('本月', 'This month')}
            </button>

            <button
              onClick={() => navigateAnchor(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors duration-200 cursor-pointer"
            >
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'week' ? (
        <WeekStatsView weekAnchor={weekAnchor} />
      ) : (
        <MonthStatsView monthAnchor={monthAnchor} />
      )}
    </div>
  )
}
