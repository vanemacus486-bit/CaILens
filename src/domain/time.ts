import {
  startOfWeek,
  addDays,
  addWeeks as dfnAddWeeks,
  isSameDay as dfnIsSameDay,
  isToday as dfnIsToday,
  startOfDay,
  format as dfnFormat,
  parseISO,
} from 'date-fns'

// ── Week ─────────────────────────────────────────────────

export function getWeekStart(date: Date, weekStartsOn: 0 | 1): Date {
  return startOfWeek(date, { weekStartsOn })
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function addWeeks(weekStart: Date, count: number): Date {
  return dfnAddWeeks(weekStart, count)
}

export function isSameDay(a: Date | number, b: Date | number): boolean {
  return dfnIsSameDay(a, b)
}

export function isToday(timestamp: number): boolean {
  return dfnIsToday(new Date(timestamp))
}

// ── Day ──────────────────────────────────────────────────

export function getDayStart(date: Date): number {
  return startOfDay(date).getTime()
}

// Returns the start of the NEXT day (exclusive upper bound for the day).
export function getDayEnd(date: Date): number {
  return addDays(startOfDay(date), 1).getTime()
}

export function getMinutesFromDayStart(timestamp: number): number {
  const d = new Date(timestamp)
  return d.getHours() * 60 + d.getMinutes()
}

// ── Formatting ───────────────────────────────────────────

export function formatISODate(date: Date): string {
  return dfnFormat(date, 'yyyy-MM-dd')
}

// Uses date-fns parseISO which treats date-only strings as local midnight
// (not UTC midnight), avoiding the off-by-one-day bug in UTC+ timezones.
export function parseISODate(isoDate: string): Date {
  return parseISO(isoDate)
}

export function formatTime(timestamp: number, timeFormat: '12h' | '24h'): string {
  const d = new Date(timestamp)
  return timeFormat === '12h'
    ? dfnFormat(d, 'h:mm a')
    : dfnFormat(d, 'HH:mm')
}

export function formatWeekday(date: Date, style: 'short' | 'long'): string {
  return dfnFormat(date, style === 'short' ? 'EEE' : 'EEEE')
}

export function formatMonthDay(date: Date): string {
  return dfnFormat(date, 'MMM d')
}

// ── Range / overlap ──────────────────────────────────────

export function isRangeOverlapping(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && a.end > b.start
}

export function isEventOnDay(
  event: { startTime: number; endTime: number },
  day: Date,
): boolean {
  return isRangeOverlapping(
    { start: event.startTime, end: event.endTime },
    { start: getDayStart(day), end: getDayEnd(day) },
  )
}

// Exact number of ms in 7 days — no DST ambiguity since we work in UTC epoch ms.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Returns a shallow copy of `events` with startTime/endTime shifted by
 * `weeks` weeks (positive = forward, negative = backward).
 *
 * Arithmetic is done in raw ms (WEEK_MS) rather than date-fns addWeeks so
 * that local DST transitions never change the UTC offset of the stored value.
 */
export function shiftEventsByWeeks<T extends { startTime: number; endTime: number }>(
  events: T[],
  weeks: number,
): T[] {
  const delta = WEEK_MS * weeks
  return events.map((e) => ({ ...e, startTime: e.startTime + delta, endTime: e.endTime + delta }))
}

/**
 * Returns a new timestamp on `targetDay` with the same local hours/minutes
 * as `timestamp`, with seconds and milliseconds reset to zero.
 *
 * Used for cross-column drag: e.g. Monday 10:30 dragged to Wednesday
 * gives Wednesday 10:30.
 */
export function moveTimestampToDay(timestamp: number, targetDay: Date): number {
  const original = new Date(timestamp)
  return new Date(
    targetDay.getFullYear(),
    targetDay.getMonth(),
    targetDay.getDate(),
    original.getHours(),
    original.getMinutes(),
    0,
    0,
  ).getTime()
}
