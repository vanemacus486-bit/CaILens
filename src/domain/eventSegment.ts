import type { CalendarEvent } from './event'
import { getDayStart, getDayEnd, isRangeOverlapping } from './time'

// ── 类型 ──────────────────────────────────────────────────────

/**
 * 事件在单天内的视觉切片。
 * 跨天事件每天产生一个 segment；不跨天的事件产生一个 segment。
 * 所有 segment 引用同一个 eventId，数据层不做拆分。
 */
export interface EventSegment {
  eventId: string
  /** 已 clamp 到当天的起始时间（UTC ms） */
  segmentStart: number
  /** 已 clamp 到当天的结束时间（UTC ms） */
  segmentEnd: number
  /** 在 visibleDateRange 中的 0-based 索引 */
  dayIndex: number
  /** 是事件的第一段——左下角去掉圆角，仅顶部 resize handle 可见 */
  isFirstSegment: boolean
  /** 是事件的最后一段——右上角去掉圆角，仅底部 resize handle 可见 */
  isLastSegment: boolean
}

// ── 拆分函数 ──────────────────────────────────────────────────

/**
 * 将事件按 visibleDateRange 切成若干 EventSegment。
 * 纯函数，不依赖任何外部状态，结果仅取决于 event 和 visibleDateRange。
 */
export function splitEventIntoSegments(
  event: CalendarEvent,
  visibleDateRange: Date[],
): EventSegment[] {
  const segments: EventSegment[] = []

  for (let i = 0; i < visibleDateRange.length; i++) {
    const day = visibleDateRange[i]
    const dayStart = getDayStart(day)
    const dayEnd = getDayEnd(day)

    if (
      !isRangeOverlapping(
        { start: event.startTime, end: event.endTime },
        { start: dayStart, end: dayEnd },
      )
    )
      continue

    segments.push({
      eventId: event.id,
      segmentStart: Math.max(event.startTime, dayStart),
      segmentEnd: Math.min(event.endTime, dayEnd),
      dayIndex: i,
      isFirstSegment: event.startTime >= dayStart,
      isLastSegment: event.endTime <= dayEnd,
    })
  }

  return segments
}

/**
 * 为一组事件批量生成 segments → dayIndex 的映射。
 * 调用方使用 useMemo，依赖 [events, visibleDateRange]。
 */
export function buildSegmentsByDay(
  events: CalendarEvent[],
  visibleDateRange: Date[],
): Map<number, EventSegment[]> {
  const map = new Map<number, EventSegment[]>()
  for (let i = 0; i < visibleDateRange.length; i++) {
    map.set(i, [])
  }
  for (const event of events) {
    const segments = splitEventIntoSegments(event, visibleDateRange)
    for (const seg of segments) {
      map.get(seg.dayIndex)!.push(seg)
    }
  }
  return map
}
