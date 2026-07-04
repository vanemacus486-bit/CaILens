import { describe, it, expect } from 'vitest'
import {
  pxToMinutesDelta,
  snapMinutes,
  applyDragToTimestamp,
  clampTimestamp,
  generateRulerTicks,
  adjustEdgeTime,
} from '../timeRuler'

describe('pxToMinutesDelta', () => {
  it('converts positive px delta at 2px/min', () => {
    expect(pxToMinutesDelta(20, 2)).toBe(10)
  })

  it('converts negative px delta', () => {
    expect(pxToMinutesDelta(-20, 2)).toBe(-10)
  })

  it('returns 0 when pxPerMinute is 0', () => {
    expect(pxToMinutesDelta(50, 0)).toBe(0)
  })

  it('returns 0 when pxPerMinute is negative', () => {
    expect(pxToMinutesDelta(50, -2)).toBe(0)
  })
})

describe('snapMinutes', () => {
  it('snaps down to the nearest 5 minutes', () => {
    expect(snapMinutes(12)).toBe(10)
  })

  it('snaps up to the nearest 5 minutes', () => {
    expect(snapMinutes(13)).toBe(15)
  })

  it('leaves an already-aligned value unchanged', () => {
    expect(snapMinutes(15)).toBe(15)
  })

  it('snaps negative values', () => {
    expect(snapMinutes(-12)).toBe(-10)
  })

  it('respects a custom step', () => {
    expect(snapMinutes(22, 15)).toBe(15)
    expect(snapMinutes(23, 15)).toBe(30)
  })

  it('falls back to plain rounding when step is 0', () => {
    expect(snapMinutes(12.6, 0)).toBe(13)
  })
})

describe('applyDragToTimestamp', () => {
  const base = new Date(2026, 3, 20, 9, 0, 0).getTime()

  it('moves the timestamp forward and snaps to 5 minutes', () => {
    // 2px/min, dragging 26px = 13 raw minutes -> snaps to 15
    const result = applyDragToTimestamp(base, 26, 2)
    expect(result).toBe(base + 15 * 60_000)
  })

  it('moves the timestamp backward', () => {
    const result = applyDragToTimestamp(base, -26, 2)
    expect(result).toBe(base - 15 * 60_000)
  })

  it('returns the base timestamp for zero delta', () => {
    expect(applyDragToTimestamp(base, 0, 2)).toBe(base)
  })
})

describe('clampTimestamp', () => {
  it('passes through a value within range', () => {
    expect(clampTimestamp(50, 0, 100)).toBe(50)
  })

  it('clamps to the minimum', () => {
    expect(clampTimestamp(-10, 0, 100)).toBe(0)
  })

  it('clamps to the maximum', () => {
    expect(clampTimestamp(150, 0, 100)).toBe(100)
  })
})

describe('generateRulerTicks', () => {
  it('generates ticks spanning the viewport, centered at offset 0', () => {
    const centerTs = new Date(2026, 3, 20, 12, 0, 0).getTime()
    const ticks = generateRulerTicks(centerTs, 2, 200, 5) // 100px half-width -> 50min half-width
    expect(ticks.some((t) => t.offsetPx === 0)).toBe(true)
    expect(ticks[0].offsetPx).toBeLessThan(0)
    expect(ticks[ticks.length - 1].offsetPx).toBeGreaterThan(0)
  })

  it('marks the on-the-hour tick as major with an HH:00 label', () => {
    const centerTs = new Date(2026, 3, 20, 12, 0, 0).getTime()
    const ticks = generateRulerTicks(centerTs, 2, 200, 5)
    const majorAtCenter = ticks.find((t) => t.offsetPx === 0)
    expect(majorAtCenter?.isMajor).toBe(true)
    expect(majorAtCenter?.label).toBe('12:00')
  })

  it('leaves non-hour ticks unlabeled and minor', () => {
    const centerTs = new Date(2026, 3, 20, 12, 10, 0).getTime()
    const ticks = generateRulerTicks(centerTs, 2, 200, 5)
    const minorAtCenter = ticks.find((t) => t.offsetPx === 0)
    expect(minorAtCenter?.isMajor).toBe(false)
    expect(minorAtCenter?.label).toBeUndefined()
  })

  it('returns an empty array for invalid inputs', () => {
    expect(generateRulerTicks(Date.now(), 0, 200)).toEqual([])
    expect(generateRulerTicks(Date.now(), 2, 0)).toEqual([])
    expect(generateRulerTicks(Date.now(), 2, 200, 0)).toEqual([])
  })
})

describe('adjustEdgeTime', () => {
  const start = new Date(2026, 3, 20, 9, 0, 0).getTime()
  const end = new Date(2026, 3, 20, 10, 0, 0).getTime()

  it('drags the start edge forward without moving the end', () => {
    const result = adjustEdgeTime(start, end, 'start', 20, 2) // +10min raw, snaps to 10
    expect(result.startTime).toBe(start + 10 * 60_000)
    expect(result.endTime).toBe(end)
  })

  it('drags the end edge backward without moving the start', () => {
    const result = adjustEdgeTime(start, end, 'end', -20, 2)
    expect(result.startTime).toBe(start)
    expect(result.endTime).toBe(end - 10 * 60_000)
  })

  it('never lets the start edge cross past (end - min duration)', () => {
    // Drag start forward by a huge amount — should clamp, not swallow end.
    const result = adjustEdgeTime(start, end, 'start', 100_000, 2)
    expect(result.startTime).toBe(end - 5 * 60_000)
    expect(result.endTime).toBe(end)
  })

  it('never lets the end edge cross before (start + min duration)', () => {
    const result = adjustEdgeTime(start, end, 'end', -100_000, 2)
    expect(result.startTime).toBe(start)
    expect(result.endTime).toBe(start + 5 * 60_000)
  })

  it('respects a custom step for the minimum duration guard', () => {
    const result = adjustEdgeTime(start, end, 'start', 100_000, 2, 15)
    expect(result.startTime).toBe(end - 15 * 60_000)
  })
})
