import { cn } from '@/lib/utils'
import { formatWeekday, isToday } from '@/domain/time'

interface WeekDateHeaderProps {
  days: Date[]
}

export function WeekDateHeader({ days }: WeekDateHeaderProps) {
  return (
    <div className="grid border-b border-border-subtle flex-shrink-0" style={{ gridTemplateColumns: 'var(--time-column-width) repeat(7, 1fr)' }}>
      {/* Spacer — aligns with TimeGrid's 80px label column */}
      <div className="bg-surface-sunken/50" />

      {days.map((day) => {
        const today = isToday(day.getTime())
        return (
          <div
            key={day.getTime()}
            className="flex flex-col items-center justify-center py-2.5 select-none"
          >
            <span className="text-[11px] font-sans font-medium text-text-tertiary uppercase tracking-[0.06em] leading-none">
              {formatWeekday(day, 'short')}
            </span>
            <span
              className={cn(
                'font-mono text-base font-medium leading-none mt-[3px]',
                today ? 'text-accent' : 'text-text-primary',
              )}
            >
              {day.getDate()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
