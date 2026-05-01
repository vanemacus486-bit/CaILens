import { startOfDay } from 'date-fns'
import type { CalendarEvent } from './event'

export type MaturityLevel = 'cold' | 'warming' | 'mature'

export interface DataMaturity {
  daysRecorded: number
  consecutiveDays: number
  maturityLevel: MaturityLevel
}

/**
 * Analyzes how much data the user has accumulated.
 *
 * - cold:   fewer than 3 distinct recording days — stats are mostly noise
 * - warming: 3–13 distinct recording days — trends are emerging but noisy
 * - mature:  14+ distinct recording days — comparisons are reliable
 *
 * `now` defaults to Date.now(); exposed for deterministic testing.
 */
export function getDataMaturity(
  events: readonly CalendarEvent[],
  now: number = Date.now(),
): DataMaturity {
  // Collect distinct dates from event startTimes
  const dates = new Set<number>()
  for (const e of events) {
    dates.add(startOfDay(e.startTime).getTime())
  }

  if (dates.size === 0) {
    return { daysRecorded: 0, consecutiveDays: 0, maturityLevel: 'cold' }
  }

  // Consecutive days from today going backwards
  const today = startOfDay(now).getTime()
  const DAY_MS = 24 * 60 * 60_000
  let consecutive = 0
  for (let i = 0; i < 365; i++) {
    if (dates.has(today - i * DAY_MS)) {
      consecutive++
    } else {
      break
    }
  }

  const daysRecorded = dates.size
  const maturityLevel: MaturityLevel =
    daysRecorded < 3 ? 'cold'
    : daysRecorded < 14 ? 'warming'
    : 'mature'

  return { daysRecorded, consecutiveDays: consecutive, maturityLevel }
}
