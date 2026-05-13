import type { CalendarEvent } from './event'
import type { EventSegment } from './eventSegment'
import { getDayStart, getDayEnd, isRangeOverlapping } from './time'
import { SLOTS_PER_HOUR } from './constants'

export interface PositionedEvent {
  event: CalendarEvent
  rowStart: number      // 1-based grid-row-start (in 48-slot grid)
  rowEnd: number        // 1-based grid-row-end, exclusive
  columnIndex: number   // 0-based column within a conflict group
  totalColumns: number  // column count for the conflict group
  startsBeforeDay: boolean  // true when event starts before this day
  endsAfterDay: boolean     // true when event ends after this day
}

/** Segment + event + layout info，用于渲染单个段。 */
export interface PositionedSegment {
  segment: EventSegment
  event: CalendarEvent
  rowStart: number
  rowEnd: number
  columnIndex: number
  totalColumns: number
}

/** Minutes from midnight for a timestamp, clamped to the range [0, 1440]. */
function minutesFromDayStart(timestamp: number, dayStart: number): number {
  return Math.max(0, Math.min(1440, Math.floor((timestamp - dayStart) / 60_000)))
}

/**
 * Lays out a flat list of events for a single calendar day using a greedy
 * column-packing algorithm, returning grid-based position data for rendering.
 *
 * Overlap semantics: two events overlap when their time ranges intersect
 * (half-open: [start, end)).
 */
export function layoutDayEvents(
  events: CalendarEvent[],
  day: Date,
): PositionedEvent[] {
  if (events.length === 0) return []

  const dayStart = getDayStart(day)
  const dayEnd   = getDayEnd(day)

  const dayEvents = events
    .filter((e) =>
      isRangeOverlapping(
        { start: e.startTime, end: e.endTime },
        { start: dayStart,    end: dayEnd    },
      ),
    )
    .sort((a, b) => a.startTime - b.startTime)

  if (dayEvents.length === 0) return []

  // --- Step 1: greedy column assignment ---
  // columnEnds[i] = latest endTime in column i
  const columnEnds: number[] = []
  const colAssigned: number[] = []

  for (const event of dayEvents) {
    let placed = -1
    for (let col = 0; col < columnEnds.length; col++) {
      if (columnEnds[col] <= event.startTime) {
        placed = col
        columnEnds[col] = event.endTime
        break
      }
    }
    if (placed === -1) {
      placed = columnEnds.length
      columnEnds.push(event.endTime)
    }
    colAssigned.push(placed)
  }

  // --- Step 2: totalColumns = max column index among directly overlapping events + 1 ---
  return dayEvents.map((event, i) => {
    let maxCol = colAssigned[i]
    for (let j = 0; j < dayEvents.length; j++) {
      if (
        j !== i &&
        isRangeOverlapping(
          { start: event.startTime, end: event.endTime },
          { start: dayEvents[j].startTime, end: dayEvents[j].endTime },
        )
      ) {
        maxCol = Math.max(maxCol, colAssigned[j])
      }
    }

    const clampedStart     = Math.max(event.startTime, dayStart)
    const clampedEnd       = Math.min(event.endTime, dayEnd)
    const startsBeforeDay  = event.startTime < dayStart
    const endsAfterDay     = event.endTime > dayEnd
    const startMinutes     = minutesFromDayStart(clampedStart, dayStart)
    const endMinutes       = minutesFromDayStart(clampedEnd,   dayStart)
    const minutesPerSlot = 60 / SLOTS_PER_HOUR  // 30

    const rowStart = Math.floor(startMinutes / minutesPerSlot) + 1
    const rowEnd   = Math.max(
      Math.ceil(endMinutes / minutesPerSlot) + 1,
      rowStart + 1,  // guarantee at least one slot of height
    )

    return {
      event,
      rowStart,
      rowEnd,
      columnIndex:  colAssigned[i],
      totalColumns: maxCol + 1,
      startsBeforeDay,
      endsAfterDay,
    }
  })
}

// ── Segment-based layout ──────────────────────────────────────

/**
 * 为一组 EventSegment 做列布局。
 * 与 layoutDayEvents 的区别：
 *   - 输入是已 clamp 到当天的 EventSegment[]，无需再做范围过滤和 clamp
 *   - 输出是 PositionedSegment，同时携带 segment 和 event
 *   - 重叠判断基于 segmentStart/segmentEnd（已在当天内）
 *
 * @param segments  当天的 EventSegment[]（已过滤、已排序）
 * @param eventMap  通过 eventId 查找 CalendarEvent
 */
export function layoutDaySegments(
  segments: EventSegment[],
  eventMap: Map<string, CalendarEvent>,
): PositionedSegment[] {
  if (segments.length === 0) return []

  // 按 segmentStart 排序
  const sorted = [...segments].sort((a, b) => a.segmentStart - b.segmentStart)

  // greedy column assignment
  const columnEnds: number[] = []
  const colAssigned: number[] = []

  for (const seg of sorted) {
    let placed = -1
    for (let col = 0; col < columnEnds.length; col++) {
      if (columnEnds[col] <= seg.segmentStart) {
        placed = col
        columnEnds[col] = seg.segmentEnd
        break
      }
    }
    if (placed === -1) {
      placed = columnEnds.length
      columnEnds.push(seg.segmentEnd)
    }
    colAssigned.push(placed)
  }

  // totalColumns = max column among directly overlapping segments + 1
  return sorted.map((seg, i) => {
    let maxCol = colAssigned[i]
    for (let j = 0; j < sorted.length; j++) {
      if (j !== i && isRangeOverlapping(
        { start: seg.segmentStart, end: seg.segmentEnd },
        { start: sorted[j].segmentStart, end: sorted[j].segmentEnd },
      )) {
        maxCol = Math.max(maxCol, colAssigned[j])
      }
    }

    const dayStart = getDayStart(new Date(seg.segmentStart))
    const startMinutes = Math.floor((seg.segmentStart - dayStart) / 60_000)
    const endMinutes   = Math.floor((seg.segmentEnd   - dayStart) / 60_000)
    const minutesPerSlot = 60 / SLOTS_PER_HOUR

    const rowStart = Math.floor(startMinutes / minutesPerSlot) + 1
    const rowEnd   = Math.max(
      Math.ceil(endMinutes / minutesPerSlot) + 1,
      rowStart + 1,
    )

    const event = eventMap.get(seg.eventId)
    if (!event) return null as unknown as PositionedSegment

    return {
      segment: seg,
      event,
      rowStart,
      rowEnd,
      columnIndex: colAssigned[i],
      totalColumns: maxCol + 1,
    }
  }).filter(Boolean)
}
