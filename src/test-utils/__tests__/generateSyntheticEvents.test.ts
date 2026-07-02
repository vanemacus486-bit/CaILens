import { describe, it, expect } from 'vitest'
import { generateSyntheticEvents } from '@/test-utils/generateSyntheticEvents'

describe('generateSyntheticEvents', () => {
  it('produces deterministic output for the same seed', () => {
    const a = generateSyntheticEvents(1, 30, 42)
    const b = generateSyntheticEvents(1, 30, 42)
    expect(a).toEqual(b)
  })

  it('produces different output for different seeds', () => {
    const a = generateSyntheticEvents(1, 30, 42)
    const b = generateSyntheticEvents(1, 30, 99)
    expect(a).not.toEqual(b)
  })

  it('returns events sorted by startTime', () => {
    const events = generateSyntheticEvents(3, 30, 42)
    for (let i = 1; i < events.length; i++) {
      expect(events[i].startTime).toBeGreaterThanOrEqual(events[i - 1].startTime)
    }
  })

  it('returns events with valid fields', () => {
    const events = generateSyntheticEvents(1, 30, 42)
    expect(events.length).toBeGreaterThan(0)
    for (const e of events) {
      expect(e.id).toBeTruthy()
      expect(e.title).toBeTruthy()
      expect(e.startTime).toBeGreaterThan(0)
      expect(e.endTime).toBeGreaterThan(e.startTime)
      expect(e.categoryId).toBeTruthy()
    }
  })

  it('produces about 3 years × 30 events per day', () => {
    // 3 年 ≈ 1095 天 × 30/天 ≈ 32850
    const events = generateSyntheticEvents(3, 30, 42)
    expect(events.length).toBeGreaterThan(20_000)
    expect(events.length).toBeLessThan(50_000)
  })

  it('includes some cross-day sleep events', () => {
    const events = generateSyntheticEvents(1, 30, 42)
    const sleepEvents = events.filter((e) => e.typedKey === 'sleep')
    expect(sleepEvents.length).toBeGreaterThan(0)
    for (const s of sleepEvents) {
      // 跨天睡眠：endTime 应该在次日
      expect(s.endTime - s.startTime).toBeGreaterThan(2 * 3_600_000)
    }
  })

  it('includes some long events (> 7 days)', () => {
    const events = generateSyntheticEvents(5, 30, 42)
    const longEvents = events.filter((e) => e.title === '假期')
    expect(longEvents.length).toBeGreaterThan(0)
    for (const le of longEvents) {
      expect(le.endTime - le.startTime).toBeGreaterThanOrEqual(7 * 86_400_000)
    }
  })

  it('1 year × 30 events is fast enough', () => {
    const start = performance.now()
    generateSyntheticEvents(1, 30, 42)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(500) // should generate under 500ms
  })
})
