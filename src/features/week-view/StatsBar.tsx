import { cn } from '@/lib/utils'
import type { Category } from '@/domain/category'
import type { AppLanguage } from '@/domain/settings'

interface StatsBarProps {
  category:   Category
  minutes:    number
  percentage: number
  language:   AppLanguage
}

export function StatsBar({ category, minutes, percentage, language }: StatsBarProps) {
  const label  = category.name[language]
  const hrs    = (minutes / 60).toFixed(1)
  const pct    = percentage.toFixed(1)
  const colorId = category.id

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* 颜色圆点 */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: `var(--event-${colorId}-text)` }}
      />

      {/* 分类名 */}
      <span
        className="text-xs font-sans text-text-secondary truncate w-16 flex-shrink-0"
        title={label}
      >
        {label}
      </span>

      {/* 进度条 */}
      <div className="flex-1 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300')}
          style={{
            width:           `${Math.min(percentage, 100)}%`,
            backgroundColor: `var(--event-${colorId}-text)`,
            opacity:         0.7,
          }}
        />
      </div>

      {/* 数值 */}
      <span className="text-xs font-mono text-text-tertiary flex-shrink-0 w-14 text-right">
        {hrs}h · {pct}%
      </span>
    </div>
  )
}
