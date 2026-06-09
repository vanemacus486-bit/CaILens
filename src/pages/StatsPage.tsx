/**
 * # StatsPage — 复盘页面
 *
 * 一级架构：Tab 切换（作息/日常/身体/关联）。
 * 作息 Tab 沿用现有四视图（趋势/热力/睡眠/稳态），
 * 日常/身体/关联 Tab 加载对应数据并渲染新组件。
 */

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
import { useStatsAggregation, useTitleStatsAggregation } from '@/hooks/useStatsAggregation'
import { useTabTransition } from '@/hooks/useTabTransition'
import { CategoryTrendChart } from '@/components/stats/CategoryTrendChart'
import { YearHeatmap } from '@/components/stats/YearHeatmap'
import { SleepScatterChart } from '@/components/stats/SleepScatterChart'
import { DietCalendarCard } from '@/components/stats/DietCalendarCard'
import { DietFrequencyPanel } from '@/components/stats/DietFrequencyPanel'
import { DietScatterChart } from '@/components/stats/DietScatterChart'
import { DietTagTrendChart } from '@/components/stats/DietTagTrendChart'
import { RecipeSummary } from '@/components/stats/RecipeSummary'
import { OutfitCard } from '@/components/stats/OutfitCard'
import { HygieneCalendarCard } from '@/components/stats/HygieneCalendarCard'
import { HygieneScoreChart } from '@/components/stats/HygieneScoreChart'
import { HygieneStatsCard } from '@/components/stats/HygieneStatsCard'

import {
  EasternStatsShell,
  STATS_TABS,
  type StatsTab,
  type RoutineViewMode,
  type LifestyleViewMode,
} from '@/components/stats/EasternStatsShell'

// ── 辅助函数（日期导航） ──────────────────────────────────

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

// ── 常量 ──────────────────────────────────────────────────

const ROUTINE_VIEWS: RoutineViewMode[] = ['trend', 'heatmap', 'sleep']
const LIFESTYLE_VIEWS: LifestyleViewMode[] = ['diet', 'outfit', 'hygiene']

// ── 主组件 ────────────────────────────────────────────────

