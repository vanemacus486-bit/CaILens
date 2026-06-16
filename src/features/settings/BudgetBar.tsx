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
    <div className="rounded-xl bg-surface-raised border border-border-subtle px-4 py-3">
      {/* Stats row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-sans font-medium text-text-tertiary">
          已分配 {totalBudgeted} / {WEEK_TOTAL}h
        </span>
        {overBudget ? (
          <span className="text-[11px] font-sans text-color-text-danger font-medium">
            超出 {Math.abs(remaining)}h
          </span>
        ) : (
          <span className="text-[11px] font-sans text-text-tertiary/60">
            剩余 {remaining}h
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full overflow-hidden flex bg-surface-sunken">
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
    </div>
  )
}
