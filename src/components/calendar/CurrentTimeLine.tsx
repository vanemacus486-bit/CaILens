import { useCurrentTime } from '@/lib/hooks/useCurrentTime'

/**
 * Minutes since midnight based on clock hours (not UTC elapsed), so DST
 * transition days (23h / 25h) still align the indicator with the hour grid.
 * @returns 0–1439
 */
function clockMinutesSinceMidnight(ts: number): number {
  const d = new Date(ts)
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * Current-time indicator: 1px solid accent line + 5px solid dot.
 * Only rendered inside today's column. Updates every 60 seconds.
 */
export function CurrentTimeLine() {
  const now    = useCurrentTime()
  const minutes  = clockMinutesSinceMidnight(now)
  const topPct   = (minutes / (24 * 60)) * 100

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${topPct}%` }}
    >
      {/* 5px solid dot */}
      <span
        className="absolute -left-[6px] -translate-y-1/2 block rounded-full"
        style={{
          width: '5px',
          height: '5px',
          backgroundColor: 'var(--accent)',
          animation: 'time-line-breathe 2s ease-in-out infinite',
        }}
      />
      {/* 1px solid line spanning the full column */}
      <div style={{ borderTop: '1px solid var(--accent)' }} />
    </div>
  )
}
