/**
 * # steadyMetrics 纯函数测试
 *
 * 覆盖：extractSleepNights, computeSleepSteadyMetrics
 */

import { describe, it, expect } from 'vitest'
import type { CalendarEvent } from '../event'
import { extractSleepNights, computeSleepSteadyMetrics } from '../steadyMetrics'

function makeEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 'test',
    title: 'sleep',
    startTime: 0,
    endTime: 0,
    color: 'stone',
    categoryId: 'stone',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

// ── extractSleepNights ────────────────────────────────────

describe('extractSleepNights', () => {
  it('returns empty for empty events', () => {
    const nights = extractSleepNights([], 0, 100)
    expect(nights).toHaveLength(0)
  })

  it('filters out non-stone events', () => {
    const events = [
      makeEvent({
        categoryId: 'accent',
        startTime: 1000,
        endTime: 20000,
      }),
    ]
    const nights = extractSleepNights(events, 0, 100000)
    expect(nights).toHaveLength(0)
  })

  it('filters out short sleep (< 3h)', () => {
    const events = [
      makeEvent({
        categoryId: 'stone',
        startTime: 1000,
        endTime: 2000, // ~0.28h
      }),
    ]
    const nights = extractSleepNights(events, 0, 100000)
    expect(nights).toHaveLength(0)
  })

  it('deduplicates by night key (same local midnight)', () => {
    // Two stone events on the same night — only the first is kept
    const base = new Date('2025-01-15T23:00:00').getTime()
    const events = [
      makeEvent({
        categoryId: 'stone',
        startTime: base,
        endTime: base + 4 * 3_600_000,
      }),
      makeEvent({
        categoryId: 'stone',
        startTime: base + 5000,
        endTime: base + 6 * 3_600_000,
      }),
    ]
    const rangeStart = new Date('2025-01-01').getTime()
    const rangeEnd = new Date('2025-01-31').getTime()
    const nights = extractSleepNights(events, rangeStart, rangeEnd)
    expect(nights).toHaveLength(1)
  })

  it('extracts bedtime correctly', () => {
    // Jan 15 23:30 -> Jan 16 07:30
    const start = new Date('2025-01-15T23:30:00').getTime()
    const end = new Date('2025-01-16T07:30:00').getTime()
    const events = [makeEvent({ categoryId: 'stone', startTime: start, endTime: end })]
    const rangeStart = new Date('2025-01-01').getTime()
    const rangeEnd = new Date('2025-01-31').getTime()
    const nights = extractSleepNights(events, rangeStart, rangeEnd)
    expect(nights).toHaveLength(1)
    expect(nights[0].bedtime).toBeCloseTo(23.5, 1)
    expect(nights[0].wakeTime).toBeCloseTo(7.5, 1)
    expect(nights[0].duration).toBeCloseTo(8, 1)
  })
})

// ── computeSleepSteadyMetrics ─────────────────────────────

describe('computeSleepSteadyMetrics', () => {
  it('returns all zeros for empty nights', () => {
    const m = computeSleepSteadyMetrics([], 30)
    expect(m.recordedDays).toBe(0)
    expect(m.coverage).toBe(0)
    expect(m.consistencyIndex).toBe(0)
    expect(m.driftDirection).toBe('stable')
  })

  it('computes correct mean/median for single night', () => {
    const nights = [{ bedtime: 23, wakeTime: 7, duration: 8 }]
    const m = computeSleepSteadyMetrics(nights, 30)
    expect(m.meanBedtime).toBe(23)
    expect(m.medianBedtime).toBe(23)
    expect(m.meanDuration).toBe(8)
    expect(m.recordedDays).toBe(1)
    expect(m.coverage).toBe(0.03) // Math.round(1/30 * 100) / 100
  })

  it('computes mean/median/std for multiple nights', () => {
    const nights = [
      { bedtime: 23, wakeTime: 7, duration: 8 },
      { bedtime: 23.5, wakeTime: 7.5, duration: 8 },
      { bedtime: 22.5, wakeTime: 6.5, duration: 8 },
    ]
    const m = computeSleepSteadyMetrics(nights, 30)
    expect(m.meanBedtime).toBeCloseTo(23, 1)
    expect(m.medianBedtime).toBe(23)
    expect(m.stdDuration).toBe(0) // all same duration
    expect(m.driftDirection).toBe('stable') // < 5 min/wk threshold
  })

  it('detects delaying drift', () => {
    // First 7 days: bedtime ~22, last 7 days: bedtime ~24+
    const nights = [
      ...Array.from({ length: 7 }, (_, i) => ({
        bedtime: 22 + i * 0.05,
        wakeTime: 7 + i * 0.05,
        duration: 8,
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        bedtime: 23.5 + i * 0.1,
        wakeTime: 7.5 + i * 0.1,
        duration: 8,
      })),
    ]
    const m = computeSleepSteadyMetrics(nights, 30)
    expect(m.driftSpeed).toBeGreaterThan(5)
    expect(m.driftDirection).toBe('delaying')
  })

  it('returns high consistency for near-identical nights', () => {
    const nights = Array.from({ length: 14 }, () => ({
      bedtime: 23,
      wakeTime: 7,
      duration: 8,
    }))
    const m = computeSleepSteadyMetrics(nights, 14)
    expect(m.consistencyIndex).toBeGreaterThan(0.9)
    expect(m.coverage).toBe(1)
  })
})
