// Required: npm install react-router-dom lucide-react date-fns
import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, addDays, addMonths, addQuarters, addYears, subMonths, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { formatISODate, parseISODate } from '@/domain/time'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { computeStreak, computeTypeSplit } from '@/domain/stats'
import { getDataMaturity } from '@/domain/maturity'
import type { DataMaturity } from '@/domain/maturity'
import type { Granularity } from '@/hooks/useStatsAggregation'
import { useStatsAggregation } from '@/hooks/useStatsAggregation'
import { OverviewCards } from '@/components/stats/OverviewCards'
import { TimeAllocation } from '@/components/stats/TimeAllocation'
import { LyubishchevAnalysis } from '@/components/stats/LyubishchevAnalysis'
import { RhythmSchedule } from '@/components/stats/RhythmSchedule'
import { TrendsComparison } from '@/components/stats/TrendsComparison'
import { TimeBudget } from '@/components/stats/TimeBudget'
import { WeekInReview } from '@/components/stats/WeekInReview'
import { NotableMoments } from '@/components/stats/NotableMoments'
import { TimeAccountCard } from '@/components/stats/TimeAccountCard'
import { RecordQuality } from '@/components/stats/RecordQuality'
import { EstimateVsActual } from '@/components/stats/EstimateVsActual'

type CompareMode = 'prev' | 'yoy' | 'avg'
type Period = Exclude<Granularity, 'all'> // all-time handled separately

const PERIODS: { key: Granularity; label: string; labelZh: string }[] = [
  { key: 'week', label: 'Week', labelZh: '周' },
  { key: 'month', label: 'Month', labelZh: '月' },
  { key: 'quarter', label: 'Quarter', labelZh: '季' },
  { key: 'year', label: 'Year', labelZh: '年' },
  { key: 'all', label: 'All-time', labelZh: '全部' },
]

