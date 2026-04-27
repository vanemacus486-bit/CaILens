import { describe, it, expect } from 'vitest'
import { mergeIntervals, computeWeekStats } from '../stats'
import { DEFAULT_CATEGORIES } from '../category'
import type { CalendarEvent, EventColor } from '../event'
import type { CategoryId } from '../category'

// ── Helpers ───────────────────────────────────────────────

const MINUTE = 60_000
const HOUR   = 3_600_000

// A week anchored at t=0 (7 days)
const WEEK_START = 0
const WEEK_END   = 7 * 24 * HOUR

function makeEvent(
  id: string,
  categoryId: CategoryId,
  startTime: number,
  endTime: number,
): CalendarEvent {
  return {
    id,
    title: 'test',
    startTime,
    endTime,
    color: categoryId as EventColor,
    categoryId,
    createdAt: 0,
    updatedAt: 0,
  }
}

function statFor(stats: ReturnType<typeof computeWeekStats>, id: CategoryId) {
  const s = stats.byCategory.find((x) => x.categoryId === id)
  if (!s) throw new Error(`No stat for ${id}`)
  return s
}

// ── mergeIntervals ────────────────────────────────────────

describe('mergeIntervals — edge cases', () => {
  it('returns [] for empty input', () => {
    expect(mergeIntervals([])).toEqual([])
  })

  it('returns a single interval unchanged', () => {
    expect(mergeIntervals([[0, 60]])).toEqual([[0, 60]])
  })
})

describe('mergeIntervals — non-overlapping', () => {
  it('keeps two non-overlapping intervals separate', () => {
    expect(mergeIntervals([[0, 30], [60, 90]])).toEqual([[0, 30], [60, 90]])
  })

  it('sorts unsorted input before merging', () => {
    expect(mergeIntervals([[60, 90], [0, 30]])).toEqual([[0, 30], [60, 90]])
  })
})

describe('mergeIntervals — overlapping', () => {
  it('merges completely overlapping intervals', () => {
    expect(mergeIntervals([[0, 60], [10, 50]])).toEqual([[0, 60]])
  })

  it('merges partially overlapping intervals', () => {
    expect(mergeIntervals([[0, 50], [30, 90]])).toEqual([[0, 90]])
  })

  it('three intervals: A∪B overlap, B∪C do not', () => {
    // [0,40] ∪ [20,60] → [0,60]; [80,100] separate
    expect(mergeIntervals([[0, 40], [20, 60], [80, 100]])).toEqual([[0, 60], [80, 100]])
  })

  it('handles unsorted three-interval input', () => {
    expect(mergeIntervals([[80, 100], [0, 40], [20, 60]])).toEqual([[0, 60], [80, 100]])
  })
})

describe('mergeIntervals — abutting boundary (half-open semantics)', () => {
  it('does NOT merge abutting intervals where end === start of next', () => {
    // [0,30) and [30,60) are adjacent but not overlapping
    expect(mergeIntervals([[0, 30], [30, 60]])).toEqual([[0, 30], [30, 60]])
  })

  it('merges when there is even 1 unit of overlap', () => {
    expect(mergeIntervals([[0, 31], [30, 60]])).toEqual([[0, 60]])
  })
})

// ── computeWeekStats — empty / NaN guard ─────────────────

