import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { startOfDay, startOfWeek, startOfMonth, addDays, addMonths } from 'date-fns'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatISODate, parseISODate } from '@/domain/time'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useDailyContextStore } from '@/stores/dailyContextStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { getDataMaturity } from '@/domain/maturity'
import type { Granularity } from '@/hooks/useStatsAggregation'
import { useStatsAggregation } from '@/hooks/useStatsAggregation'
import { CategoryTrendChart } from '@/components/stats/CategoryTrendChart'
import { YearHeatmap } from '@/components/stats/YearHeatmap'
import { SleepScatterChart } from '@/components/stats/SleepScatterChart'
import { DietCalendarCard } from '@/components/stats/DietCalendarCard'
import { OutfitCard } from '@/components/stats/OutfitCard'
import { HygieneCalendarCard } from '@/components/stats/HygieneCalendarCard'
import { MoodCard } from '@/components/stats/MoodCard'
import { HabitTrendCard } from '@/components/stats/HabitTrendCard'
import { DEFAULT_HYGIENE_ACTIVITIES } from '@/domain/hygieneActivity'
import { EasternStatsShell, type RoutineViewMode } from '@/components/stats/EasternStatsShell'

// ── 辅助函数（日期导航） ──────────────────────────────────

function getAnchor(period: Granularity, date: Date): Date {
  switch (period) {
    case 'day':   return startOfDay(date)
    case 'week':  return startOfWeek(date, { weekStartsOn: 1 })
    case 'month': return startOfMonth(date)
  }
}

function shiftAnchor(anchor: Date, period: Granularity, dir: -1 | 1): Date {
  switch (period) {
    case 'day':   return addDays(anchor, dir)
    case 'week':  return addDays(anchor, dir * 7)
    case 'month': return addMonths(anchor, dir)
  }
}

// ── 常量 ──────────────────────────────────────────────────

// ── 主组件 ────────────────────────────────────────────────

export function StatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const loadRange       = useEventStore((s) => s.loadRange)
  const rangeEvents     = useEventStore((s) => s.rangeEvents)
  const isLoading       = useEventStore((s) => s.isLoading)
  const loadError       = useEventStore((s) => s.loadError)
  const categories      = useCategoryStore((s) => s.categories)
  const language        = useAppSettingsStore((s) => s.settings.language)
  const hygieneActivities = useAppSettingsStore((s) => s.settings.hygieneActivities) ?? DEFAULT_HYGIENE_ACTIVITIES

  const outfits         = useDailyContextStore((s) => s.outfits)
  const loadOutfits     = useDailyContextStore((s) => s.loadOutfits)

  // ── URL state ────────────────────────────────────────────

  const routineView = (searchParams.get('view') as RoutineViewMode | null) ?? 'trend'
  const period      = (searchParams.get('period') as Granularity | null) ?? 'week'
  const dateStr     = searchParams.get('date') ?? formatISODate(new Date())

  const date   = useMemo(() => { const d = parseISODate(dateStr); return isNaN(d.getTime()) ? new Date() : d }, [dateStr])
  const anchor = useMemo(() => getAnchor(period, date), [period, date])

  // ── Data loading ─────────────────────────────────────────

  useEffect(() => {
    const now = Date.now()
    fireAndForget(loadRange(now - 3 * 365 * 24 * 60 * 60_000, now), 'load stats range')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const now = new Date()
    const end = formatISODate(now)
    const start = formatISODate(addDays(now, -90))
    fireAndForget(loadOutfits(start, end), 'load outfits')
  }, [loadOutfits])

  useEffect(() => { document.title = 'CaILens · 复盘' }, [])

  // ── Aggregation ───────────────────────────────────────────

  const lookback = period === 'day' ? 14 : period === 'week' ? 8 : 12
  const { history } = useStatsAggregation({ granularity: period, anchorDate: anchor, lookbackBuckets: lookback })
  const maturity = useMemo(() => getDataMaturity(rangeEvents), [rangeEvents])

  // ── URL helpers ───────────────────────────────────────────

  const updateParams = (upd: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(upd)) {
      if (v === undefined || v === '') next.delete(k)
      else next.set(k, v)
    }
    setSearchParams(next, { replace: true })
  }

  const setPeriod       = (p: Granularity)      => updateParams({ period: p === 'week' ? undefined : p })
  const navigateRoutine = (dir: -1 | 1)          => updateParams({ date: formatISODate(shiftAnchor(anchor, period, dir)) })

  // ── Render ────────────────────────────────────────────────

  return (
    <EasternStatsShell>
      <style>{STATS_PAGE_CSS}</style>

      {isLoading && rangeEvents.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px] flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      )}

      {loadError && (
        <div className="flex flex-col items-center justify-center gap-4 min-h-[400px] flex-1">
          <AlertCircle className="h-10 w-10 text-color-text-danger" />
          <p className="text-sm max-w-md text-center text-text-secondary" style={{ fontFamily: "'Source Serif 4', 'Noto Serif SC', serif" }}>
            {loadError}
          </p>
          <button
            onClick={() => loadRange(Date.now() - 3 * 365 * 24 * 60 * 60_000, Date.now())}
            className="inline-flex items-center justify-center rounded-lg text-white bg-accent px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer border-none"
          >
            {'重试'}
          </button>
        </div>
      )}

      {!isLoading && !loadError && (
        <div className="routine-container">
          <div>
            {routineView === 'trend' && (
              <>
                <CategoryTrendChart
                  history={history}
                  categories={categories}
                  periodType={period}
                  maturity={maturity}
                  onNavigate={navigateRoutine}
                  onPeriodChange={setPeriod}
                />
                <HabitTrendCard />
              </>
            )}
            {routineView === 'heatmap' && (
              <YearHeatmap
                rangeEvents={rangeEvents}
                categories={categories}
                language={language}
              />
            )}
            {routineView === 'sleep' && (
              <SleepScatterChart rangeEvents={rangeEvents} />
            )}
            {routineView === 'diet' && (
              <DietCalendarCard rangeEvents={rangeEvents} />
            )}
            {routineView === 'hygiene' && (
              <HygieneCalendarCard rangeEvents={rangeEvents} activities={hygieneActivities} language={language} />
            )}
            {routineView === 'outfit' && (
              <OutfitCard outfits={outfits} language={language} />
            )}
            {routineView === 'mood' && (
              <MoodCard />
            )}
          </div>
        </div>
      )}
    </EasternStatsShell>
  )
}

// ── Scoped CSS ─────────────────────────────────────────────

const STATS_PAGE_CSS = `
.routine-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}
`
