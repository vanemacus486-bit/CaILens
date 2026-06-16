import { cn } from '@/lib/utils'
import { formatWeekday, isToday } from '@/domain/time'

interface WeekDateHeaderProps {
  days: Date[]
  onDayClick?: (date: Date) => void
}

export function WeekDateHeader({ days, onDayClick }: WeekDateHeaderProps) {
  return (
    <div className="grid flex-shrink-0 min-w-[540px]" style={{ gridTemplateColumns: 'var(--time-column-width) repeat(7, 1fr)' }}>
      {/* Spacer — aligns with TimeGrid's label column */}
      <div className="bg-surface-sunken border-l border-grid-line" />

      {days.map((day) => {
        const today = isToday(day.getTime())
        return (
          <div
            key={day.getTime()}
            className={cn(
              'flex flex-col items-center justify-center py-2.5 select-none cursor-default bg-surface-sunken hover:bg-surface-sunken/70 transition-colors duration-150 border-b border-grid-line-date-sep relative',
            )}
            onDoubleClick={() => onDayClick?.(day)}
            title="双击查看当天"
          >
            <span className="text-[10px] font-sans text-text-quaternary uppercase tracking-[0.1em] leading-none">
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
            {today && (
              <span className="block w-1 h-1 rounded-full bg-accent mx-auto mt-1" />
            )}
            {/* Column hint */}
            <div className="absolute right-0 bottom-0 w-px h-1.5 bg-grid-line" />
          </div>
        )
      })}
    </div>
  )
}
