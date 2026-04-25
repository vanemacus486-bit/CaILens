import { getDayStart } from '@/domain/time'
import { useCurrentTime } from '@/lib/hooks/useCurrentTime'

/**
 * Self-contained: calls useCurrentTime() internally so only this component
 * re-renders every minute. DayColumn and everything above it stay unaffected.
 */
export function CurrentTimeLine() {
  const now      = useCurrentTime()
  const dayStart = getDayStart(new Date())
  const minutes  = (now - dayStart) / 60_000
  const topPct   = (minutes / (24 * 60)) * 100

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${topPct}%` }}
    >
      <div className="absolute -left-1 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--time-line)]" />
      <div className="border-t border-[var(--time-line)]" />
    </div>
  )
}
