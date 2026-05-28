import { cn } from '@/lib/utils'
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
      className="h-full grid bg-surface-sunken/50 border-l border-grid-line"
      style={{ gridTemplateRows: `repeat(${hourEnd - hourStart}, 1fr)` }}
    >
      {hours.map((h) => {
        const isAnchor  = ANCHOR_HOURS.has(h)
        const showLabel = h > hourStart

        return (
          <div key={h} className="relative">
            {/* Hour line — extends from label area toward grid, NOT full-width */}
            {showLabel && (
              <div className="absolute top-0 right-0 border-t border-grid-line" style={{ left: '38px' }} />
            )}
            {/* Compact time label — sits just below the line, not straddling it */}
            {showLabel && (
              <span
                className={cn(
                  'absolute left-2 top-0.5 text-[9px] font-mono leading-none select-none',
                  isAnchor
                    ? 'font-medium text-text-primary'
                    : 'font-normal text-text-tertiary',
                )}
              >
                {formatHour24(h)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
