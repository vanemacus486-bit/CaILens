import { DEFAULT_HOUR_END, DEFAULT_HOUR_START } from '@/features/week-view/constants'

interface TimeGridProps {
  hourStart?: number
  hourEnd?:   number
}

const ANCHOR_HOURS = new Set([0, 6, 12, 18])

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
      className="h-full grid bg-surface-sunken/50 border-l border-border-subtle"
      style={{ gridTemplateRows: `repeat(${hourEnd - hourStart}, 1fr)` }}
    >
      {hours.map((h) => (
        <div key={h} className="relative">
          {/* Whole-hour solid border — skip the very first to avoid doubling WeekHeader's bottom border */}
          {h > hourStart && (
            <div className="absolute inset-x-0 top-0 border-t border-border-subtle" />
          )}

          {/* Time label */}
          <span
            className={`absolute top-1/2 -translate-y-1/2 left-0 pl-2 pr-2 text-xs-alt font-mono select-none leading-none ${
              ANCHOR_HOURS.has(h) ? 'font-medium text-text-primary' : 'font-normal text-text-tertiary'
            }`}
          >
            {formatHour24(h)}
          </span>
        </div>
      ))}
    </div>
  )
}
