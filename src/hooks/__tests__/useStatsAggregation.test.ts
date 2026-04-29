import { describe, it, expect } from 'vitest'
import { computeBucket } from '../useStatsAggregation'
import type { CalendarEvent } from '@/domain/event'
import type { CategoryId } from '@/domain/category'

function makeEvent(
  overrides: Partial<CalendarEvent> & { startTime: number; endTime: number },
): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    title: 'Test',
    color: 'accent',
    categoryId: 'accent',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

// All timestamps use local constructors so getHours()/getDay() are consistent across timezones.
// April 27 2026 = Monday. Month is 0-indexed (3 = April).
const weekStart = new Date(2026, 3, 27, 0, 0, 0).getTime()
const weekEnd   = new Date(2026, 4,  4, 0, 0, 0).getTime()

describe('computeBucket', () => {
  it('returns zeroes for empty events', () => {
    const bucket = computeBucket([], weekStart, weekEnd)
    expect(bucket.total).toBe(0)
    for (const id of ['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as CategoryId[]) {
      expect(bucket.byCategory[id]).toBe(0)
    }
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        expect(bucket.byHourSlot[d][h]).toBe(0)
      }
    }
  })

  it('computes byCategory for non-overlapping events', () => {
    const events: CalendarEvent[] = [
      makeEvent({
        startTime: new Date(2026, 3, 27, 10, 0, 0).getTime(),
        endTime:   new Date(2026, 3, 27, 11, 0, 0).getTime(),
        categoryId: 'accent',
        color: 'accent',
      }),
      makeEvent({
        startTime: new Date(2026, 3, 27, 11, 0, 0).getTime(),
        endTime:   new Date(2026, 3, 27, 12, 0, 0).getTime(),
        categoryId: 'sage',
        color: 'sage',
      }),
    ]

    const bucket = computeBucket(events, weekStart, weekEnd)
    expect(bucket.byCategory.accent).toBeCloseTo(1, 1)
    expect(bucket.byCategory.sage).toBeCloseTo(1, 1)
    expect(bucket.total).toBeCloseTo(2, 1)
  })

  it('deduplicates overlapping events of same category', () => {
    // 10:00-11:00 + 10:30-11:30, both accent → union = 1.5h
    const events: CalendarEvent[] = [
      makeEvent({
        startTime: new Date(2026, 3, 27, 10,  0, 0).getTime(),
        endTime:   new Date(2026, 3, 27, 11,  0, 0).getTime(),
        categoryId: 'accent',
        color: 'accent',
      }),
      makeEvent({
        startTime: new Date(2026, 3, 27, 10, 30, 0).getTime(),
        endTime:   new Date(2026, 3, 27, 11, 30, 0).getTime(),
        categoryId: 'accent',
        color: 'accent',
      }),
    ]

    const bucket = computeBucket(events, weekStart, weekEnd)
    expect(bucket.byCategory.accent).toBeCloseTo(1.5, 1)
    expect(bucket.total).toBeCloseTo(1.5, 1)
  })

  it('clips events to bucket boundaries', () => {
    // Starts before week, ends inside: Apr 26 23:00 → Apr 27 02:00 → clipped 00:00→02:00 = 2h
    const events: CalendarEvent[] = [
      makeEvent({
        startTime: new Date(2026, 3, 26, 23, 0, 0).getTime(),
        endTime:   new Date(2026, 3, 27,  2, 0, 0).getTime(),
        categoryId: 'sky',
        color: 'sky',
      }),
    ]

    const bucket = computeBucket(events, weekStart, weekEnd)
    expect(bucket.byCategory.sky).toBeCloseTo(2, 1)
    expect(bucket.total).toBeCloseTo(2, 1)
  })

  it('computes byHourSlot correctly', () => {
    // Monday 10:00-11:30 local → Mon=0, hour 10 gets 1h, hour 11 gets 0.5h
    const events: CalendarEvent[] = [
      makeEvent({
        startTime: new Date(2026, 3, 27, 10,  0, 0).getTime(),
        endTime:   new Date(2026, 3, 27, 11, 30, 0).getTime(),
        categoryId: 'rose',
        color: 'rose',
      }),
    ]

    const bucket = computeBucket(events, weekStart, weekEnd)
    // Monday = index 0
    expect(bucket.byHourSlot[0][10]).toBeCloseTo(1, 1)
    expect(bucket.byHourSlot[0][11]).toBeCloseTo(0.5, 1)
    expect(bucket.byHourSlot[0][9]).toBe(0)
    expect(bucket.byHourSlot[1][10]).toBe(0)
  })

  it('discards events entirely outside the bucket', () => {
    const events: CalendarEvent[] = [
      makeEvent({
        startTime: new Date(2026, 3, 20, 10, 0, 0).getTime(),
        endTime:   new Date(2026, 3, 20, 11, 0, 0).getTime(),
        categoryId: 'stone',
        color: 'stone',
      }),
    ]

    const bucket = computeBucket(events, weekStart, weekEnd)
    expect(bucket.total).toBe(0)
    expect(bucket.byCategory.stone).toBe(0)
  })
})
