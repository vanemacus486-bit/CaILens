import type { CalendarEvent } from './event'
import { mergeIntervals } from './stats'

export interface DayGap {
  start: number // UTC ms
  end: number   // UTC ms
}

/**
 * 计算一天内未被事件覆盖的间隙。
 *
 * - 事件先裁剪到 [dayStartMs, dayEndMs)，再合并重叠区间（复用 stats.ts 的 mergeIntervals）。
 * - 间隙 = dayStart→首个区间、区间与区间之间、末区间→有效终点。
 * - 有效终点 = min(dayEndMs, nowMs)：今天只统计到"现在"，未来不算未记录；
 *   nowMs <= dayStartMs（未来日）→ 返回 []。
 * - 过滤掉时长 < minGapMs 的间隙。
 *
 * @param events     当日事件列表（仅当天的事件或跨天事件的片段）
 * @param dayStartMs 当日 00:00 UTC ms（含）
 * @param dayEndMs   次日 00:00 UTC ms（不含）
 * @param opts.nowMs  当前时间 UTC ms
 * @param opts.minGapMs 最小间隙时长（默认 30 分钟）
 */
export function computeDayGaps(
  events: readonly CalendarEvent[],
  dayStartMs: number,
  dayEndMs: number,
  opts: { nowMs: number; minGapMs?: number },
): DayGap[] {
  const minGapMs = opts.minGapMs ?? 30 * 60_000

  // 未来日：没有幽灵块
  if (opts.nowMs <= dayStartMs) return []

  // 有效终点：今天及过去日只到 nowMs
  const effectiveEnd = Math.min(dayEndMs, opts.nowMs)

  // 全天无事件 → 整段间隙
  if (events.length === 0) {
    return effectiveEnd - dayStartMs < minGapMs ? [] : [{ start: dayStartMs, end: effectiveEnd }]
  }

  // 将事件裁剪到当天边界，再合并重叠
  const intervals: Array<[number, number]> = []
  for (const event of events) {
    const start = Math.max(event.startTime, dayStartMs)
    const end   = Math.min(event.endTime, dayStartMs + 24 * 60 * 60_000)
    if (end > start) {
      intervals.push([start, end])
    }
  }

  // 无有效事件段 → 如同无事件
  if (intervals.length === 0) {
    return effectiveEnd - dayStartMs < minGapMs ? [] : [{ start: dayStartMs, end: effectiveEnd }]
  }

  const merged = mergeIntervals(intervals)

  // 将合并后的区间也裁剪到 effectiveEnd，防止有效终点后的区间产生假间隙
  const clippedMerged: Array<[number, number]> = merged
    .map(([s, e]) => [Math.max(s, dayStartMs), Math.min(e, effectiveEnd)] as [number, number])
    .filter(([s, e]) => e > s)

  if (clippedMerged.length === 0) {
    return effectiveEnd - dayStartMs < minGapMs ? [] : [{ start: dayStartMs, end: effectiveEnd }]
  }

  const gaps: DayGap[] = []

  // 间隙1：dayStart → 第一个合并区间
  if (clippedMerged[0][0] > dayStartMs) {
    gaps.push({ start: dayStartMs, end: clippedMerged[0][0] })
  }

  // 区间之间的间隙
  for (let i = 1; i < clippedMerged.length; i++) {
    gaps.push({ start: clippedMerged[i - 1][1], end: clippedMerged[i][0] })
  }

  // 间隙2：最后一个合并区间 → effectiveEnd
  const lastEnd = clippedMerged[clippedMerged.length - 1][1]
  if (lastEnd < effectiveEnd) {
    gaps.push({ start: lastEnd, end: effectiveEnd })
  }

  // 过滤掉时长不足的间隙
  return gaps.filter((g) => g.end - g.start >= minGapMs)
}
