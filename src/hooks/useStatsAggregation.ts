import { useMemo } from 'react'
import {
  startOfWeek,
  startOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subMonths,
} from 'date-fns'
import { useEventStore } from '@/stores/eventStore'
import { mergeIntervals } from '@/domain/stats'
import type { CategoryId } from '@/domain/category'
import type { CalendarEvent } from '@/domain/event'

export type Granularity = 'week' | 'month'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

export interface Bucket {
  start: Date
  end: Date
  byCategory: Record<CategoryId, number>
  byHourSlot: number[][]
  total: number
}

export interface StatsAggregationResult {
  current: Bucket
  history: Bucket[]
  previous: Bucket | null
}

function emptyByCategory(): Record<CategoryId, number> {
  return { accent: 0, sage: 0, sand: 0, sky: 0, rose: 0, stone: 0 }
}

function emptyByHourSlot(): number[][] {
  return Array.from({ length: 7 }, () => Array(24).fill(0))
}

function sumMerged(intervals: Array<[number, number]>): number {
  return intervals.reduce((acc, [s, e]) => acc + (e - s), 0)
}

function clipEvent(
  event: CalendarEvent,
  rangeStart: number,
  rangeEnd: number,
): CalendarEvent | null {
  const start = Math.max(event.startTime, rangeStart)
  const end = Math.min(event.endTime, rangeEnd)
  return end > start ? { ...event, startTime: start, endTime: end } : null
}

function computeByCategory(clipped: CalendarEvent[]): Record<CategoryId, number> {
  const result = emptyByCategory()
  if (clipped.length === 0) return result

  for (const catId of CATEGORY_IDS) {
    const intervals: Array<[number, number]> = clipped
      .filter((e) => e.categoryId === catId)
      .map((e) => [e.startTime, e.endTime])
    if (intervals.length === 0) continue
    result[catId] = sumMerged(mergeIntervals(intervals)) / 3_600_000
  }

  return result
}

function computeByHourSlot(clipped: CalendarEvent[]): number[][] {
  const grid = emptyByHourSlot()

  for (const event of clipped) {
    const startMs = event.startTime
    const endMs = event.endTime
    const startDate = new Date(startMs)

    let cursor = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      startDate.getHours(),
    )

    while (cursor.getTime() < endMs) {
      const nextHour = new Date(cursor.getTime() + 3_600_000)
      const overlapStart = Math.max(startMs, cursor.getTime())
      const overlapEnd = Math.min(endMs, nextHour.getTime())
      const overlapHours = Math.max(0, overlapEnd - overlapStart) / 3_600_000

      const dayOfWeek = (cursor.getDay() + 6) % 7
      const hour = cursor.getHours()

      grid[dayOfWeek][hour] += overlapHours
      cursor = nextHour
    }
  }

  return grid
}

function getBucketRange(
  anchor: Date,
  granularity: Granularity,
): [number, number] {
  if (granularity === 'week') {
    const start = startOfWeek(anchor, { weekStartsOn: 1 })
    return [start.getTime(), addDays(start, 7).getTime()]
  }
  const start = startOfMonth(anchor)
  return [start.getTime(), addMonths(start, 1).getTime()]
}

export function computeBucket(
  events: readonly CalendarEvent[],
  rangeStart: number,
  rangeEnd: number,
): Bucket {
  const clipped = events
    .map((e) => clipEvent(e, rangeStart, rangeEnd))
    .filter((e): e is CalendarEvent => e !== null)

  const byCategory = computeByCategory(clipped)
  const byHourSlot = computeByHourSlot(clipped)

  const allIntervals: Array<[number, number]> = clipped.map((e) => [e.startTime, e.endTime])
  const totalMs = sumMerged(mergeIntervals(allIntervals))
  const total = totalMs / 3_600_000

  return {
    start: new Date(rangeStart),
    end: new Date(rangeEnd),
    byCategory,
    byHourSlot,
    total,
  }
}

function computeHistory(
  events: readonly CalendarEvent[],
  anchorDate: Date,
  granularity: Granularity,
  lookbackBuckets: number,
): Bucket[] {
  const buckets: Bucket[] = []
  for (let i = lookbackBuckets - 1; i >= 0; i--) {
    const anchor =
      granularity === 'week'
        ? addWeeks(anchorDate, -i)
        : subMonths(anchorDate, i)
    const [start, end] = getBucketRange(anchor, granularity)
    buckets.push(computeBucket(events, start, end))
  }
  return buckets.sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function useStatsAggregation(opts: {
  granularity: Granularity
  anchorDate: Date
  lookbackBuckets?: number
}): StatsAggregationResult {
  const { granularity, anchorDate, lookbackBuckets = 1 } = opts
  const rangeEvents = useEventStore((s) => s.rangeEvents)
  const anchorMs = anchorDate.getTime()

  return useMemo(() => {
    const history = computeHistory(rangeEvents, anchorDate, granularity, lookbackBuckets)
    return {
      current: history[history.length - 1],
      history,
      previous: history.length >= 2 ? history[history.length - 2] : null,
    }
  // anchorMs is the stable dep; anchorDate object reference may change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeEvents, anchorMs, granularity, lookbackBuckets])
}
