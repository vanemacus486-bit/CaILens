import { useMemo } from 'react'
import type { Category } from '@/domain/category'
import type { Bucket } from '@/hooks/useStatsAggregation'
import { generateDiagnosis, computeBudgetStatuses } from '@/domain/diagnosis'
import { DiagnosisCards } from './DiagnosisCards'
import { DivergenceBarChart } from './DivergenceBarChart'
import { TrendVsLastWeek } from './TrendVsLastWeek'
import { DistributionMatchCard } from './DistributionMatchCard'

interface DeficitDashboardProps {
  current: Bucket
  previous: Bucket | null
  history: Bucket[]
  categories: Category[]
  language: 'zh' | 'en'
}

export function DeficitDashboard({
  current,
  previous,
  history,
  categories,
  language,
}: DeficitDashboardProps) {
  const periodDays = (current.end.getTime() - current.start.getTime()) / (24 * 3600_000)

  const diagnosis = useMemo(
    () => generateDiagnosis(
      current.byCategory,
      categories,
      periodDays,
      language,
      previous?.byCategory,
    ),
    [current.byCategory, categories, periodDays, language, previous?.byCategory],
  )

  const budgetStatuses = useMemo(
    () => computeBudgetStatuses(current.byCategory, categories, periodDays),
    [current.byCategory, categories, periodDays],
  )

  const historyTotals = useMemo(
    () => history.map((b) => b.total),
    [history],
  )

  const currentTotal = current.total

  const historyByHourSlot = useMemo(
    () => history.map((b) => b.byHourSlot),
    [history],
  )

  // Current day-of-week (0=Mon) from the current date
  const currentDayIndex = (() => {
    const d = new Date()
    return (d.getDay() + 6) % 7 // Sun=0 → Mon=0
  })()

  return (
    <div className="flex flex-col gap-5 w-full max-w-[800px] mx-auto">
      {/* Section 1: Diagnosis cards */}
      <div>
        <h2
          className="text-sm font-semibold mb-3"
          style={{
            fontFamily: "'Noto Sans SC', sans-serif",
            color: '#2E2823',
          }}
        >
          {language === 'zh' ? '本周诊断' : 'Weekly Diagnosis'}
        </h2>
        <DiagnosisCards diagnosis={diagnosis} categories={categories} language={language} />
      </div>

      {/* Section 2: Divergence bar chart */}
      <div>
        <h2
          className="text-sm font-semibold mb-3"
          style={{
            fontFamily: "'Noto Sans SC', sans-serif",
            color: '#2E2823',
          }}
        >
          {language === 'zh' ? '预算对账' : 'Budget Variance'}
        </h2>
        <div
          className="rounded-lg px-5 py-4"
          style={{ backgroundColor: '#EDE8DA' }}
        >
          <DivergenceBarChart
            budgetStatuses={budgetStatuses}
            categories={categories}
            language={language}
          />
        </div>
      </div>

      {/* Section 3: Two bottom cards side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TrendVsLastWeek
          currentTotal={currentTotal}
          historyTotals={historyTotals}
          language={language}
        />
        <DistributionMatchCard
          byHourSlot={current.byHourSlot}
          historyByHourSlot={historyByHourSlot}
          currentDayIndex={currentDayIndex}
          language={language}
        />
      </div>
    </div>
  )
}
