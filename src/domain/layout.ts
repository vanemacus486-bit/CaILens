import type { CalendarEvent } from './event'
import { getDayStart, getDayEnd, isRangeOverlapping } from './time'
import { SLOTS_PER_HOUR } from '@/features/week-view/constants'

export interface PositionedEvent {
  event: CalendarEvent
  rowStart: number      // 1-based grid-row-start (in 48-slot grid)
  rowEnd: number        // 1-based grid-row-end, exclusive
  columnIndex: number   // 0-based column within a conflict group
  totalColumns: number  // column count for the conflict group
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

    const clampedStart  = Math.max(event.startTime, dayStart)
    const clampedEnd    = Math.min(event.endTime, dayEnd)
    const startMinutes  = minutesFromDayStart(clampedStart, dayStart)
    const endMinutes    = minutesFromDayStart(clampedEnd,   dayStart)
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
    }
  })
}
