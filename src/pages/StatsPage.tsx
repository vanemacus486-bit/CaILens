import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, addDays, addMonths, addQuarters, addYears } from 'date-fns'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatISODate, parseISODate } from '@/domain/time'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { getDataMaturity } from '@/domain/maturity'
import type { Granularity } from '@/hooks/useStatsAggregation'
import { useStatsAggregation } from '@/hooks/useStatsAggregation'
import { CategoryTrendChart } from '@/components/stats/CategoryTrendChart'
import { YearHeatmap } from '@/components/stats/YearHeatmap'
import { EasternStatsShell } from '@/components/stats/EasternStatsShell'

type Period = Exclude<Granularity, 'all'>
type ViewMode = 'trend' | 'heatmap'

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
  const categories     = useCategoryStore((s) => s.categories)
  const language       = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  // Parse URL params
  const period  = (searchParams.get('period') as Granularity | null) ?? 'week'
  const dateStr = searchParams.get('date') ?? formatISODate(new Date())
  const view    = (searchParams.get('view') as ViewMode | null) ?? 'trend'

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

  const { history } = useStatsAggregation({
    granularity: period,
    anchorDate: anchor,
    lookbackBuckets: lookback,
  })

  const maturity = useMemo(() => getDataMaturity(rangeEvents), [rangeEvents])

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
    updateParams({ view: v === 'trend' ? undefined : v })
  }

  const navigate = (dir: -1 | 1) => {
    if (period === 'all') return
    updateParams({ date: formatISODate(shiftAnchor(anchor, period as Period, dir)) })
  }

  const goToday = () => {
    updateParams({ date: formatISODate(new Date()) })
  }

  const isHeatmap = view === 'heatmap'

  return (
    <EasternStatsShell
      language={language}
      currentView={view}
      onViewChange={setView}
      period={isHeatmap ? 'year' : period}
      onPeriodChange={isHeatmap ? undefined : setPeriod}
      onNavigate={isHeatmap ? undefined : navigate}
      onGoToday={isHeatmap ? undefined : goToday}
      showNavigation={!isHeatmap}
    >
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px] flex-1">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#A89B83' }} />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center gap-4 min-h-[400px] flex-1">
          <AlertCircle className="h-10 w-10" style={{ color: '#B53535' }} />
          <p className="text-sm max-w-md text-center" style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#6F6453' }}>
            {loadError}
          </p>
          <button
            onClick={() => loadRange(Date.now() - 3 * 365 * 24 * 60 * 60_000, Date.now())}
            className="inline-flex items-center justify-center rounded-lg text-white px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer border-none"
            style={{ backgroundColor: '#C8693E' }}
          >
            {t('重试', 'Retry')}
          </button>
        </div>
      ) : (
        <>
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
            <YearHeatmap
              rangeEvents={rangeEvents}
              categories={categories}
              language={language}
            />
          )}
        </>
      )}
    </EasternStatsShell>
  )
}
