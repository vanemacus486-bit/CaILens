import type { CalendarEvent } from './event'
import { bucketEventsByLocalDay, mergeIntervals } from './stats'

/**
 * 按本地日计算每天的已记录毫秒数（重叠区间合并后，事件裁剪到当日边界）。
 *
 * 实现：复用 stats.ts 的 bucketEventsByLocalDay 分桶 + mergeIntervals 合并。
 * 范围半开：[rangeStartMs, rangeEndMs)。
 *
 * @returns Map<当天0点ms, 合并后毫秒>
 */
export function computeDailyCoverage(
  events: readonly CalendarEvent[],
  rangeStartMs: number,
  rangeEndMs: number,
): Map<number, number> {
  const result = new Map<number, number>()
  if (events.length === 0 || rangeStartMs >= rangeEndMs) return result

  const buckets = bucketEventsByLocalDay(events, rangeStartMs, rangeEndMs)

  const DAY_MS = 86_400_000
  for (let i = 0; i < buckets.length; i++) {
    const dayEvents = buckets[i]
    if (dayEvents.length === 0) continue

    const intervals: Array<[number, number]> = dayEvents.map((e) => [e.startTime, e.endTime])
    const merged = mergeIntervals(intervals)
    const totalMs = merged.reduce((acc, [s, e]) => acc + (e - s), 0)

    const dayStart = rangeStartMs + i * DAY_MS
    result.set(dayStart, totalMs)
  }

  return result
}
