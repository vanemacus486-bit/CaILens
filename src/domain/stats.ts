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
