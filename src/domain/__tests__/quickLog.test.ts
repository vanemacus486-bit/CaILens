import { describe, it, expect } from 'vitest'
import {
  deriveDefaultTimes,
  deriveDefaultColor,
  SAFE_GAP_MS,
  DEFAULT_DURATION_MS,
} from '../quickLog'
import type { CalendarEvent } from '../event'

const FIXED_NOW = 1_000_000_000
const LAST_EVENT: CalendarEvent = {
  id: 'ev-1',
  title: 'Test',
  startTime: FIXED_NOW - 6_000_000,
  endTime: FIXED_NOW - 3_600_000, // 1h before now
  color: 'sage',
  categoryId: 'sage',
  createdAt: FIXED_NOW - 6_000_000,
  updatedAt: FIXED_NOW - 6_000_000,
}

describe('deriveDefaultTimes', () => {
  it('returns [now - 1h, now] when lastEvent is null', () => {
    const result = deriveDefaultTimes(null, FIXED_NOW)
    expect(result.start).toBe(FIXED_NOW - DEFAULT_DURATION_MS)
    expect(result.end).toBe(FIXED_NOW)
  })

  it('returns [lastEvent.endTime, now] when gap is within SAFE_GAP_MS', () => {
    const result = deriveDefaultTimes(LAST_EVENT, FIXED_NOW)
    expect(result.start).toBe(LAST_EVENT.endTime)
    expect(result.end).toBe(FIXED_NOW)
  })

  it('falls back to [now - 1h, now] when gap exceeds SAFE_GAP_MS', () => {
    const oldEvent = { ...LAST_EVENT, endTime: FIXED_NOW - SAFE_GAP_MS - 1 }
    const result = deriveDefaultTimes(oldEvent, FIXED_NOW)
    expect(result.start).toBe(FIXED_NOW - DEFAULT_DURATION_MS)
    expect(result.end).toBe(FIXED_NOW)
  })

  it('falls back when lastEvent endTime is in the future (clock drift)', () => {
    const futureEvent = { ...LAST_EVENT, endTime: FIXED_NOW + 1000 }
    const result = deriveDefaultTimes(futureEvent, FIXED_NOW)
    expect(result.start).toBe(FIXED_NOW - DEFAULT_DURATION_MS)
    expect(result.end).toBe(FIXED_NOW)
  })

  it('uses Date.now() when now parameter is omitted', () => {
    const result = deriveDefaultTimes(null)
    const now = Date.now()
    expect(result.start).toBe(now - DEFAULT_DURATION_MS)
    expect(result.end).toBe(now)
  })
})

describe('deriveDefaultColor', () => {
  it("returns 'accent' when lastEvent is null", () => {
    expect(deriveDefaultColor(null)).toBe('accent')
  })

  it("returns lastEvent.color when lastEvent exists", () => {
    expect(deriveDefaultColor(LAST_EVENT)).toBe('sage')
  })
})
