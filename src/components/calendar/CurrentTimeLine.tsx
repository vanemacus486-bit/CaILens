import { getDayStart } from '@/domain/time'
import { useCurrentTime } from '@/lib/hooks/useCurrentTime'

/**
 * Refined current-time indicator: 1px solid line + 3px dot with breathing animation.
 * The only animated element in the product — it represents "now."
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
      {/* 3px dot with breathing animation */}
      <span
        className="absolute -left-[5px] -translate-y-1/2 block rounded-full bg-time-line"
        style={{
          width: '3px',
          height: '3px',
          animation: 'time-line-breathe 2s ease-in-out infinite',
        }}
      />
      {/* 1px solid line */}
      <div className="border-t border-time-line" />
    </div>
  )
}
