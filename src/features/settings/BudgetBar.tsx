import { useMemo } from 'react'
import type { Category } from '@/domain/category'

interface BudgetBarProps {
  categories: Category[]
  language: 'zh' | 'en'
}

const WEEK_TOTAL = 168

export function BudgetBar({ categories, language }: BudgetBarProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const totalBudgeted = useMemo(
    () => categories.reduce((sum, c) => sum + c.weeklyBudget, 0),
    [categories],
  )

  const remaining = WEEK_TOTAL - totalBudgeted
  const overBudget = remaining < 0

  return (
    <div className="rounded-lg px-3.5 py-3 bg-surface-sunken">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary font-sans">
          {t('已分配预算', 'Allocated budget')}
        </span>
        <span className="text-xs font-mono text-text-secondary">
          <span className="text-text-primary font-medium">{totalBudgeted}</span>
          {' / '}{WEEK_TOTAL}h{' · '}
          {overBudget ? (
            <span className="text-color-text-danger font-medium">
              {t(`超出 ${Math.abs(remaining)}h`, `${Math.abs(remaining)}h over`)}
            </span>
          ) : (
            <span>
              {t(`剩余 ${remaining}h`, `${remaining}h left`)}
            </span>
          )}
        </span>
      </div>

      <div className="w-full h-2 rounded-full overflow-hidden flex mb-2.5 bg-surface-base">
        {categories.map((cat) => {
          const pct = (cat.weeklyBudget / WEEK_TOTAL) * 100
          if (pct <= 0) return null
          return (
            <div
              key={cat.id}
              className="flex-shrink-0 h-full transition-all duration-300"
              style={{
                width: `${Math.min(pct, 100)}%`,
                backgroundColor: `var(--event-${cat.id}-fill)`,
              }}
            />
          )
        })}
        {totalBudgeted < WEEK_TOTAL && (
          <div className="flex-1 h-full bg-surface-base" />
        )}
      </div>

      <div className="flex flex-wrap gap-x-3.5 gap-y-1">
        {categories.map((cat) => (
          <span key={cat.id} className="inline-flex items-center gap-1 text-xs text-text-secondary">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: `var(--event-${cat.id}-text)` }}
            />
            <span className="font-sans">{cat.name[language]}</span>
            <span className="font-mono text-text-tertiary">{cat.weeklyBudget}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
