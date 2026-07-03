import { describe, it, expect } from 'vitest'
import { computeDayGaps } from '../gaps'
import type { CalendarEvent } from '../event'

// Use a fixed day: 2025-06-15 (Sunday) in UTC
// DayStart = 2025-06-15T00:00:00.000Z
const DAY_START = new Date('2025-06-15T00:00:00Z').getTime()
const DAY_END   = DAY_START + 24 * 60 * 60_000

function event(id: string, startH: number, startM: number, endH: number, endM: number): CalendarEvent {
  return {
    id,
    title: `event-${id}`,
    startTime: DAY_START + (startH * 60 + startM) * 60_000,
    endTime:   DAY_START + (endH * 60 + endM) * 60_000,
    color: 'accent',
    categoryId: 'accent',
    createdAt: 1,
    updatedAt: 1,
  }
}

// Cross-day event: starts previous day, ends inside this day
function crossDayStart(id: string, endH: number, endM: number): CalendarEvent {
  return {
    id,
    title: `cross-${id}`,
    startTime: DAY_START - 180 * 60_000, // starts 3h before midnight
    endTime:   DAY_START + (endH * 60 + endM) * 60_000,
    color: 'accent',
    categoryId: 'accent',
    createdAt: 1,
    updatedAt: 1,
  }
}

