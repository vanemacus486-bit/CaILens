import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { startOfDay, startOfWeek, startOfMonth, addDays, addMonths, addYears, addWeeks as dfnAddWeeks } from 'date-fns'
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
import { DietView } from '@/components/stats/DietView'
import { OutfitCard } from '@/components/stats/OutfitCard'
import { HygieneView } from '@/components/stats/HygieneView'
import { MoodCard } from '@/components/stats/MoodCard'
import { HabitTrendCard } from '@/components/stats/HabitTrendCard'
import { DEFAULT_HYGIENE_ACTIVITIES } from '@/domain/hygieneActivity'
import { EasternStatsShell, type RoutineViewMode } from '@/components/stats/EasternStatsShell'
import { StatsHeader, type SegmentedOption } from '@/components/stats/StatsHeader'
import { StatsRail } from '@/components/stats/StatsRail'
import type { CategoryId } from '@/domain/category'

// ── Constants ──────────────────────────────────────────────────

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']
const CAT_STORAGE_KEY = 'cailens-trend-categories'

// ── Segment definitions per view ─────────────────────────────

const VIEW_SEGMENTS: Record<RoutineViewMode, SegmentedOption[] | undefined> = {
  trend:   [{ id: 'day', label: '日' }, { id: 'week', label: '周' }, { id: 'month', label: '月' }],
  heatmap: [{ id: 'roll', label: '近一年' }, { id: 'year', label: '年度' }],
  sleep:   [{ id: 'month', label: '月' }, { id: 'quarter', label: '季' }, { id: 'year', label: '年' }],
  diet:    [{ id: 'timeline', label: '时间线' }, { id: 'frequency', label: '食物次数' }],
  hygiene: [{ id: 'timeline', label: '时间线' }, { id: 'frequency', label: '活动次数' }],
  outfit:  undefined,
  mood:    undefined,
}

/** ════════════════════════════════════════════════════════════
 *  View titles — derived from view, segments, and anchor date
 */
function getViewTitle(
  view: RoutineViewMode,
  period: Granularity,
  segValue: string | undefined,
  anchor: Date,
): string {
  switch (view) {
    case 'trend': {
      switch (period) {
        case 'day':   return '日趋势'
        case 'week':  return '周趋势'
        case 'month': return '月趋势'
      }
    }
    case 'heatmap': {
      if (segValue === 'year') return `${anchor.getFullYear()}年热力图`
      return '近365天热力图'
    }
    case 'sleep': {
      const y = anchor.getFullYear()
      const m = anchor.getMonth()
      if (segValue === 'quarter') return `睡眠 · Q${Math.floor(m / 4) + 1}`
      if (segValue === 'year') return `睡眠 · ${y}年`
      return `睡眠 · ${y}年${m + 1}月`
    }
    case 'diet':    return '饮食'
    case 'hygiene': return '卫生'
    case 'outfit':  return '穿搭'
    case 'mood':    return '情绪'
  }
}

/** ════════════════════════════════════════════════════════════
 *  Category selection persistence (trend multi-select)
 */
function loadTrendSelection(): CategoryId[] {
  try {
    const raw = localStorage.getItem(CAT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.every((v: unknown) => CATEGORY_IDS.includes(v as CategoryId))) {
        const unique = [...new Set(parsed)] as CategoryId[]
        if (unique.length > 0) return unique
      }
    }
  } catch { /* ignore */ }
  return ['accent']
}

