import { describe, it, expect } from 'vitest'
import { startOfDay } from 'date-fns'
import { getDataMaturity } from '../maturity'
import type { CalendarEvent, EventColor } from '../event'
import type { CategoryId } from '../category'

const DAY_MS = 24 * 60 * 60_000
const HOUR_MS = 60 * 60_000
// Anchor on a local-date noon so startOfDay is deterministic within the test process
const REF_DAY = startOfDay(new Date(2026, 4, 1)).getTime()  // May 1, 2026 local midnight
const NOW = REF_DAY + 12 * HOUR_MS                          // noon

function evt(startTime: number, categoryId: CategoryId = 'accent'): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    title: 'test',
    startTime,
    endTime: startTime + 2 * HOUR_MS,
    color: categoryId as EventColor,
    categoryId,
    createdAt: startTime,
    updatedAt: startTime,
  }
}

// startOfDay for NOW = 2026-05-01T00:00:00Z

describe('getDataMaturity', () => {
  it('returns cold with 0/0 when no events', () => {
    const m = getDataMaturity([], NOW)
    expect(m).toEqual({
      daysRecorded: 0,
      consecutiveDays: 0,
      maturityLevel: 'cold',
    })
  })

  it('cold: 1 day of data', () => {
    const events = [evt(NOW - 1 * HOUR_MS)] // today
    const m = getDataMaturity(events, NOW)
    expect(m.daysRecorded).toBe(1)
    expect(m.consecutiveDays).toBe(1)
    expect(m.maturityLevel).toBe('cold')
  })

  it('cold: 2 days of data', () => {
    const events = [
      evt(NOW),
      evt(NOW - DAY_MS),
    ]
    const m = getDataMaturity(events, NOW)
    expect(m.daysRecorded).toBe(2)
    expect(m.maturityLevel).toBe('cold')
  })

  it('warming: 3 days of data (boundary)', () => {
    const events = [
      evt(NOW),
      evt(NOW - DAY_MS),
      evt(NOW - 2 * DAY_MS),
    ]
    const m = getDataMaturity(events, NOW)
    expect(m.daysRecorded).toBe(3)
    expect(m.maturityLevel).toBe('warming')
  })

  it('warming: 13 days', () => {
    const events = Array.from({ length: 13 }, (_, i) =>
      evt(NOW - i * DAY_MS),
    )
    const m = getDataMaturity(events, NOW)
    expect(m.daysRecorded).toBe(13)
    expect(m.maturityLevel).toBe('warming')
  })

  it('mature: 14 days (boundary)', () => {
    const events = Array.from({ length: 14 }, (_, i) =>
      evt(NOW - i * DAY_MS),
    )
    const m = getDataMaturity(events, NOW)
    expect(m.daysRecorded).toBe(14)
    expect(m.maturityLevel).toBe('mature')
  })

  it('mature: 30 days', () => {
    const events = Array.from({ length: 30 }, (_, i) =>
      evt(NOW - i * DAY_MS),
    )
    const m = getDataMaturity(events, NOW)
    expect(m.daysRecorded).toBe(30)
    expect(m.consecutiveDays).toBe(30)
    expect(m.maturityLevel).toBe('mature')
  })

  it('consecutiveDays: breaks at gap', () => {
    // Data for today, yesterday, day before — gap — then 5 days ago
    const events = [
      evt(NOW),
      evt(NOW - DAY_MS),
      evt(NOW - 2 * DAY_MS),
      // gap at 3 days ago
      evt(NOW - 5 * DAY_MS),
    ]
    const m = getDataMaturity(events, NOW)
    expect(m.daysRecorded).toBe(4)
    expect(m.consecutiveDays).toBe(3) // only counts back from today
  })

  it('consecutiveDays: starts from today even if no event today', () => {
    // Yesterday, day before — but nothing today
    const events = [
      evt(NOW - DAY_MS),
      evt(NOW - 2 * DAY_MS),
    ]
    const m = getDataMaturity(events, NOW)
    expect(m.consecutiveDays).toBe(0) // streak breaks at today
  })

  it('multiple events on same day count as one day', () => {
    const events = [
      evt(REF_DAY + 1 * HOUR_MS),
      evt(REF_DAY + 3 * HOUR_MS),
      evt(REF_DAY + 5 * HOUR_MS),
    ]
    const m = getDataMaturity(events, REF_DAY + 6 * HOUR_MS)
    expect(m.daysRecorded).toBe(1)
  })

  it('scattered non-consecutive days give low consecutive count', () => {
    const events = [
      evt(NOW - 10 * DAY_MS),
      evt(NOW - 30 * DAY_MS),
      evt(NOW - 60 * DAY_MS),
    ]
    const m = getDataMaturity(events, NOW)
    expect(m.daysRecorded).toBe(3)
    expect(m.consecutiveDays).toBeLessThanOrEqual(1)
    expect(m.maturityLevel).toBe('warming')
  })
})
