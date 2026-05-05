import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, addDays, addMonths, addQuarters, addYears } from 'date-fns'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatISODate, parseISODate } from '@/domain/time'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { getDataMaturity } from '@/domain/maturity'
import type { DataMaturity } from '@/domain/maturity'
import type { Granularity } from '@/hooks/useStatsAggregation'
import { useStatsAggregation } from '@/hooks/useStatsAggregation'
import { CategoryBarChart } from '@/components/stats/CategoryBarChart'
import { MultiPeriodComparison } from '@/components/stats/MultiPeriodComparison'
import { CategoryTrendChart } from '@/components/stats/CategoryTrendChart'
import { DayIntensityHeatmap } from '@/components/stats/DayIntensityHeatmap'

type Period = Exclude<Granularity, 'all'>
type ViewMode = 'bar' | 'compare' | 'trend' | 'heatmap'

const PERIODS: { key: Granularity; label: string; labelZh: string }[] = [
  { key: 'week', label: 'Week', labelZh: '周' },
  { key: 'month', label: 'Month', labelZh: '月' },
  { key: 'quarter', label: 'Quarter', labelZh: '季' },
  { key: 'year', label: 'Year', labelZh: '年' },
  { key: 'all', label: 'All-time', labelZh: '全部' },
]

const VIEWS: { key: ViewMode; label: string; labelZh: string }[] = [
  { key: 'bar', label: 'Bars', labelZh: '条形图' },
  { key: 'compare', label: 'Compare', labelZh: '对比' },
  { key: 'trend', label: 'Trend', labelZh: '趋势' },
  { key: 'heatmap', label: 'Heatmap', labelZh: '热力图' },
]

function getAnchor(period: Granularity, date: Date): Date {
  switch (period) {
    case 'week':    return startOfWeek(date, { weekStartsOn: 1 })
    case 'month':   return startOfMonth(date)
    case 'quarter': return startOfQuarter(date)
    case 'year':    return startOfYear(date)
    case 'all':     return new Date(0)
  }
}

function shiftAnchor(anchor: Date, period: Period, dir: -1 | 1): Date {
  switch (period) {
    case 'week':    return addDays(anchor, dir * 7)
    case 'month':   return addMonths(anchor, dir)
    case 'quarter': return addQuarters(anchor, dir)
    case 'year':    return addYears(anchor, dir)
  }
}

