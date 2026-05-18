import { describe, it, expect } from 'vitest'
import { computeGapDistribution } from '../gaps'
import type { CalendarEvent } from '../event'

const DAY = 86_400_000
const HOUR = 3_600_000

describe('computeGapDistribution', () => {
  it('full 24h coverage produces zero gaps', () => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    const midnight = base.getTime()

    // Two-month-long event covering everything
    const events: CalendarEvent[] = [
      { id: '1', title: '全天', startTime: midnight - 60 * DAY, endTime: midnight + 60 * DAY, color: 'accent', categoryId: 'accent', createdAt: Date.now(), updatedAt: Date.now() },
    ]

    const result = computeGapDistribution(events, 30)
    expect(result.byHour.every((r) => r === 0)).toBe(true)
    expect(result.avgGap).toBe(0)
  })

  it('no events means 100% gap', () => {
    const result = computeGapDistribution([], 7)
    expect(result.byHour.every((r) => r === 1)).toBe(true)
    expect(result.avgGap).toBe(1)
  })

  it('totalDays reflects the analysed window', () => {
    const result = computeGapDistribution([], 7)
    expect(result.totalDays).toBeGreaterThanOrEqual(7)
    expect(result.totalDays).toBeLessThanOrEqual(9)
  })

  it('gap rate reflects partial day coverage', () => {
    const now = Date.now()
    const midnight = new Date(now)
    midnight.setHours(0, 0, 0, 0)
    const base = midnight.getTime()

    // Daily events at 10:00-12:00 for many days in the past
    const events: CalendarEvent[] = Array.from({ length: 90 }, (_, i) => ({
      id: `${i}`,
      title: 'Standup',
      startTime: base - 90 * DAY + i * DAY + 10 * HOUR,
      endTime: base - 90 * DAY + i * DAY + 12 * HOUR,
      color: 'accent' as const,
      categoryId: 'accent' as const,
      createdAt: now,
      updatedAt: now,
    }))

    const result = computeGapDistribution(events, 30)
    // Hours 10 and 11 should be well covered (gap rate close to 0)
    expect(result.byHour[10]).toBeLessThan(0.15)
    expect(result.byHour[11]).toBeLessThan(0.15)
    // Hours deep in night should have near-total gaps
    expect(result.byHour[2]).toBeGreaterThan(0.85)
    expect(result.byHour[3]).toBeGreaterThan(0.85)
  })
})
