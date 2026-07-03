import { describe, it, expect } from 'vitest'
import { computeDailyCoverage } from '../coverage'
import type { CalendarEvent, EventColor } from '../event'
import type { CategoryId } from '../category'

const HOUR = 3_600_000
const DAY = 86_400_000

function makeEvent(
  id: string,
  startTime: number,
  endTime: number,
): CalendarEvent {
  return {
    id,
    title: 'test',
    startTime,
    endTime,
    color: 'accent' as EventColor,
    categoryId: 'accent' as CategoryId,
    createdAt: 0,
    updatedAt: 0,
  }
}

describe('computeDailyCoverage', () => {
  it('returns empty Map for empty events', () => {
    const result = computeDailyCoverage([], 0, DAY)
    expect(result.size).toBe(0)
  })

  it('returns empty Map for zero-length range', () => {
    const events = [makeEvent('1', 0, HOUR)]
    const result = computeDailyCoverage(events, 100, 100)
    expect(result.size).toBe(0)
  })

  it('computes coverage for a single event within one day', () => {
    // Event 10:00–12:00 on day 0
    const day0 = 0
    const events = [makeEvent('1', day0 + 10 * HOUR, day0 + 12 * HOUR)]
    const result = computeDailyCoverage(events, day0, day0 + DAY)

    expect(result.size).toBe(1)
    expect(result.get(day0)).toBe(2 * HOUR)
  })

  it('merges overlapping events on the same day', () => {
    const day0 = 0
    const events = [
      makeEvent('1', day0 + 9 * HOUR, day0 + 11 * HOUR),
      makeEvent('2', day0 + 10 * HOUR, day0 + 12 * HOUR),
    ]
    const result = computeDailyCoverage(events, day0, day0 + DAY)

    // 9:00–12:00 = 3h (merged)
    expect(result.get(day0)).toBe(3 * HOUR)
  })

  it('does not count abutting intervals twice', () => {
    const day0 = 0
    const events = [
      makeEvent('1', day0 + 9 * HOUR, day0 + 10 * HOUR),
      makeEvent('2', day0 + 10 * HOUR, day0 + 11 * HOUR),
    ]
    const result = computeDailyCoverage(events, day0, day0 + DAY)

    // Abutting (9-10 and 10-11) are NOT merged, so total = 2h
    expect(result.get(day0)).toBe(2 * HOUR)
  })

  it('splits cross-day events across days', () => {
    // Event from 22:00 day 0 to 02:00 day 1
    const day0 = 0
    const day1 = day0 + DAY
    const events = [makeEvent('1', day0 + 22 * HOUR, day1 + 2 * HOUR)]
    const result = computeDailyCoverage(events, day0, day1 + DAY)

    expect(result.size).toBe(2)
    // Day 0: 22:00–24:00 = 2h (clipped to day boundary)
    expect(result.get(day0)).toBe(2 * HOUR)
    // Day 1: 00:00–02:00 = 2h (clipped to day boundary)
    expect(result.get(day1)).toBe(2 * HOUR)
  })

  it('handles events completely outside the range', () => {
    const day0 = 0
    const events = [makeEvent('1', day0 + 2 * DAY, day0 + 3 * DAY)]
    const result = computeDailyCoverage(events, day0, day0 + DAY)
    expect(result.size).toBe(0)
  })

  it('clips events that extend beyond the range end', () => {
    const day0 = 0
    const events = [makeEvent('1', day0 + 22 * HOUR, day0 + 30 * HOUR)]
    const result = computeDailyCoverage(events, day0, day0 + DAY)

    // Clipped to day 0: 22:00–24:00 = 2h
    expect(result.get(day0)).toBe(2 * HOUR)
  })

  it('returns multiple days with varying coverage', () => {
    const day0 = 0
    const day1 = day0 + DAY
    const day2 = day0 + 2 * DAY
    const events = [
      makeEvent('1', day0 + 8 * HOUR, day0 + 12 * HOUR),   // day0: 4h
      makeEvent('2', day1 + 9 * HOUR, day1 + 11 * HOUR),   // day1: 2h
      // day2: no events
    ]
    const result = computeDailyCoverage(events, day0, day2 + DAY)

    expect(result.size).toBe(2)
    expect(result.get(day0)).toBe(4 * HOUR)
    expect(result.get(day1)).toBe(2 * HOUR)
    expect(result.has(day2)).toBe(false) // no events → no entry
  })
})
