import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { startOfDay, startOfWeek, startOfMonth, addDays, addMonths } from 'date-fns'
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
import { SleepScatterChart } from '@/components/stats/SleepScatterChart'
import { EasternStatsShell } from '@/components/stats/EasternStatsShell'

type ViewMode = 'trend' | 'heatmap' | 'sleep'

function getAnchor(period: Granularity, date: Date): Date {
  switch (period) {
    case 'day':     return startOfDay(date)
    case 'week':    return startOfWeek(date, { weekStartsOn: 1 })
    case 'month':   return startOfMonth(date)
  }
}

function shiftAnchor(anchor: Date, period: Granularity, dir: -1 | 1): Date {
  switch (period) {
    case 'day':     return addDays(anchor, dir)
    case 'week':    return addDays(anchor, dir * 7)
    case 'month':   return addMonths(anchor, dir)
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

  // Tab title
  useEffect(() => {
    document.title = language === 'zh' ? 'CaILens · 统计' : 'CaILens · Statistics'
  }, [language])

  // Lookback buckets for history
  const lookback = period === 'day' ? 14 : period === 'week' ? 8 : 12

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
    updateParams({ date: formatISODate(shiftAnchor(anchor, period, dir)) })
  }

  return (
    <EasternStatsShell
      language={language}
      currentView={view}
      onViewChange={setView}
    >
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px] flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center gap-4 min-h-[400px] flex-1">
          <AlertCircle className="h-10 w-10 text-color-text-danger" />
          <p className="text-sm max-w-md text-center text-text-secondary" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
            {loadError}
          </p>
          <button
            onClick={() => loadRange(Date.now() - 3 * 365 * 24 * 60 * 60_000, Date.now())}
            className="inline-flex items-center justify-center rounded-lg text-white bg-accent px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer border-none"
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
              onNavigate={navigate}
              onPeriodChange={setPeriod}
            />
          )}
          {view === 'heatmap' && (
            <YearHeatmap
              rangeEvents={rangeEvents}
              categories={categories}
              language={language}
            />
          )}
          {view === 'sleep' && (
            <SleepScatterChart
              rangeEvents={rangeEvents}
              language={language}
            />
          )}

        </>
      )}
    </EasternStatsShell>
  )
}
