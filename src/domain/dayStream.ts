import type { CalendarEvent, EventColor } from './event'

// ── Types ─────────────────────────────────────────────────────

export interface DayStreamRow {
  id: string
  title: string
  /** Formatted start time, e.g. "07:10" */
  startStr: string
  /** Formatted end time, e.g. "08:00" */
  endStr: string
  /** Human-readable duration, e.g. "50m" or "2.5h" */
  durationStr: string
  /** CSS variable for the event's color bar, e.g. "var(--event-accent-fill)" */
  barColor: string
  /** Sort order key (UTC ms) */
  sortKey: number
  /** Reference to the original event for editing */
  calendarEvent: CalendarEvent
}

// ── Pure formatting helpers (testable) ────────────────────────

/** Format a timestamp to "HH:MM" (24h). */
export function fmtStreamTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Format a duration in ms to human-readable string. */
export function fmtStreamDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}m` : `${h}h`
  }
  return `${minutes}m`
}

/** CSS variable for an event's color bar fill. */
export function eventBarFill(color: EventColor): string {
  if (color === 'stone') return 'var(--cat-sleep)'
  return `var(--event-${color}-fill)`
}

/**
 * Transform an array of CalendarEvent for a single day into
 * sorted DayStreamRow objects ready for rendering.
 *
 * Events are sorted by startTime ascending.
 * Cross-day events (clipped by bucketEventsByLocalDay) will have
 * their clipped start/end displayed.
 */
export function buildDayStreamRows(events: readonly CalendarEvent[]): DayStreamRow[] {
  return [...events]
    .sort((a, b) => a.startTime - b.startTime)
    .map((event) => ({
      id: event.id,
      title: event.title,
      startStr: fmtStreamTime(event.startTime),
      endStr: fmtStreamTime(event.endTime),
      durationStr: fmtStreamDuration(event.endTime - event.startTime),
      barColor: eventBarFill(event.color),
      sortKey: event.startTime,
      calendarEvent: event,
    }))
}
