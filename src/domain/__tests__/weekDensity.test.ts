import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '../event'
import { computeWeekDensity } from '../weekDensity'

const WEEK_START = new Date(2026, 6, 20)

function event(id: string, day: number, startHour: number, endHour: number): CalendarEvent {
  const start = new Date(2026, 6, 20 + day, startHour).getTime()
  const end = new Date(2026, 6, 20 + day, endHour).getTime()
  return {
    id,
    title: id,
    startTime: start,
    endTime: end,
    color: 'accent',
    categoryId: 'accent',
    createdAt: start,
    updatedAt: start,
  }
}

describe('computeWeekDensity', () => {
  it('does not double count overlapping events', () => {
    const result = computeWeekDensity([
      event('a', 0, 8, 12),
      event('b', 0, 10, 14),
    ], WEEK_START)
    expect(result.recordedMinutes).toBe(6 * 60)
    expect(result.mode).toBe('sparse')
  })

  it('counts cross-midnight events as multiple visible segments', () => {
    const start = new Date(2026, 6, 20, 22).getTime()
    const end = new Date(2026, 6, 21, 2).getTime()
    const result = computeWeekDensity([{ ...event('overnight', 0, 0, 1), startTime: start, endTime: end }], WEEK_START)
    expect(result.recordedMinutes).toBe(240)
    expect(result.visibleSegmentCount).toBe(2)
  })

  it('classifies half-filled and fully-filled weeks', () => {
    const halfWeek = Array.from({ length: 4 }, (_, day) => event(`day-${day}`, day, 0, 24))
    const fullWeek = Array.from({ length: 7 }, (_, day) => event(`full-${day}`, day, 0, 24))
    expect(computeWeekDensity(halfWeek, WEEK_START).mode).toBe('progressing')
    expect(computeWeekDensity(fullWeek, WEEK_START).mode).toBe('dense')
    expect(computeWeekDensity(fullWeek, WEEK_START).coverageRatio).toBe(1)
  })
})
