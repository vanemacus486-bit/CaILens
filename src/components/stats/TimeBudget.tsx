import { AlertTriangle } from 'lucide-react'
import type { Bucket } from '@/hooks/useStatsAggregation'
import type { Category } from '@/domain/category'
import { cn } from '@/lib/utils'

interface TimeBudgetProps {
  current: Bucket
  categories: Category[]
  language: 'zh' | 'en'
}

export function TimeBudget({ current, categories, language }: TimeBudgetProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const items = categories.map((cat) => {
    const actual = current.byCategory[cat.id] || 0
    return { ...cat, actual, budget: cat.weeklyBudget }
  })

  const overBudget = items.filter((i) => i.actual > i.budget)
  const underBudget = items.filter((i) => i.actual <= i.budget)

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Budget vs Actual */}
      <div className="bg-surface-raised border border-border-subtle p-6">
        <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
          {t('预算 vs 实际', 'Budget vs. Actual')}
        </h3>
        <p className="text-[11px] text-text-tertiary mb-4">
          {t('刻度线标注预算上限', 'Tick marks show budget ceiling')}
        </p>

        <div className="space-y-3.5">
          {items.map((item) => {
            const over = item.actual > item.budget
            const overPct = over ? ((item.actual - item.budget) / item.budget) * 100 : 0
            const barPct = Math.min((item.actual / item.budget) * 100, 100)
            const overAmt = item.actual - item.budget

            return (
              <div key={item.id}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `var(--event-${item.id}-fill)` }}
                    />
                    <span className="text-[13px] text-text-primary">{item.name[language]}</span>
                    {over && (
                      <span className="text-[10px] text-color-text-danger bg-surface-sunken px-1.5 py-0.5 rounded-sm font-mono inline-flex items-center gap-1">
                        <AlertTriangle size={10} strokeWidth={2.5} />
                        +{overAmt.toFixed(1)}h
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-text-secondary">
                    <span className={cn('font-semibold', over && 'text-color-text-danger')}>
                      {item.actual.toFixed(1)}
                    </span>
                    {' / '}{item.budget}h
                  </span>
                </div>
                {/* Progress bar */}
                <div className="relative h-1.5 bg-surface-sunken rounded-sm overflow-hidden">
                  {/* Solid portion up to budget cap */}
                  <div
                    className="h-full rounded-sm absolute left-0 top-0"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: over ? `var(--event-${item.id}-fill)` : `var(--event-${item.id}-fill)`,
                      opacity: over ? 0.65 : 0.8,
                    }}
                  />
                  {/* Excess portion with diagonal stripes */}
                  {over && (
                    <div
                      className="h-full absolute top-0 left-0"
                      style={{
                        width: `${barPct + overPct}%`,
                        maxWidth: '100%',
                        background: `repeating-linear-gradient(
                          -45deg,
                          transparent,
                          transparent 3px,
                          var(--event-${item.id}-fill) 3px,
                          var(--event-${item.id}-fill) 5px
                        )`,
                        opacity: 0.4,
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Over / Under summary */}
      <div className="flex flex-col gap-4">
        <div className="bg-surface-raised border border-border-subtle p-6 flex-1">
          <h3 className="font-serif text-sm font-semibold mb-3 text-color-text-warning">
            {t('超预算', 'Over budget')}
          </h3>
          <p className="text-[11px] text-text-tertiary mb-3">
            {t('超出计划的部分', 'Spent more than planned')}
          </p>
          {overBudget.length === 0 ? (
            <p className="text-xs text-text-tertiary italic">—</p>
          ) : (
            overBudget.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-border-subtle last:border-b-0">
                <div className="flex items-center gap-2">
                  <span
                    className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: `var(--event-${item.id}-fill)` }}
                  />
                  <span className="text-[13px] text-text-primary">{item.name[language]}</span>
                </div>
                <span className="font-mono text-xs text-color-text-danger inline-flex items-center gap-1">
                  <AlertTriangle size={10} strokeWidth={2.5} />
                  +{(item.actual - item.budget).toFixed(1)}h
                </span>
              </div>
            ))
          )}
        </div>

        <div className="bg-surface-raised border border-border-subtle p-6 flex-1">
          <h3 className="font-serif text-sm font-semibold mb-3 text-color-text-positive">
            {t('未超预算', 'Under budget')}
          </h3>
          <p className="text-[11px] text-text-tertiary mb-3">
            {t('剩余可用', 'Capacity remaining')}
          </p>
          {underBudget.length === 0 ? (
            <p className="text-xs text-text-tertiary italic">—</p>
          ) : (
            underBudget.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-border-subtle last:border-b-0">
                <div className="flex items-center gap-2">
                  <span
                    className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: `var(--event-${item.id}-fill)` }}
                  />
                  <span className="text-[13px] text-text-primary">{item.name[language]}</span>
                </div>
                <span className="font-mono text-xs text-color-text-positive">
                  {(item.budget - item.actual).toFixed(1)}h left
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
