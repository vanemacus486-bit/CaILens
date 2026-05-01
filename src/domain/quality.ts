import type { CalendarEvent } from './event'
import { mergeIntervals } from './stats'

export interface RecordQualityMetrics {
  eventCount: number         // number of events in the period
  avgGranularity: number     // average hours per event (total union hours / count)
  realTimeRatio: number      // 0–1: proportion of events logged within 1h of the event start
  coverage: number           // 0–1: union event hours / waking hours in the period
}

const REAL_TIME_THRESHOLD_MS = 60 * 60_000  // 1 hour
const SLEEP_HOURS_PER_DAY = 8

/**
 * Computes meta-metrics about the quality of the recording habit itself.
 *
 * - eventCount: how many separate events were logged
 * - avgGranularity: average hours per event (lower = finer-grained recording)
 * - realTimeRatio: share of events created within 1 hour of their start time
 * - coverage: share of waking hours that have at least one recorded event
 */
export function computeRecordQuality(
  events: readonly CalendarEvent[],
  periodStart: number,
  periodEnd: number,
): RecordQualityMetrics {
  const eventCount = events.length

  // Union hours for the period
  const clipped = events.map((e) => {
    const start = Math.max(e.startTime, periodStart)
    const end   = Math.min(e.endTime, periodEnd)
    return [start, end] as [number, number]
  }).filter(([s, e]) => e > s)

  const totalMs = mergeIntervals(clipped).reduce((sum, [s, e]) => sum + (e - s), 0)
  const totalHours = totalMs / 3_600_000

  const avgGranularity = eventCount > 0 ? totalHours / eventCount : 0

  // Real-time ratio: events created within 1 hour of their start time
  const realTimeCount = events.filter(
    (e) => e.createdAt - e.startTime <= REAL_TIME_THRESHOLD_MS,
  ).length
  const realTimeRatio = eventCount > 0 ? realTimeCount / eventCount : 0

  // Coverage: union hours / waking hours
  const periodDays = Math.max((periodEnd - periodStart) / (24 * 60 * 60_000), 1)
  const wakingHours = periodDays * (24 - SLEEP_HOURS_PER_DAY)
  const coverage = wakingHours > 0 ? Math.min(totalHours / wakingHours, 1) : 0

  return { eventCount, avgGranularity, realTimeRatio, coverage }
}
