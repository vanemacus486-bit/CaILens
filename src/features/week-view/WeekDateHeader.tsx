import { cn } from '@/lib/utils'
import { formatWeekday, isToday } from '@/domain/time'

interface WeekDateHeaderProps {
  days: Date[]
}

export function WeekDateHeader({ days }: WeekDateHeaderProps) {
  return (
    <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border-subtle flex-shrink-0 h-[52px]">
      {/* Spacer — aligns with TimeGrid's 80px label column */}
      <div />

      {days.map((day) => {
        const today = isToday(day.getTime())
        return (
          <div
            key={day.getTime()}
            className="flex flex-col items-center justify-center select-none"
          >
            {/* Column highlight for today */}
            <div
              className={cn(
                'flex flex-col items-center justify-center rounded-lg w-full h-full px-1 py-1.5',
                today && 'mx-0.5',
              )}
              style={today ? {
                backgroundColor: 'color-mix(in oklch, var(--accent) 10%, transparent)',
              } : undefined}
            >
              <span className="text-[10px] font-sans font-medium text-text-tertiary uppercase tracking-wider leading-none">
                {formatWeekday(day, 'short')}
              </span>
              <span
                className={cn(
                  'text-lg font-serif leading-tight mt-0.5',
                  today ? 'text-accent font-semibold' : 'text-text-primary font-normal',
                )}
              >
                {day.getDate()}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
