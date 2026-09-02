import type { CalendarEvent } from './event'

export type WeekDensityMode = 'sparse' | 'progressing' | 'dense'

export interface WeekDensityResult {
  mode: WeekDensityMode
  coverageRatio: number
  recordedMinutes: number
  visibleSegmentCount: number
}

const MINUTES_PER_WEEK = 7 * 24 * 60
const DENSE_SEGMENT_THRESHOLD = 90

interface Interval {
  start: number
  end: number
}

export function computeWeekDensity(events: CalendarEvent[], weekStart: Date): WeekDensityResult {
  const startMs = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime()
  const endMs = startMs + 7 * 24 * 60 * 60_000
  const intervals: Interval[] = []
  let visibleSegmentCount = 0

  for (const event of events) {
    if (event.deletedAt || event.endTime <= startMs || event.startTime >= endMs) continue
    const start = Math.max(startMs, event.startTime)
    const end = Math.min(endMs, event.endTime)
    if (end <= start) continue
    intervals.push({ start, end })
    visibleSegmentCount += countDaySegments(start, end, startMs)
  }

  intervals.sort((a, b) => a.start - b.start || a.end - b.end)
  let coveredMs = 0
  let active: Interval | null = null
  for (const interval of intervals) {
    if (!active) active = { ...interval }
    else if (interval.start <= active.end) active.end = Math.max(active.end, interval.end)
    else {
      coveredMs += active.end - active.start
      active = { ...interval }
    }
  }
  if (active) coveredMs += active.end - active.start

  const recordedMinutes = Math.round(coveredMs / 60_000)
  const coverageRatio = Math.min(1, recordedMinutes / MINUTES_PER_WEEK)
  const mode: WeekDensityMode = coverageRatio < 0.2
    ? 'sparse'
    : coverageRatio >= 0.8 || visibleSegmentCount >= DENSE_SEGMENT_THRESHOLD
      ? 'dense'
      : 'progressing'

  return { mode, coverageRatio, recordedMinutes, visibleSegmentCount }
}

function countDaySegments(start: number, end: number, weekStartMs: number): number {
  const firstDay = Math.floor((start - weekStartMs) / (24 * 60 * 60_000))
  const lastInstant = Math.max(start, end - 1)
  const lastDay = Math.floor((lastInstant - weekStartMs) / (24 * 60 * 60_000))
  return Math.max(1, lastDay - firstDay + 1)
}
