import { useMemo } from 'react'
import type { Category } from '@/domain/category'

interface BudgetBarProps {
  categories: Category[]
}

const WEEK_TOTAL = 168

export function BudgetBar({ categories }: BudgetBarProps) {
    const totalBudgeted = useMemo(
    () => categories.reduce((sum, c) => sum + c.weeklyBudget, 0),
    [categories],
  )

  const remaining = WEEK_TOTAL - totalBudgeted
  const overBudget = remaining < 0

  return (
    <div className="px-5 py-4">
      {/* Stats row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider">
          {'已分配预算'}
        </span>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-text-primary font-medium">{totalBudgeted}</span>
          <span className="text-text-tertiary">/ {WEEK_TOTAL}h</span>
          {overBudget ? (
            <span className="text-color-text-danger font-medium ml-1">
              {`超出 ${Math.abs(remaining)}h`}
            </span>
          ) : (
            <span className="text-text-secondary ml-1">
              {`剩余 ${remaining}h`}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden flex mb-4 bg-surface-sunken">
        {categories.map((cat) => {
          const catPct = (cat.weeklyBudget / WEEK_TOTAL) * 100
          if (catPct <= 0) return null
          return (
            <div
              key={cat.id}
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(catPct, 100)}%`,
                backgroundColor: `var(--event-${cat.id}-fill)`,
              }}
            />
          )
        })}
        {overBudget && (
          <div
            className="h-full transition-opacity duration-300"
            style={{ backgroundColor: 'var(--color-text-danger)', opacity: 0.25, flex: 1 }}
          />
        )}
        {totalBudgeted < WEEK_TOTAL && !overBudget && (
          <div className="flex-1 h-full" />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {categories.map((cat) => (
          <span key={cat.id} className="inline-flex items-center gap-1.5 text-xs">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: `var(--event-${cat.id}-fill)` }}
            />
            <span className="text-text-secondary font-sans">{cat.name}</span>
            <span className="text-text-tertiary font-mono">{cat.weeklyBudget}h</span>
          </span>
        ))}
      </div>
    </div>
  )
}
