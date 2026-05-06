import type { CalendarEvent, EventColor } from './event'

export const SAFE_GAP_MS = 4 * 60 * 60 * 1000       // 4 hours
export const DEFAULT_DURATION_MS = 60 * 60 * 1000   // 1 hour

export interface DefaultTimes {
  start: number
  end: number
}

/**
 * Derive default start/end times for a new quick-log entry.
 *
 * - No prior event → [now - 1h, now]
 * - Prior event ended within SAFE_GAP_MS → [lastEvent.endTime, now]
 * - Prior event too old or in the future (clock drift) → fallback to [now - 1h, now]
 */
export function deriveDefaultTimes(
  lastEvent: CalendarEvent | null,
  now: number = Date.now(),
): DefaultTimes {
  if (!lastEvent) return { start: now - DEFAULT_DURATION_MS, end: now }
  const gap = now - lastEvent.endTime
  if (gap < 0 || gap > SAFE_GAP_MS) {
    return { start: now - DEFAULT_DURATION_MS, end: now }
  }
  return { start: lastEvent.endTime, end: now }
}

export function deriveDefaultColor(lastEvent: CalendarEvent | null): EventColor {
  return lastEvent?.color ?? 'accent'
}