export function StatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const loadRange      = useEventStore((s) => s.loadRange)
  const rangeEvents    = useEventStore((s) => s.rangeEvents)
  const isLoading      = useEventStore((s) => s.isLoading)
  const loadError      = useEventStore((s) => s.loadError)
  const loadCategories = useCategoryStore((s) => s.loadCategories)
  const categories     = useCategoryStore((s) => s.categories)
  const loadSettings   = useAppSettingsStore((s) => s.loadSettings)
  const language       = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  useEffect(() => {
    fireAndForget(loadCategories(), 'load categories')
    fireAndForget(loadSettings(), 'load settings')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Parse URL params
  const period  = (searchParams.get('period') as Granularity | null) ?? 'week'
  const dateStr = searchParams.get('date') ?? formatISODate(new Date())
  const view    = (searchParams.get('view') as ViewMode | null) ?? 'bar'

  const date = useMemo(() => {
    const d = parseISODate(dateStr)
    return isNaN(d.getTime()) ? new Date() : d
  }, [dateStr])

  const anchor = useMemo(() => getAnchor(period, date), [period, date])

  // Data loading — broad range for all views
  useEffect(() => {
    const now = Date.now()
    fireAndForget(loadRange(now - 3 * 365 * 24 * 60 * 60_000, now), 'load stats range')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lookback buckets for history
  const lookback = period === 'all' ? 1 : period === 'week' ? 8 : period === 'month' ? 12 : period === 'quarter' ? 8 : 3

  const { current, history } = useStatsAggregation({
    granularity: period,
    anchorDate: anchor,
    lookbackBuckets: lookback,
  })

  const maturity = useMemo((): DataMaturity => getDataMaturity(rangeEvents), [rangeEvents])

  // URL helpers
  const updateParams = (upd: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(upd)) {
      if (v === undefined || v === '') next.delete(k)
      else next.set(k, v)
    }
    setSearchParams(next, { replace: true })
  }

  const setPeriod = (p: Granularity) => {
    updateParams({ period: p === 'week' ? undefined : p })
  }

  const setView = (v: ViewMode) => {
    updateParams({ view: v === 'bar' ? undefined : v })
  }

  const navigate = (dir: -1 | 1) => {
    if (period === 'all') return
    updateParams({ date: formatISODate(shiftAnchor(anchor, period as Period, dir)) })
  }

  const goToday = () => {
    updateParams({ date: formatISODate(new Date()) })
  }

  return (
    <div className="h-full flex flex-col bg-surface-base text-text-primary overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 h-[52px] px-4 md:px-12 border-b border-border-subtle bg-surface-base/96 backdrop-blur-[8px] flex-shrink-0">
        <Link
          to="/"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 flex-shrink-0"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Link>

        <span className="font-serif text-settings font-semibold text-accent tracking-[0.02em] flex-shrink-0">
          CaILens
        </span>

        <div className="w-px h-5 bg-border-subtle flex-shrink-0" />

        {/* View switcher */}
        <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 flex-shrink-0">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-sans font-medium transition-colors duration-200 cursor-pointer',
                view === v.key
                  ? 'bg-surface-base text-text-primary shadow-pill'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {language === 'zh' ? v.labelZh : v.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border-subtle flex-shrink-0" />

        {/* Period selector */}
        <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 flex-shrink-0">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-sans font-medium transition-colors duration-200 cursor-pointer',
                period === p.key
                  ? 'bg-surface-base text-text-primary shadow-pill'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {language === 'zh' ? p.labelZh : p.label}
            </button>
          ))}
        </div>

        {/* Navigation arrows */}
        {period !== 'all' && (
          <>
            <div className="w-px h-5 bg-border-subtle flex-shrink-0" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => navigate(-1)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer text-sm"
              >
                ‹
              </button>
              <button
                onClick={goToday}
                className="text-body-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-sunken transition-colors duration-200 cursor-pointer"
              >
                {t('今天', 'Today')}
              </button>
              <button
                onClick={() => navigate(1)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer text-sm"
              >
                ›
              </button>
            </div>
          </>
        )}

        {/* Period label for 'all' */}
        {period === 'all' && (
          <span className="text-body-xs text-text-tertiary flex-shrink-0">
            {t('全部时间', 'All time')}
          </span>
        )}
      </div>

      {/* Chart content area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px] flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-4 min-h-[400px] flex-1">
            <AlertCircle className="h-10 w-10 text-color-text-danger" />
            <p className="font-sans text-sm text-text-secondary max-w-md text-center">{loadError}</p>
            <button
              onClick={() => loadRange(Date.now() - 3 * 365 * 24 * 60 * 60_000, Date.now())}
              className="inline-flex items-center justify-center rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
            >
              {t('重试', 'Retry')}
            </button>
          </div>
        ) : (
          <div className="max-w-[1100px] mx-auto px-4 md:px-12 py-10 pb-20 flex-1 flex flex-col justify-center w-full">
            {view === 'bar' && (
              <CategoryBarChart
                current={current}
                categories={categories}
                periodType={period}
                language={language}
              />
            )}
            {view === 'compare' && (
              <MultiPeriodComparison
                history={history}
                categories={categories}
                periodType={period}
                language={language}
              />
            )}
            {view === 'trend' && (
              <CategoryTrendChart
                history={history}
                categories={categories}
                periodType={period}
                language={language}
                maturity={maturity}
              />
            )}
            {view === 'heatmap' && (
              <DayIntensityHeatmap
                current={current}
                rangeEvents={rangeEvents}
                language={language}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
