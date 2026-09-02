import { cn } from '@/lib/utils'
import { formatWeekday, isToday } from '@/domain/time'
import { format } from 'date-fns'

interface WeekDateHeaderProps {
  days: Date[]
  highlightedDayMs?: number | null
  onDayClick?: (date: Date) => void
}

export function WeekDateHeader({ days, highlightedDayMs, onDayClick }: WeekDateHeaderProps) {
  return (
    <div className="grid flex-shrink-0 min-w-[540px]" style={{ gridTemplateColumns: 'var(--time-column-width) repeat(7, 1fr)' }}>
      {/* Spacer — aligns with TimeGrid's label column */}
      <div className="flex items-end justify-center pb-2 bg-surface-base border-l border-grid-line">
        <span className="text-[9px] font-mono text-text-tertiary leading-none whitespace-nowrap select-none">
          &nbsp;
        </span>
      </div>

      {days.map((day) => {
        const today = isToday(day.getTime())
        return (
          <div
            key={day.getTime()}
            className={cn(
              'week-date-cell flex flex-col items-center justify-center select-none cursor-default bg-surface-base hover:bg-surface-base/70 transition-colors duration-150 border-b border-grid-line-date-sep relative',
              day.getTime() > new Date().setHours(23, 59, 59, 999) && 'week-date-future',
              highlightedDayMs != null && day.getTime() === highlightedDayMs && 'bg-accent/15 ring-1 ring-accent/40',
            )}
            onDoubleClick={() => onDayClick?.(day)}
            title="双击查看当天"
          >
            <div className="week-date-content">
              <span className="week-date-weekday">
                {formatWeekday(day, 'short')}
              </span>
              <time
                dateTime={format(day, 'yyyy-MM-dd')}
                aria-current={today ? 'date' : undefined}
                className={cn('week-date-number', today && 'is-today')}
              >
                {format(day, 'MM-dd')}
              </time>
            </div>
            {/* Column hint */}
            <div className="absolute right-0 bottom-0 w-px h-1.5 bg-grid-line" />
          </div>
        )
      })}
    </div>
  )
}
