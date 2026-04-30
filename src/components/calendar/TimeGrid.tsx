import { DEFAULT_HOUR_END, DEFAULT_HOUR_START } from '@/features/week-view/constants'

interface TimeGridProps {
  hourStart?: number
  hourEnd?:   number
}

export function TimeGrid({
  hourStart = DEFAULT_HOUR_START,
  hourEnd   = DEFAULT_HOUR_END,
}: TimeGridProps) {
  const hours = Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i)

  return (
    <div
      className="h-full grid"
      style={{ gridTemplateRows: `repeat(${hourEnd - hourStart}, 1fr)` }}
    >
      {hours.map((h) => (
        <div key={h} className="relative">
          {/* Whole-hour solid border — skip the very first to avoid doubling WeekHeader's bottom border */}
          {h > hourStart && (
            <div className="absolute inset-x-0 top-0 border-t border-border-subtle" />
          )}

          {/* Time label — every 3 hours to avoid crowding in the compressed 24 h view */}
          {h > 0 && h % 3 === 0 && (
            <span className="absolute top-0.5 right-2 text-[10px] font-mono text-text-tertiary select-none leading-none">
              {h}:00
            </span>
          )}

          {/* Half-hour dashed indicator at 50% of this hour cell */}
          <div
            className="absolute inset-x-0 border-t border-dashed border-border-subtle opacity-40"
            style={{ top: '50%' }}
          />
        </div>
      ))}
    </div>
  )
}