function saveTrendSelection(ids: CategoryId[]) {
  try { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}

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

/** 每个复盘视图的时间步长（用于顶栏 ← → 箭头导航） */
const VIEW_STEP: Record<RoutineViewMode, 'period' | 'year' | 'month' | 'week'> = {
  trend:   'period',
  heatmap: 'year',
  sleep:   'month',
  diet:    'week',
  hygiene: 'week',
  outfit:  'week',
  mood:    'week',
}

/** 按视图计算当前锚点日期（从 URL date 参数解读） */
function getViewAnchor(view: RoutineViewMode, period: Granularity, date: Date): Date {
  switch (VIEW_STEP[view]) {
    case 'period': return getAnchor(period, date)
    case 'year':   return new Date(date.getFullYear(), 0, 1)
    case 'month':  return startOfMonth(date)
    case 'week':   return startOfWeek(date, { weekStartsOn: 1 })
  }
}

/** 按视图步长偏移 date，返回新的 Date（写入 URL） */
function shiftViewDate(view: RoutineViewMode, period: Granularity, date: Date, dir: -1 | 1): Date {
  switch (VIEW_STEP[view]) {
    case 'period': return shiftAnchor(date, period, dir)
    case 'year':   return addYears(date, dir)
    case 'month':  return addMonths(date, dir)
    case 'week':   return dfnAddWeeks(date, dir)
  }
}

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
  const viewAnchor = useMemo(() => getViewAnchor(routineView, period, date), [routineView, period, date])

  // ── Category selection state (lifted from view components) ──

  const [trendSelected, setTrendSelected] = useState<CategoryId[]>(loadTrendSelection)
  useEffect(() => { saveTrendSelection(trendSelected) }, [trendSelected])

  const [heatmapSelectedId, setHeatmapSelectedId] = useState<CategoryId>('accent')
  // Sync --c-active CSS property when heatmap selection changes
  useEffect(() => {
    document.documentElement.style.setProperty('--c-active', `var(--event-${heatmapSelectedId}-fill)`)
  }, [heatmapSelectedId])

  // ── View mode state (lifted from view components) ─────────

  const [heatmapViewMode, setHeatmapViewMode] = useState<'roll' | 'year'>('roll')
  const [sleepViewMode, setSleepViewMode] = useState<'month' | 'quarter' | 'year'>('month')
  const [dietMode, setDietMode] = useState<'timeline' | 'frequency'>('timeline')
  const [hygieneMode, setHygieneMode] = useState<'timeline' | 'frequency'>('timeline')

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

  const setPeriod = (p: Granularity) => updateParams({ period: p === 'week' ? undefined : p })
  const navigateRoutine = (dir: -1 | 1) => updateParams({ date: formatISODate(shiftViewDate(routineView, period, date, dir)) })

  // ── Segment change handler ─────────────────────────────────

  const handleSegmentChange = useCallback((id: string) => {
    switch (routineView) {
      case 'trend':
        setPeriod(id as Granularity)
        break
      case 'heatmap':
        setHeatmapViewMode(id as 'roll' | 'year')
        break
      case 'sleep':
        setSleepViewMode(id as 'month' | 'quarter' | 'year')
        break
      case 'diet':
        setDietMode(id as 'timeline' | 'frequency')
        break
      case 'hygiene':
        setHygieneMode(id as 'timeline' | 'frequency')
        break
    }
  }, [routineView, setPeriod])

  // ── Render helpers ─────────────────────────────────────────

  const segments = VIEW_SEGMENTS[routineView]

  const segValue = useMemo(() => {
    switch (routineView) {
      case 'trend':   return period
      case 'heatmap': return heatmapViewMode
      case 'sleep':   return sleepViewMode
      case 'diet':    return dietMode
      case 'hygiene': return hygieneMode
      default:        return undefined
    }
  }, [routineView, period, heatmapViewMode, sleepViewMode, dietMode, hygieneMode])

  const title = useMemo(
    () => getViewTitle(routineView, period, segValue, viewAnchor),
    [routineView, period, segValue, viewAnchor],
  )

  const railMode = routineView === 'trend' ? 'multi' : routineView === 'heatmap' ? 'single' : 'empty'
  const railSelected = routineView === 'trend' ? trendSelected : heatmapSelectedId

  const handleRailToggle = useCallback((id: CategoryId) => {
    setTrendSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }, [])

  const handleRailSelect = useCallback((id: CategoryId) => {
    setHeatmapSelectedId(id)
  }, [])

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
          {/* StatsHeader — shared title + segments bar + arrows */}
          <StatsHeader
            title={title}
            segments={segments}
            value={segValue}
            onChange={handleSegmentChange}
            onNavigate={navigateRoutine}
            rail={
              railMode !== 'empty' ? (
                <StatsRail
                  mode={railMode}
                  selected={railSelected}
                  onToggle={railMode === 'multi' ? handleRailToggle : undefined}
                  onSelect={railMode === 'single' ? handleRailSelect : undefined}
                />
              ) : undefined
            }
          />

          {/* View body */}
          <div>
            {routineView === 'trend' && (
              <>
                <CategoryTrendChart
                  history={history}
                  categories={categories}
                  periodType={period}
                  maturity={maturity}
                  selected={trendSelected}
                />
                <HabitTrendCard />
              </>
            )}
            {routineView === 'heatmap' && (
              <YearHeatmap
                rangeEvents={rangeEvents}
                categories={categories}
                language={language}
                anchorYear={viewAnchor.getFullYear()}
                selectedId={heatmapSelectedId}
                onCategoryChange={handleRailSelect}
                viewMode={heatmapViewMode}
                onViewModeChange={setHeatmapViewMode}
              />
            )}
            {routineView === 'sleep' && (
              <SleepScatterChart
                rangeEvents={rangeEvents}
                anchorDate={viewAnchor}
                viewMode={sleepViewMode}
                onViewModeChange={setSleepViewMode}
              />
            )}
            {routineView === 'diet' && (
              <DietView
                rangeEvents={rangeEvents}
                anchorDate={viewAnchor}
                mode={dietMode}
                onModeChange={setDietMode}
              />
            )}
            {routineView === 'hygiene' && (
              <HygieneView
                rangeEvents={rangeEvents}
                activities={hygieneActivities}
                language={language}
                anchorDate={viewAnchor}
                mode={hygieneMode}
                onModeChange={setHygieneMode}
              />
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