function getCompareOptions(anchor: Date, period: Period, language: 'zh' | 'en') {
  const fmtMd = (d: Date) => format(d, 'MM.dd')
  const prevAnchor = shiftAnchor(anchor, period, -1)
  const prevEnd = period === 'week' ? addDays(prevAnchor, 6) : shiftAnchor(prevAnchor, period, 1)
  const prevRange = `${fmtMd(prevAnchor)}-${fmtMd(prevEnd)}`
  const yoyAnchor = addYears(anchor, -1)
  const yoyEnd = period === 'week' ? addDays(yoyAnchor, 6) : shiftAnchor(yoyAnchor, period, 1)
  const yoyRange = `${fmtMd(yoyAnchor)}-${fmtMd(yoyEnd)}`

  if (language === 'zh') {
    return [
      { key: 'prev' as CompareMode, label: `环比（${prevRange}）` },
      { key: 'yoy' as CompareMode, label: `同比（${yoyRange}）` },
      { key: 'avg' as CompareMode, label: '对比均值' },
    ]
  }
  return [
    { key: 'prev' as CompareMode, label: `vs last period (${prevRange})` },
    { key: 'yoy' as CompareMode, label: `vs same period last year (${yoyRange})` },
    { key: 'avg' as CompareMode, label: 'vs average' },
  ]
}

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
  const loadCategories = useCategoryStore((s) => s.loadCategories)
  const categories     = useCategoryStore((s) => s.categories)
  const loadSettings   = useAppSettingsStore((s) => s.loadSettings)
  const language       = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  useEffect(() => {
    void loadCategories()
    void loadSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Parse URL params
  const period    = (searchParams.get('period') as Granularity | null) ?? 'week'
  const dateStr   = searchParams.get('date') ?? formatISODate(new Date())
  const compare   = (searchParams.get('compare') as CompareMode | null) ?? 'prev'

  const date = useMemo(() => {
    const d = parseISODate(dateStr)
    return isNaN(d.getTime()) ? new Date() : d
  }, [dateStr])

  const anchor = useMemo(() => getAnchor(period, date), [period, date])

  // Data loading — broad range for all views
  useEffect(() => {
    const now = Date.now()
    void loadRange(now - 3 * 365 * 24 * 60 * 60_000, now)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lookback buckets for history
  const lookback = period === 'all' ? 1 : period === 'week' ? 8 : period === 'month' ? 12 : period === 'quarter' ? 8 : 3

  const { current, history, previous } = useStatsAggregation({
    granularity: period,
    anchorDate: anchor,
    lookbackBuckets: lookback,
  })

  // Comparison bucket
  const compareBucket = useMemo(() => {
    if (compare === 'prev') return previous
    if (compare === 'yoy') {
      const yearAgo = addDays(addYears(anchor, -1), 0)
      const [s, e] = [yearAgo.getTime(), shiftAnchor(yearAgo, period as Period, 1).getTime()]
      // find matching bucket in history (may not exist — return null)
      return history.find(b => b.start.getTime() === s) ?? null
    }
    // avg
    if (history.length <= 1) return null
    const avgTotal = history.slice(0, -1).reduce((sum, b) => sum + b.total, 0) / (history.length - 1)
    // Return a synthetic bucket with avg values
    const avgByCat: Record<string, number> = {}
    for (const catId of ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']) {
      avgByCat[catId] = history.slice(0, -1).reduce((sum, b) => sum + (b.byCategory[catId] || 0), 0) / (history.length - 1)
    }
    return { start: new Date(0), end: new Date(0), byCategory: avgByCat as any, byHourSlot: [], total: avgTotal }
  }, [compare, previous, history, anchor, period])

  const streak = useMemo(() => computeStreak(rangeEvents), [rangeEvents])
  const typeSplit = useMemo(() => computeTypeSplit(current.byCategory), [current])
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

  const navigate = (dir: -1 | 1) => {
    if (period === 'all') return
    updateParams({ date: formatISODate(shiftAnchor(anchor, period as Period, dir)) })
  }

  const goToday = () => {
    updateParams({ date: formatISODate(new Date()) })
  }

  // Determine compare delta
  const getDelta = (currentVal: number, compareVal: number | undefined): number | null => {
    if (compareVal === undefined || compareVal === null) return null
    return currentVal - compareVal
  }

  const netEffectiveDelta = compareBucket ? getDelta(current.total, compareBucket.total) : null
  const deepWorkDelta = compareBucket ? getDelta(
    current.byCategory.accent || 0,
    compareBucket.byCategory.accent || 0,
  ) : null
  const monthTotalDelta = compareBucket ? getDelta(current.total, compareBucket.total) : null
  const streakDelta = null // streak doesn't compare

  return (
    <div className="h-full flex flex-col bg-surface-base text-text-primary overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 flex items-center gap-4 h-[52px] px-12 border-b border-border-subtle bg-surface-base/96 backdrop-blur-[8px] flex-shrink-0">
        <Link
          to="/"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 flex-shrink-0"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Link>

        <span className="font-serif text-[15px] font-semibold text-accent tracking-[0.02em] flex-shrink-0">
          CaILens
        </span>

        <div className="w-px h-5 bg-border-subtle flex-shrink-0" />

        {/* Period selector */}
        <div className="flex gap-0.5 bg-surface-sunken rounded p-0.5 flex-shrink-0">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'px-3 py-1 rounded-sm text-xs font-sans font-medium transition-all duration-150 cursor-pointer',
                period === p.key
                  ? 'bg-surface-base text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {language === 'zh' ? p.labelZh : p.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border-subtle flex-shrink-0" />

        {/* Compare dropdown */}
        <span className="text-[11px] text-text-tertiary flex-shrink-0 select-none">
          {t('对比', 'Compare')}
        </span>
        <select
          value={compare}
          onChange={(e) => updateParams({ compare: e.target.value === 'prev' ? undefined : e.target.value })}
          className="bg-surface-sunken border-none rounded text-xs font-sans text-text-secondary px-2.5 py-1 cursor-pointer outline-none flex-shrink-0"
        >
          {getCompareOptions(anchor, period as Period, language).map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Navigation arrows */}
        {period !== 'all' && (
          <>
            <div className="w-px h-5 bg-border-subtle flex-shrink-0" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => navigate(-1)}
                className="w-7 h-7 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer text-sm"
              >
                ‹
              </button>
              <button
                onClick={goToday}
                className="text-[11px] text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-surface-sunken transition-colors duration-200 cursor-pointer"
              >
                {t('今天', 'Today')}
              </button>
              <button
                onClick={() => navigate(1)}
                className="w-7 h-7 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer text-sm"
              >
                ›
              </button>
            </div>
          </>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-12 py-12 pb-20 space-y-[52px]">
          {/* Epigraph */}
          <div className="border-l-2 border-accent py-1 pl-6">
            <p className="font-serif italic text-lg leading-[1.65] text-text-primary max-w-[680px]">
              {t(
                '多年来我一直系统地记录自己的时间。毫不夸张地说，这个记录改变了我的生活——不是因为它给了我更多的时间，而是因为它精确地展示了每一小时是如何消失的。',
                '"I have been keeping a systematic record of my time for many years. Without exaggeration, I can say that this record has transformed my life — not by giving me more hours, but by showing me exactly how each one disappears."',
              )}
            </p>
            <p className="font-sans text-xs text-text-tertiary mt-2.5 tracking-[0.04em]">
              — Alexander Lyubishchev, letter to a colleague, 1966
            </p>
          </div>

          {/* 1. Overview */}
          <Section title={t('总览', 'Overview')} subtitle="">
            <OverviewCards
              netEffective={current.total}
              deepWork={current.byCategory.accent || 0}
              streak={streak}
              monthTotal={current.total}
              netEffectiveDelta={netEffectiveDelta}
              deepWorkDelta={deepWorkDelta}
              monthTotalDelta={monthTotalDelta}
              language={language}
              maturity={maturity}
              periodType={period as 'week' | 'month' | 'quarter' | 'year' | 'all'}
            />
            <div className="mt-4">
              <TimeAccountCard current={current} language={language} />
            </div>
          </Section>

          {/* 2. Time Allocation */}
          <Section title={t('时间分配', 'Time Allocation')} subtitle={t('分类占比', 'Distribution by category')}>
            <TimeAllocation current={current} history={history} categories={categories} language={language} />
          </Section>

          {/* 3. Lyubishchev Analysis */}
          <Section title={t('柳比歇夫分析', 'Lyubishchev Analysis')} subtitle={t('Type I 创造性核心 vs Type II 辅助', 'Type I creative core vs. Type II auxiliary')}>
            <LyubishchevAnalysis
              current={current}
              typeSplit={typeSplit}
              rangeEvents={rangeEvents}
              categories={categories}
              language={language}
              maturity={maturity}
              periodType={period as 'week' | 'month' | 'quarter' | 'year' | 'all'}
            />
          </Section>

          {/* 4. Rhythm & Schedule */}
          <Section title={t('节奏与日程', 'Rhythm & Schedule')} subtitle={t('工作时间分布与重复模式', 'When you work and how patterns repeat')}>
            <RhythmSchedule current={current} history={history} categories={categories} language={language} maturity={maturity} />
          </Section>

          {/* 6. Time Budget */}
          <Section title={t('时间预算', 'Time Budget')} subtitle={t('每周分配 vs 实际', 'Weekly allocations vs. actuals')}>
            <TimeBudget current={current} categories={categories} language={language} />
          </Section>

          {/* 5. Trends & Comparison */}
          <Section title={t('趋势与对比', 'Trends & Comparison')} subtitle={t('滚动均值与周环比', 'Rolling averages and weekly deltas')}>
            <TrendsComparison history={history} categories={categories} language={language} maturity={maturity} />
          </Section>

          {/* 7. Week in Review */}
          <Section title={t('本周回顾', 'Week in Review')} subtitle={t('数字背后的反思', 'A considered look at what the numbers actually mean')}>
            <WeekInReview current={current} previous={previous} categories={categories} language={language} maturity={maturity} />
          </Section>

          {/* Estimate vs Actual */}
          <EstimateVsActual
            current={current}
            categories={categories}
            weekStart={startOfWeek(anchor, { weekStartsOn: 1 }).getTime()}
            language={language}
          />

          {/* Record Quality (above Notable Moments) */}
          <RecordQuality
            rangeEvents={rangeEvents}
            periodStart={anchor.getTime()}
            periodEnd={period === 'all' ? Date.now() : shiftAnchor(anchor, period as Period, 1).getTime()}
            language={language}
          />

          {/* 8. Notable Moments */}
          <Section title={t('值得注意的时刻', 'Notable Moments')} subtitle={t('本周的高光与首次', 'Highs, firsts, and observations from this period')}>
            <NotableMoments current={current} rangeEvents={rangeEvents} streak={streak} categories={categories} language={language} />
          </Section>

        </div>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-4 border-b border-border-subtle pb-2.5 mb-6">
        <h2 className="font-serif text-xl font-semibold text-text-primary">{title}</h2>
        {subtitle && <span className="text-xs text-text-tertiary">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}