export function StatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const loadRange              = useEventStore((s) => s.loadRange)
  const rangeEvents            = useEventStore((s) => s.rangeEvents)
  const isLoading              = useEventStore((s) => s.isLoading)
  const loadError              = useEventStore((s) => s.loadError)
  const categories             = useCategoryStore((s) => s.categories)
  const language               = useAppSettingsStore((s) => s.settings.language)

  // Lifestyle data
  const outfits       = useDailyContextStore((s) => s.outfits)
  const hygieneRecords = useDailyContextStore((s) => s.hygieneRecords)
  const loadOutfits   = useDailyContextStore((s) => s.loadOutfits)
  const loadHygiene   = useDailyContextStore((s) => s.loadHygiene)
  const loadRecentHygiene = useDailyContextStore((s) => s.loadRecentHygiene)

  // ── Tab & view state ─────────────────────────────────────

  const tab = (searchParams.get('tab') as StatsTab | null) ?? 'routine'
  const routineView = (searchParams.get('view') as RoutineViewMode | null) ?? 'trend'
  const lifestyleView = (searchParams.get('lifestyle') as LifestyleViewMode | null) ?? 'diet'
  const period = (searchParams.get('period') as Granularity | null) ?? 'week'
  const dateStr = searchParams.get('date') ?? formatISODate(new Date())
  const eventTitle = searchParams.get('eventTitle') ?? ''

  const date = useMemo(() => {
    const d = parseISODate(dateStr)
    return isNaN(d.getTime()) ? new Date() : d
  }, [dateStr])

  const anchor = useMemo(() => getAnchor(period, date), [period, date])

  // ── Data loading ─────────────────────────────────────────

  // Events: broad range for all views
  useEffect(() => {
    const now = Date.now()
    fireAndForget(loadRange(now - 3 * 365 * 24 * 60 * 60_000, now), 'load stats range')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])



  // Lifestyle data (always load on mount, wider range for hygiene continuity)
  useEffect(() => {
    const now = new Date()
    const end = formatISODate(now)
    const start = formatISODate(addDays(now, -90))
    fireAndForget(loadOutfits(start, end), 'load outfits')
    fireAndForget(loadHygiene(start, end), 'load hygiene')
    fireAndForget(loadRecentHygiene(90), 'load recent hygiene')
  }, [loadOutfits, loadHygiene, loadRecentHygiene])

  // ── Tab title ────────────────────────────────────────────

  useEffect(() => {
    const currentTab = STATS_TABS.find((t) => t.id === tab)
    const tabLabel = currentTab?.label ?? ''
    document.title = `CaILens · ${tabLabel}`
  }, [tab])

  // ── Routine tab data ─────────────────────────────────────

  const lookback = period === 'day' ? 14 : period === 'week' ? 8 : 12
  const { history } = useStatsAggregation({
    granularity: period,
    anchorDate: anchor,
    lookbackBuckets: lookback,
  })

  const maturity = useMemo(() => getDataMaturity(rangeEvents), [rangeEvents])

  // ── Event title stats aggregation ─────────────────────────
  const { history: eventHistory } = useTitleStatsAggregation({
    granularity: period,
    anchorDate: anchor,
    lookbackBuckets: lookback,
    titleFilter: eventTitle,
  })

  // ── URL helpers ──────────────────────────────────────────

  const updateParams = (upd: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(upd)) {
      if (v === undefined || v === '') next.delete(k)
      else next.set(k, v)
    }
    setSearchParams(next, { replace: true })
  }

  const setTab = (newTab: StatsTab) => {
    updateParams({ tab: newTab === 'routine' ? undefined : newTab })
  }

  const setRoutineView = (v: RoutineViewMode) => {
    updateParams({ view: v === 'trend' ? undefined : v })
  }

  const setLifestyleView = (v: LifestyleViewMode) => {
    updateParams({ lifestyle: v === 'diet' ? undefined : v })
  }

  const setPeriod = (p: Granularity) => {
    updateParams({ period: p === 'week' ? undefined : p })
  }

  const setEventTitle = (title: string) => {
    updateParams({ eventTitle: title || undefined })
  }

  const navigateRoutine = (dir: -1 | 1) => {
    updateParams({ date: formatISODate(shiftAnchor(anchor, period, dir)) })
  }

  // ── Tab 切换动画 ──
  const routineAnim = useTabTransition(`routine-${routineView}`)
  const lifestyleAnim = useTabTransition(`lifestyle-${lifestyleView}`)

  // ── Render ───────────────────────────────────────────────

  const renderContent = () => {
    if (isLoading && rangeEvents.length === 0 && tab === 'routine') {
      return (
        <div className="flex items-center justify-center min-h-[400px] flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      )
    }

    if (loadError && tab === 'routine') {
      return (
        <div className="flex flex-col items-center justify-center gap-4 min-h-[400px] flex-1">
          <AlertCircle className="h-10 w-10 text-color-text-danger" />
          <p
            className="text-sm max-w-md text-center text-text-secondary"
            style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
          >
            {loadError}
          </p>
          <button
            onClick={() => loadRange(Date.now() - 3 * 365 * 24 * 60 * 60_000, Date.now())}
            className="inline-flex items-center justify-center rounded-lg text-white bg-accent px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer border-none"
          >
            {'重试'}
          </button>
        </div>
      )
    }

    switch (tab) {
      /* ════════════════════════════════════════════
         作息 Tab
         ════════════════════════════════════════════ */
      case 'routine': {
        // 子视图 pills
        const pills = ROUTINE_VIEWS.map((v) => ({
          id: v,
          label: v === 'trend'   ? '趋势'
               : v === 'heatmap' ? '热力'
               : v === 'sleep'   ? '睡眠'
               :                   '稳态',
        }))

        return (
          <div className="routine-container">
            {/* 二级 pills */}
            <div className="routine-pills">
              {pills.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setRoutineView(p.id)}
                  className={`routine-pill${routineView === p.id ? ' routine-pill-active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* 内容 */}
            <div className={routineAnim.className}>
            {routineAnim.visible && (
            <>
            {routineView === 'trend' && (
              <CategoryTrendChart
                history={history}
                categories={categories}
                periodType={period}
                maturity={maturity}
                onNavigate={navigateRoutine}
                onPeriodChange={setPeriod}
                allEvents={rangeEvents}
                eventTitle={eventTitle}
                eventHistory={eventHistory}
                onEventTitleChange={setEventTitle}
              />
            )}
            {routineView === 'heatmap' && (
              <YearHeatmap
                rangeEvents={rangeEvents}
                categories={categories}
                language={language}
                eventTitle={eventTitle}
                onEventTitleChange={setEventTitle}
              />
            )}
            {routineView === 'sleep' && (
              <SleepScatterChart
                rangeEvents={rangeEvents}
              />
            )}
            </>
            )}
            </div>

          </div>
        )
      }

      /* ════════════════════════════════════════════
         日常 Tab
         ════════════════════════════════════════════ */
      case 'lifestyle': {
        // 子视图 pills
        const pills = LIFESTYLE_VIEWS.map((v) => ({
          id: v,
          label: v === 'diet'    ? '饮食'
               : v === 'outfit'  ? '穿搭'
               :                   '卫生',
        }))

        return (
          <div className="lifestyle-container">
            {/* 二级 pills */}
            <div className="lifestyle-pills">
              {pills.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLifestyleView(p.id)}
                  className={`lifestyle-pill${lifestyleView === p.id ? ' lifestyle-pill-active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* 内容 — 饮食：四段堆叠 */}
            <div className={lifestyleAnim.className}>
            {lifestyleAnim.visible && (
            <>
            {lifestyleView === 'diet' && (
              <div className="diet-stack">
                <DietCalendarCard rangeEvents={rangeEvents} />
                <DietFrequencyPanel rangeEvents={rangeEvents} />
                <DietScatterChart rangeEvents={rangeEvents} />
                <RecipeSummary rangeEvents={rangeEvents} language={language} />
                <DietTagTrendChart rangeEvents={rangeEvents} />
              </div>
            )}
            {lifestyleView === 'outfit' && (
              <OutfitCard
                outfits={outfits}
                language={language}
              />
            )}
            {lifestyleView === 'hygiene' && (
              <div className="diet-stack">
                <HygieneCalendarCard
                  records={hygieneRecords}
                  rangeEvents={rangeEvents}
                  language={language}
                />
                <HygieneScoreChart
                  rangeEvents={rangeEvents}
                />
                <HygieneStatsCard
                  rangeEvents={rangeEvents}
                  language={language}
                />
              </div>
            )}
            </>
            )}
            </div>

          </div>
        )
      }



      default:
        return null
    }
  }

  return (
    <EasternStatsShell
      currentTab={tab}
      onTabChange={setTab}
    >
      <style>{STATS_PAGE_CSS}</style>
      {renderContent()}
    </EasternStatsShell>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const STATS_PAGE_CSS = `
/* ── Routine tab pills ──────────────────── */
.routine-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}
.routine-pills {
  display: flex;
  gap: 2px;
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 20px;
  width: fit-content;
}
.routine-pill {
  padding: 6px 18px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-3);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.routine-pill:hover {
  color: var(--heatmap-ink-1);
}
.routine-pill-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}

/* ── Lifestyle tab pills ──────────────────── */
.lifestyle-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}
.lifestyle-pills {
  display: flex;
  gap: 2px;
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 20px;
  width: fit-content;
}
.lifestyle-pill {
  padding: 6px 18px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-3);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.lifestyle-pill:hover {
  color: var(--heatmap-ink-1);
}
.lifestyle-pill-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}

/* ── Diet stack ────────────────────────── */
.diet-stack {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* ── Misc ──────────────────────────────── */
@media (max-width: 719px) {
  .routine-pills,
  .lifestyle-pills {
    width: 100%;
    justify-content: center;
  }
  .routine-pill,
  .lifestyle-pill {
    padding: 6px 12px;
    font-size: 12px;
  }
}
`