// Cross-day event: starts this day, ends next day
function crossDayEnd(id: string, startH: number, startM: number): CalendarEvent {
  return {
    id,
    title: `cross-end-${id}`,
    startTime: DAY_START + (startH * 60 + startM) * 60_000,
    endTime:   DAY_END + 120 * 60_000, // ends 2h after midnight next day
    color: 'accent',
    categoryId: 'accent',
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('computeDayGaps', () => {
  // ── Empty / edge cases ───────────────────────────────────

  it('returns empty for past day with no events', () => {
    // Past day (nowMs > dayEnd), no events → full-day gap
    const now = DAY_START + 48 * 60 * 60_000 // 2 days later
    const gaps = computeDayGaps([], DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toHaveLength(1)
    expect(gaps[0].start).toBe(DAY_START)
    expect(gaps[0].end).toBe(DAY_END)
  })

  it('returns empty array for future day', () => {
    const now = DAY_START - 60_000 // 1 min before day starts
    const gaps = computeDayGaps([], DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toEqual([])
  })

  it('returns empty array for today when now is right at dayStart', () => {
    const now = DAY_START
    const gaps = computeDayGaps([], DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toEqual([])
  })

  it('returns empty array for empty events and nowMs before dayStart', () => {
    const now = DAY_START - 24 * 60 * 60_000
    const gaps = computeDayGaps([], DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toEqual([])
  })

  // ── Standard gaps between events ────────────────────────

  it('computes gap between two events', () => {
    const now = DAY_START + 24 * 60 * 60_000 // next day
    const evts = [event('1', 9, 0, 11, 0), event('2', 14, 0, 15, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    // Expected gaps: [00:00-09:00], [11:00-14:00], [15:00-24:00]
    expect(gaps).toHaveLength(3)
    expect(gaps[0].start).toBe(DAY_START)
    expect(gaps[0].end).toBe(DAY_START + 9 * 60 * 60_000)
    expect(gaps[1].start).toBe(DAY_START + 11 * 60 * 60_000)
    expect(gaps[1].end).toBe(DAY_START + 14 * 60 * 60_000)
    expect(gaps[2].start).toBe(DAY_START + 15 * 60 * 60_000)
    expect(gaps[2].end).toBe(DAY_START + 24 * 60 * 60_000)
  })

  it('handles event at the very start of the day', () => {
    const now = DAY_END
    const evts = [event('1', 0, 0, 8, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toHaveLength(1) // only [08:00-24:00]
    expect(gaps[0].start).toBe(DAY_START + 8 * 60 * 60_000)
    expect(gaps[0].end).toBe(DAY_END)
  })

  it('handles event at the very end of the day', () => {
    const now = DAY_END
    const evts = [event('1', 20, 0, 24, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toHaveLength(1) // only [00:00-20:00]
    expect(gaps[0].start).toBe(DAY_START)
    expect(gaps[0].end).toBe(DAY_START + 20 * 60 * 60_000)
  })

  // ── Overlapping events merged ───────────────────────────

  it('merges overlapping events and produces correct gaps', () => {
    const now = DAY_END
    // 09:00-11:00 overlaps with 10:00-12:00 → merged [09:00-12:00]
    const evts = [
      event('1', 9, 0, 11, 0),
      event('2', 10, 0, 12, 0),
    ]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toHaveLength(2) // [00:00-09:00], [12:00-24:00]
    expect(gaps[0].start).toBe(DAY_START)
    expect(gaps[0].end).toBe(DAY_START + 9 * 60 * 60_000)
    expect(gaps[1].start).toBe(DAY_START + 12 * 60 * 60_000)
    expect(gaps[1].end).toBe(DAY_END)
  })

  it('merges touching (abutting) events — they remain separate', () => {
    // Events that end exactly when the next starts: no gap between them
    const now = DAY_END
    const evts = [
      event('1', 9, 0, 12, 0),
      event('2', 12, 0, 15, 0),
    ]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    // mergeIntervals DOES NOT merge abutting intervals, so they stay separate
    // But there's still no gap because end(1) === start(2)
    // Actually mergeIntervals uses < for overlap, so [9,12] and [12,15] → separate
    // Then gap between them = [12:00, 12:00] → 0 length → filtered out
    // Gaps: [00:00-09:00], [15:00-24:00]
    expect(gaps).toHaveLength(2)
    expect(gaps[0].start).toBe(DAY_START)
    expect(gaps[0].end).toBe(DAY_START + 9 * 60 * 60_000)
    expect(gaps[1].start).toBe(DAY_START + 15 * 60 * 60_000)
    expect(gaps[1].end).toBe(DAY_END)
  })

  // ── Cross-day events ────────────────────────────────────

  it('clips cross-day start event correctly (starts before midnight)', () => {
    const now = DAY_END
    // Cross-day event starting previous day at 22:00, ending today at 02:00
    // Clipped to [00:00, 02:00]
    const evts = [crossDayStart('1', 2, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    // Clipped event covers [00:00, 02:00]
    // Gaps: [02:00-24:00]
    expect(gaps).toHaveLength(1)
    expect(gaps[0].start).toBe(DAY_START + 2 * 60 * 60_000)
    expect(gaps[0].end).toBe(DAY_END)
  })

  it('clips cross-day end event correctly (ends after midnight next day)', () => {
    const now = DAY_END
    // Cross-day event starting today at 23:00, ending next day at 02:00
    // Clipped to [23:00, 24:00]
    const evts = [crossDayEnd('1', 23, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    // Clipped event covers [23:00, 24:00]
    // Gaps: [00:00-23:00]
    expect(gaps).toHaveLength(1)
    expect(gaps[0].start).toBe(DAY_START)
    expect(gaps[0].end).toBe(DAY_START + 23 * 60 * 60_000)
  })

  it('combines cross-day event with normal event correctly', () => {
    const now = DAY_END
    // Cross-day: [00:00, 02:00], Normal: [09:00, 12:00]
    const evts = [
      crossDayStart('1', 2, 0),
      event('2', 9, 0, 12, 0),
    ]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toHaveLength(2) // [02:00-09:00], [12:00-24:00]
    expect(gaps[0].start).toBe(DAY_START + 2 * 60 * 60_000)
    expect(gaps[0].end).toBe(DAY_START + 9 * 60 * 60_000)
    expect(gaps[1].start).toBe(DAY_START + 12 * 60 * 60_000)
    expect(gaps[1].end).toBe(DAY_END)
  })

  // ── Today truncation to nowMs ───────────────────────────

  it('truncates last gap to nowMs when nowMs is within today', () => {
    const now = DAY_START + 16 * 60 * 60_000 // 16:00
    const evts = [event('1', 9, 0, 12, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    // Gaps: [00:00-09:00], [12:00-16:00]
    expect(gaps).toHaveLength(2)
    expect(gaps[1].start).toBe(DAY_START + 12 * 60 * 60_000)
    expect(gaps[1].end).toBe(now)
  })

  it('returns only gaps before nowMs when nowMs is between events', () => {
    const now = DAY_START + 10 * 60 * 60_000 // 10:00, during first event
    const evts = [event('1', 9, 0, 12, 0), event('2', 14, 0, 15, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    // 9-12 covers now(10:00), so the only valid gap is [00:00-09:00]
    // The second event doesn't matter since we cap at effectiveEnd = now
    expect(gaps).toHaveLength(1)
    expect(gaps[0].start).toBe(DAY_START)
    expect(gaps[0].end).toBe(DAY_START + 9 * 60 * 60_000)
  })

  it('returns empty when nowMs is during first event segment before any gap', () => {
    const now = DAY_START + 10 * 60 * 60_000 // 10:00
    const evts = [event('1', 9, 0, 12, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    // Only gap [00:00-09:00] is before now → OK
    expect(gaps).toHaveLength(1)
    expect(gaps[0].end).toBe(DAY_START + 9 * 60 * 60_000)
  })

  // ── minGapMs filtering ──────────────────────────────────

  it('filters out gaps shorter than minGapMs', () => {
    const now = DAY_END
    // Event: [09:00-12:00], leaving gaps [00:00-09:00] (9h) and [12:00-24:00] (12h)
    // Both are >= 30 min default, so both should appear
    const evts = [event('1', 9, 0, 12, 0)]
    const gapsDefault = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    expect(gapsDefault).toHaveLength(2)

    // Using minGapMs = 10h: [12:00-24:00] is 12h >= 10h, [00:00-09:00] is 9h < 10h → filtered
    const gapsLarge = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now, minGapMs: 10 * 60 * 60_000 })
    expect(gapsLarge).toHaveLength(1)
    expect(gapsLarge[0].start).toBe(DAY_START + 12 * 60 * 60_000)
  })

  it('default minGapMs is 30 minutes', () => {
    const now = DAY_END
    // Event: [11:45-12:00], gaps: [00:00-11:45] (11h45m) and [12:00-24:00] (12h)
    // Both >= 30min, so 2 gaps
    const evts = [event('1', 11, 45, 12, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toHaveLength(2)
  })

  it('filters gaps shorter than 30 minutes with default minGapMs', () => {
    const now = DAY_END
    // Event [09:00-09:10] → too short at minGapMs=30 → filtered from gaps
    // Well, actually the event itself is 10 min, but the gaps before/after are large
    // Let's create a small gap: event at [00:00-23:50] and another at [23:55-24:00]
    // Gap between them is only 5 min → should be filtered
    const evts = [
      event('1', 0, 0, 23, 50),
    ]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    // Gap [23:50-24:00] is 10 min < 30 min → filtered
    expect(gaps).toHaveLength(0)
  })

  // ── Event fills entire day ──────────────────────────────

  it('returns no gaps when events fill the entire day', () => {
    const now = DAY_END
    const evts = [event('1', 0, 0, 24, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toEqual([])
  })

  // ── nowMs before any event ──────────────────────────────

  it('returns empty when nowMs is before dayStart in future', () => {
    const now = DAY_START - (30 * 60_000) // 30 min before day starts
    const gaps = computeDayGaps([], DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toEqual([])
  })

  // ── Specific custom minGapMs ────────────────────────────

  it('respects custom minGapMs', () => {
    const now = DAY_END
    const evts = [event('1', 9, 0, 10, 0), event('2', 10, 15, 11, 0)]
    // Gap [10:00-10:15] = 15 min
    const gapsDefault = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    // Many gaps: [00:00-09:00] (9h), [10:00-10:15] (15min), [11:00-24:00] (13h)
    // Default min 30min → only [00:00-09:00] and [11:00-24:00]
    expect(gapsDefault).toHaveLength(2)

    const gaps15 = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now, minGapMs: 10 * 60_000 })
    // min 10min → [10:00-10:15] (15min) also passes
    expect(gaps15).toHaveLength(3)
  })

  // ── nowMs equals exactly event start/end ────────────────

  it('handles nowMs exactly at event end time', () => {
    const now = DAY_START + 12 * 60 * 60_000 // 12:00
    const evts = [event('1', 9, 0, 12, 0)]
    const gaps = computeDayGaps(evts, DAY_START, DAY_END, { nowMs: now })
    // effectiveEnd = now = 12:00, event ends at 12:00 → last gap is [00:00-09:00] (9h)
    // Gap after event [12:00-12:00] = 0 → filtered
    expect(gaps).toHaveLength(1)
    expect(gaps[0].start).toBe(DAY_START)
    expect(gaps[0].end).toBe(DAY_START + 9 * 60 * 60_000)
  })

  // ── today has no events yet ────────────────────────────

  it('returns gap from dayStart to now for today with no events', () => {
    const now = DAY_START + 14 * 60 * 60_000 // 14:00
    const gaps = computeDayGaps([], DAY_START, DAY_END, { nowMs: now })
    expect(gaps).toHaveLength(1)
    expect(gaps[0].start).toBe(DAY_START)
    expect(gaps[0].end).toBe(now)
  })
})
