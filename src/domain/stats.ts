import type { CalendarEvent } from './event'
import type { Category, CategoryId } from './category'

export interface CategoryStat {
  categoryId: CategoryId
  minutes: number     // union-deduplicated minutes for this category in the week
  percentage: number  // share of totalMinutes, rounded to 1 decimal place (0–100)
}

export interface WeekStats {
  totalMinutes: number   // union of all event intervals in the week (denominator)
  byCategory: CategoryStat[]  // one entry per category, same order as categories arg
}

/**
 * Merges overlapping intervals. Abutting intervals (end === start of next) are
 * NOT merged — consistent with the half-open interval semantics used elsewhere
 * in this codebase (see domain/time.ts isRangeOverlapping).
 *
 * Exported for unit-testing the merge logic independently.
 */
export function mergeIntervals(
  intervals: ReadonlyArray<[number, number]>,
): Array<[number, number]> {
  if (intervals.length === 0) return []

  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  const result: Array<[number, number]> = [[sorted[0][0], sorted[0][1]]]

  for (let i = 1; i < sorted.length; i++) {
    const last = result[result.length - 1]
    const [start, end] = sorted[i]
    if (start < last[1]) {
      // Overlapping: extend the merged interval
      last[1] = Math.max(last[1], end)
    } else {
      // Abutting (start === last[1]) or gap: keep separate
      result.push([start, end])
    }
  }

  return result
}

function sumMerged(intervals: Array<[number, number]>): number {
  return intervals.reduce((acc, [s, e]) => acc + (e - s), 0)
}

/**
 * Computes per-category time statistics for a week.
 *
 * Algorithm:
 * 1. Clip each event to [weekStart, weekEnd); discard events that become empty.
 * 2. Denominator = union length of ALL clipped intervals (interval merge).
 * 3. Per-category numerator = union length of that category's intervals only.
 *
 * weekStart is inclusive, weekEnd is exclusive (half-open interval).
 */
export function computeWeekStats(
  events: readonly CalendarEvent[],
  categories: readonly Category[],
  weekStart: number,  // UTC ms, inclusive
  weekEnd: number,    // UTC ms, exclusive
): WeekStats {
  // Step 1: clip to week boundary, drop empty intervals
  const clipped: Array<{ categoryId: CategoryId; start: number; end: number }> = []
  for (const event of events) {
    const start = Math.max(event.startTime, weekStart)
    const end   = Math.min(event.endTime,   weekEnd)
    if (end > start) {
      clipped.push({ categoryId: event.categoryId, start, end })
    }
  }

  // Step 2: denominator — union of all clipped intervals
  const allIntervals: Array<[number, number]> = clipped.map((e) => [e.start, e.end])
  const totalMs      = sumMerged(mergeIntervals(allIntervals))
  const totalMinutes = totalMs / 60_000

  // Step 3: per-category stats (same order as categories argument)
  const byCategory: CategoryStat[] = categories.map((cat) => {
    const catIntervals: Array<[number, number]> = clipped
      .filter((e) => e.categoryId === cat.id)
      .map((e) => [e.start, e.end])

    const catMs      = sumMerged(mergeIntervals(catIntervals))
    const catMinutes = catMs / 60_000

    // Guard against 0/0 → NaN
    const percentage = totalMinutes === 0
      ? 0
      : Math.round((catMinutes / totalMinutes) * 100 * 10) / 10

    return { categoryId: cat.id, minutes: catMinutes, percentage }
  })

  return { totalMinutes, byCategory }
}

export interface DayStats {
  totalMinutes: number
  byCategory: CategoryStat[]
}

/**
 * Computes per-category time statistics for a single day.
 * Same algorithm as computeWeekStats but for a 24-hour day boundary.
 *
 * dayStart is inclusive, dayEnd is exclusive (half-open interval).
 */
export function computeDayStats(
  events: readonly CalendarEvent[],
  categories: readonly Category[],
  dayStart: number,
  dayEnd: number,
): DayStats {
  return computeWeekStats(events, categories, dayStart, dayEnd)
}

const WEEK_MS = 7 * 24 * 60 * 60_000

/**
 * Counts consecutive past weeks (including the current incomplete one) that
 * have at least one event. Returns 0 if there are no events at all.
 *
 * A "week" is a fixed 7-day window. The most recent week ends at `now` and
 * starts at `now - 7 days`. This avoids coupling the streak to the calendar
 * week-start setting and ensures the streak updates in real-time as time passes.
 */
export function computeStreak(events: readonly CalendarEvent[]): number {
  if (events.length === 0) return 0

  const now = Date.now()
  let streak = 0

  // Walk backwards from now in 7-day steps
  for (let i = 0; i < 200; i++) {
    const weekEnd = now - i * WEEK_MS
    const weekStart = weekEnd - WEEK_MS

    const hasEvent = events.some(
      (e) => e.startTime < weekEnd && e.endTime > weekStart,
    )
    if (!hasEvent) break
    streak++
  }

  return streak
}

export interface TypeSplit {
  typeI: { hours: number; pct: number }
  typeII: { hours: number; pct: number }
}

// Type I: creative core (accent + sky); Type II: auxiliary (sage, sand, rose, stone)
const TYPE_I_IDS: CategoryId[] = ['accent', 'sky']
const TYPE_II_IDS: CategoryId[] = ['sage', 'sand', 'rose', 'stone']

export function computeTypeSplit(byCategory: Record<CategoryId, number>): TypeSplit {
  let typeI = 0
  let typeII = 0
  for (const id of TYPE_I_IDS) typeI += byCategory[id] || 0
  for (const id of TYPE_II_IDS) typeII += byCategory[id] || 0
  const total = typeI + typeII
  return {
    typeI: { hours: typeI, pct: total > 0 ? Math.round((typeI / total) * 100) : 0 },
    typeII: { hours: typeII, pct: total > 0 ? Math.round((typeII / total) * 100) : 0 },
  }
}
