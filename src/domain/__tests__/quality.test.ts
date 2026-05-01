import { describe, it, expect } from 'vitest'
import { computeRecordQuality } from '../quality'
import type { CalendarEvent, EventColor } from '../event'
import type { CategoryId } from '../category'

const HOUR_MS = 60 * 60_000
const DAY_MS = 24 * HOUR_MS
const PERIOD_START = new Date('2026-05-01T00:00:00Z').getTime()
const PERIOD_END = PERIOD_START + 7 * DAY_MS // 1 week

function evt(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const start = overrides.startTime ?? PERIOD_START + 10 * HOUR_MS
  return {
    id: crypto.randomUUID(),
    title: 'test',
    startTime: start,
    endTime: start + 2 * HOUR_MS,
    color: 'accent' as EventColor,
    categoryId: 'accent' as CategoryId,
    createdAt: start,  // same as start = real-time by default
    updatedAt: start,
    ...overrides,
  }
}

describe('computeRecordQuality', () => {
  it('empty events returns zeros', () => {
    const q = computeRecordQuality([], PERIOD_START, PERIOD_END)
    expect(q.eventCount).toBe(0)
    expect(q.avgGranularity).toBe(0)
    expect(q.realTimeRatio).toBe(0)
    expect(q.coverage).toBe(0)
  })

  it('counts events correctly', () => {
    const q = computeRecordQuality([evt(), evt(), evt()], PERIOD_START, PERIOD_END)
    expect(q.eventCount).toBe(3)
  })

  it('calculates average granularity', () => {
    // Two 2-hour events = 4h / 2 = 2h avg granularity
    const q = computeRecordQuality([
      evt({ startTime: PERIOD_START + 10 * HOUR_MS }),
      evt({ startTime: PERIOD_START + 14 * HOUR_MS }),
    ], PERIOD_START, PERIOD_END)
    expect(q.avgGranularity).toBeCloseTo(2, 0)
  })

  it('deduplicates overlapping events in granularity', () => {
    // Two events overlapping: 10-13 and 11-14 → union = 4h, granularity = 4/2 = 2h
    const e1 = evt({ startTime: PERIOD_START + 10 * HOUR_MS, endTime: PERIOD_START + 13 * HOUR_MS })
    const e2 = evt({ startTime: PERIOD_START + 11 * HOUR_MS, endTime: PERIOD_START + 14 * HOUR_MS })
    const q = computeRecordQuality([e1, e2], PERIOD_START, PERIOD_END)
    expect(q.avgGranularity).toBeCloseTo(2, 0)
  })

  it('all real-time events give ratio 1', () => {
    const q = computeRecordQuality([evt(), evt()], PERIOD_START, PERIOD_END)
    expect(q.realTimeRatio).toBe(1)
  })

  it('late-created events reduce real-time ratio', () => {
    const late = evt({
      startTime: PERIOD_START + 10 * HOUR_MS,
      createdAt: PERIOD_START + 15 * HOUR_MS,  // 5h after start
    })
    const onTime = evt({ startTime: PERIOD_START + 14 * HOUR_MS })
    const q = computeRecordQuality([late, onTime], PERIOD_START, PERIOD_END)
    expect(q.realTimeRatio).toBe(0.5)
  })

  it('calculates coverage for a 7-day period', () => {
    // 7 days × 16 waking hours = 112 waking hours
    // One 2-hour event → coverage = 2/112 ≈ 0.0179
    const q = computeRecordQuality([evt()], PERIOD_START, PERIOD_END)
    expect(q.coverage).toBeCloseTo(2 / 112, 3)
  })

  it('coverage caps at 1', () => {
    // Event spanning entire waking period
    const fullDay = evt({
      startTime: PERIOD_START,
      endTime: PERIOD_END,
    })
    const q = computeRecordQuality([fullDay], PERIOD_START, PERIOD_END)
    expect(q.coverage).toBe(1)
  })

  it('events outside period are clipped', () => {
    const outside = evt({
      startTime: PERIOD_START - 10 * HOUR_MS,
      endTime: PERIOD_START - 2 * HOUR_MS,
    })
    const q = computeRecordQuality([outside], PERIOD_START, PERIOD_END)
    expect(q.eventCount).toBe(1)
    expect(q.avgGranularity).toBe(0) // clipped to zero duration
    expect(q.coverage).toBe(0)
  })
})
