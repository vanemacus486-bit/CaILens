import { DEFAULT_HOUR_END, DEFAULT_HOUR_START } from '@/features/week-view/constants'

interface TimeGridProps {
  hourStart?: number
  hourEnd?:   number
}

function formatHour24(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

export function TimeGrid({
  hourStart = DEFAULT_HOUR_START,
  hourEnd   = DEFAULT_HOUR_END,
}: TimeGridProps) {
  const hours = Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i)

  return (
    <div
      className="h-full grid bg-surface-sunken/50"
      style={{ gridTemplateRows: `repeat(${hourEnd - hourStart}, 1fr)` }}
    >
      {hours.map((h) => (
        <div key={h} className="relative">
          {/* Whole-hour solid border — skip the very first to avoid doubling WeekHeader's bottom border */}
          {h > hourStart && (
            <div className="absolute inset-x-0 top-0 border-t border-border-subtle" />
          )}

          {/* Time label — every hour, skip 00:00 */}
          {h > 0 && (
            <span className="absolute top-0.5 right-2 text-[10px] font-mono text-text-tertiary select-none leading-none">
              {formatHour24(h)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
