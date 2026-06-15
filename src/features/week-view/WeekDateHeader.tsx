import { cn } from '@/lib/utils'
import { formatWeekday, isToday } from '@/domain/time'

interface WeekDateHeaderProps {
  days: Date[]
  onDayClick?: (date: Date) => void
}

export function WeekDateHeader({ days, onDayClick }: WeekDateHeaderProps) {
  return (
    <div className="grid flex-shrink-0 min-w-[540px]" style={{ gridTemplateColumns: 'var(--time-column-width) repeat(7, 1fr)' }}>
      {/* Spacer — aligns with TimeGrid's 80px label column */}
      <div className="bg-surface-sunken border-l border-grid-line" />

      {days.map((day) => {
        const today = isToday(day.getTime())
        return (
          <div
            key={day.getTime()}
            className={cn(
              'flex flex-col items-center justify-center py-2.5 select-none cursor-pointer bg-surface-sunken hover:bg-surface-sunken/70 transition-colors duration-150 border-b border-grid-line-date-sep relative',
              today && 'border-t-2 border-t-accent bg-accent-light/40',
            )}
            onClick={() => onDayClick?.(day)}
          >
            <span className="text-body-xs font-sans font-medium text-text-tertiary uppercase tracking-[0.06em] leading-none">
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
            {/* Column hint — short vertical tick extends up from date separator */}
            <div className="absolute right-0 bottom-0 w-px h-1.5 bg-grid-line" />
          </div>
        )
      })}
    </div>
  )
}