describe('computeWeekStats — empty input', () => {
  it('returns totalMinutes=0 when there are no events', () => {
    const result = computeWeekStats([], DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    expect(result.totalMinutes).toBe(0)
  })

  it('returns byCategory with exactly 6 entries', () => {
    const result = computeWeekStats([], DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    expect(result.byCategory).toHaveLength(6)
  })

  it('all percentages are 0 (not NaN) when totalMinutes is 0', () => {
    const result = computeWeekStats([], DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    result.byCategory.forEach((stat) => {
      expect(Number.isNaN(stat.percentage)).toBe(false)
      expect(stat.percentage).toBe(0)
      expect(stat.minutes).toBe(0)
    })
  })
})

// ── computeWeekStats — single event ──────────────────────

describe('computeWeekStats — single event', () => {
  it('accounts for 100% of total with correct duration', () => {
    const events = [makeEvent('e1', 'accent', 0, 60 * MINUTE)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)

    expect(result.totalMinutes).toBe(60)
    expect(statFor(result, 'accent').minutes).toBe(60)
    expect(statFor(result, 'accent').percentage).toBe(100)
  })

  it('other categories are 0 minutes / 0%', () => {
    const events = [makeEvent('e1', 'accent', 0, 60 * MINUTE)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)

    expect(statFor(result, 'sage').minutes).toBe(0)
    expect(statFor(result, 'sage').percentage).toBe(0)
  })
})

// ── computeWeekStats — same-category union ───────────────

describe('computeWeekStats — same category, non-overlapping', () => {
  it('sums durations of separate events', () => {
    const events = [
      makeEvent('e1', 'accent', 0,          30 * MINUTE),
      makeEvent('e2', 'accent', 60 * MINUTE, 90 * MINUTE),
    ]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    expect(statFor(result, 'accent').minutes).toBe(60)
    expect(result.totalMinutes).toBe(60)
  })
})

describe('computeWeekStats — same category, overlapping', () => {
  it('deduplicates overlapping time within the same category', () => {
    // [0, 60] and [30, 90] overlap → union [0, 90] = 90 min
    const events = [
      makeEvent('e1', 'accent', 0,           60 * MINUTE),
      makeEvent('e2', 'accent', 30 * MINUTE,  90 * MINUTE),
    ]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    expect(statFor(result, 'accent').minutes).toBe(90)
    expect(statFor(result, 'accent').percentage).toBe(100)
    expect(result.totalMinutes).toBe(90)
  })

  it('three events: A∪B overlap, B∪C do not — union is [0,60]∪[80,100] = 80 min', () => {
    const events = [
      makeEvent('e1', 'accent',  0 * MINUTE,  40 * MINUTE),
      makeEvent('e2', 'accent', 20 * MINUTE,  60 * MINUTE),
      makeEvent('e3', 'accent', 80 * MINUTE, 100 * MINUTE),
    ]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    expect(statFor(result, 'accent').minutes).toBe(80)
    expect(statFor(result, 'accent').percentage).toBe(100)
    expect(result.totalMinutes).toBe(80)
  })
})

// ── computeWeekStats — cross-category overlap ────────────

describe('computeWeekStats — cross-category overlap', () => {
  it('denominator is union of all events; numerators are per-category unions', () => {
    // accent: [0, 60min], sage: [30min, 90min]
    // denominator: union([0,60],[30,90]) = [0,90] = 90 min
    // accent numerator: [0,60] = 60 min → 66.7%
    // sage   numerator: [30,90] = 60 min → 66.7%
    const events = [
      makeEvent('e1', 'accent', 0,           60 * MINUTE),
      makeEvent('e2', 'sage',   30 * MINUTE,  90 * MINUTE),
    ]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)

    expect(result.totalMinutes).toBe(90)
    expect(statFor(result, 'accent').minutes).toBe(60)
    expect(statFor(result, 'sage').minutes).toBe(60)
    // (60 / 90) * 100 = 66.666... → rounded to 66.7
    expect(statFor(result, 'accent').percentage).toBe(66.7)
    expect(statFor(result, 'sage').percentage).toBe(66.7)
  })
})

// ── computeWeekStats — week boundary clipping ────────────

describe('computeWeekStats — week boundary clipping', () => {
  it('clips the start of an event that begins before weekStart', () => {
    // Event: [-30min, 30min] → clipped to [0, 30min] = 30 min
    const events = [makeEvent('e1', 'accent', -30 * MINUTE, 30 * MINUTE)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    expect(statFor(result, 'accent').minutes).toBe(30)
    expect(result.totalMinutes).toBe(30)
  })

  it('clips the end of an event that finishes after weekEnd', () => {
    // Event: [WEEK_END-30min, WEEK_END+30min] → clipped to 30 min
    const events = [makeEvent('e1', 'accent', WEEK_END - 30 * MINUTE, WEEK_END + 30 * MINUTE)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    expect(statFor(result, 'accent').minutes).toBe(30)
  })

  it('excludes an event completely before weekStart', () => {
    const events = [makeEvent('e1', 'accent', -2 * HOUR, -HOUR)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    expect(result.totalMinutes).toBe(0)
  })

  it('excludes an event completely after weekEnd', () => {
    const events = [makeEvent('e1', 'accent', WEEK_END + HOUR, WEEK_END + 2 * HOUR)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    expect(result.totalMinutes).toBe(0)
  })

  it('includes an event that starts exactly at weekStart', () => {
    const events = [makeEvent('e1', 'accent', WEEK_START, WEEK_START + 30 * MINUTE)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    expect(statFor(result, 'accent').minutes).toBe(30)
  })
})

// ── computeWeekStats — byCategory ordering ───────────────

describe('computeWeekStats — byCategory ordering', () => {
  it('returns byCategory in the same order as the categories argument', () => {
    const result = computeWeekStats([], DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    const expected = DEFAULT_CATEGORIES.map((c) => c.id)
    const actual   = result.byCategory.map((s) => s.categoryId)
    expect(actual).toEqual(expected)
  })
})

// ── computeWeekStats — percentage rounding ───────────────

describe('computeWeekStats — percentage rounding', () => {
  it('rounds to 1 decimal place and returns a number (not a string)', () => {
    // 1 min out of 3 min = 33.333...% → 33.3
    const events = [
      makeEvent('e1', 'accent', 0,         1 * MINUTE),
      makeEvent('e2', 'sage',   1 * MINUTE, 2 * MINUTE),
      makeEvent('e3', 'sand',   2 * MINUTE, 3 * MINUTE),
    ]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_START, WEEK_END)
    // denominator = 3 min (no overlap)
    expect(result.totalMinutes).toBe(3)
    const pct = statFor(result, 'accent').percentage
    expect(typeof pct).toBe('number')
    expect(pct).toBe(33.3)
  })
})
