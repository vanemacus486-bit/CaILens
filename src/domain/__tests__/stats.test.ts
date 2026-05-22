import { describe, it, expect } from 'vitest'
import { mergeIntervals, computeWeekStats, computeStreak, computeTypeSplit } from '../stats'
import { DEFAULT_CATEGORIES } from '../category'
import type { CalendarEvent, EventColor } from '../event'
import type { CategoryId } from '../category'

// ── Helpers ───────────────────────────────────────────────

const MINUTE = 60_000
const HOUR   = 3_600_000

// A week anchored at t=0 (7 days)
const WEEK_START = 0
const WEEK_END   = 7 * 24 * HOUR
const WEEK_RANGE = { start: WEEK_START, end: WEEK_END }

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

describe('mergeIntervals �?edge cases', () => {
  it('returns [] for empty input', () => {
    expect(mergeIntervals([])).toEqual([])
  })

  it('returns a single interval unchanged', () => {
    expect(mergeIntervals([[0, 60]])).toEqual([[0, 60]])
  })
})

describe('mergeIntervals �?non-overlapping', () => {
  it('keeps two non-overlapping intervals separate', () => {
    expect(mergeIntervals([[0, 30], [60, 90]])).toEqual([[0, 30], [60, 90]])
  })

  it('sorts unsorted input before merging', () => {
    expect(mergeIntervals([[60, 90], [0, 30]])).toEqual([[0, 30], [60, 90]])
  })
})

describe('mergeIntervals �?overlapping', () => {
  it('merges completely overlapping intervals', () => {
    expect(mergeIntervals([[0, 60], [10, 50]])).toEqual([[0, 60]])
  })

  it('merges partially overlapping intervals', () => {
    expect(mergeIntervals([[0, 50], [30, 90]])).toEqual([[0, 90]])
  })

  it('three intervals: A∪B overlap, B∪C do not', () => {
    // [0,40] �?[20,60] �?[0,60]; [80,100] separate
    expect(mergeIntervals([[0, 40], [20, 60], [80, 100]])).toEqual([[0, 60], [80, 100]])
  })

  it('handles unsorted three-interval input', () => {
    expect(mergeIntervals([[80, 100], [0, 40], [20, 60]])).toEqual([[0, 60], [80, 100]])
  })
})

describe('mergeIntervals �?abutting boundary (half-open semantics)', () => {
  it('does NOT merge abutting intervals where end === start of next', () => {
    // [0,30) and [30,60) are adjacent but not overlapping
    expect(mergeIntervals([[0, 30], [30, 60]])).toEqual([[0, 30], [30, 60]])
  })

  it('merges when there is even 1 unit of overlap', () => {
    expect(mergeIntervals([[0, 31], [30, 60]])).toEqual([[0, 60]])
  })
})

// ── computeWeekStats �?empty / NaN guard ─────────────────

describe('computeWeekStats �?empty input', () => {
  it('returns totalMinutes=0 when there are no events', () => {
    const result = computeWeekStats([], DEFAULT_CATEGORIES, WEEK_RANGE)
    expect(result.totalMinutes).toBe(0)
  })

  it('returns byCategory with exactly 6 entries', () => {
    const result = computeWeekStats([], DEFAULT_CATEGORIES, WEEK_RANGE)
    expect(result.byCategory).toHaveLength(6)
  })

  it('all percentages are 0 (not NaN) when totalMinutes is 0', () => {
    const result = computeWeekStats([], DEFAULT_CATEGORIES, WEEK_RANGE)
    result.byCategory.forEach((stat) => {
      expect(Number.isNaN(stat.percentage)).toBe(false)
      expect(stat.percentage).toBe(0)
      expect(stat.minutes).toBe(0)
    })
  })
})

// ── computeWeekStats �?single event ──────────────────────

describe('computeWeekStats �?single event', () => {
  it('accounts for 100% of total with correct duration', () => {
    const events = [makeEvent('e1', 'accent', 0, 60 * MINUTE)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)

    expect(result.totalMinutes).toBe(60)
    expect(statFor(result, 'accent').minutes).toBe(60)
    expect(statFor(result, 'accent').percentage).toBe(100)
  })

  it('other categories are 0 minutes / 0%', () => {
    const events = [makeEvent('e1', 'accent', 0, 60 * MINUTE)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)

    expect(statFor(result, 'sage').minutes).toBe(0)
    expect(statFor(result, 'sage').percentage).toBe(0)
  })
})

// ── computeWeekStats �?same-category union ───────────────

describe('computeWeekStats �?same category, non-overlapping', () => {
  it('sums durations of separate events', () => {
    const events = [
      makeEvent('e1', 'accent', 0,          30 * MINUTE),
      makeEvent('e2', 'accent', 60 * MINUTE, 90 * MINUTE),
    ]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)
    expect(statFor(result, 'accent').minutes).toBe(60)
    expect(result.totalMinutes).toBe(60)
  })
})

describe('computeWeekStats �?same category, overlapping', () => {
  it('deduplicates overlapping time within the same category', () => {
    // [0, 60] and [30, 90] overlap �?union [0, 90] = 90 min
    const events = [
      makeEvent('e1', 'accent', 0,           60 * MINUTE),
      makeEvent('e2', 'accent', 30 * MINUTE,  90 * MINUTE),
    ]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)
    expect(statFor(result, 'accent').minutes).toBe(90)
    expect(statFor(result, 'accent').percentage).toBe(100)
    expect(result.totalMinutes).toBe(90)
  })

  it('three events: A∪B overlap, B∪C do not �?union is [0,60]∪[80,100] = 80 min', () => {
    const events = [
      makeEvent('e1', 'accent',  0 * MINUTE,  40 * MINUTE),
      makeEvent('e2', 'accent', 20 * MINUTE,  60 * MINUTE),
      makeEvent('e3', 'accent', 80 * MINUTE, 100 * MINUTE),
    ]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)
    expect(statFor(result, 'accent').minutes).toBe(80)
    expect(statFor(result, 'accent').percentage).toBe(100)
    expect(result.totalMinutes).toBe(80)
  })
})

// ── computeWeekStats �?cross-category overlap ────────────

describe('computeWeekStats �?cross-category overlap', () => {
  it('denominator is union of all events; numerators are per-category unions', () => {
    // accent: [0, 60min], sage: [30min, 90min]
    // denominator: union([0,60],[30,90]) = [0,90] = 90 min
    // accent numerator: [0,60] = 60 min �?66.7%
    // sage   numerator: [30,90] = 60 min �?66.7%
    const events = [
      makeEvent('e1', 'accent', 0,           60 * MINUTE),
      makeEvent('e2', 'sage',   30 * MINUTE,  90 * MINUTE),
    ]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)

    expect(result.totalMinutes).toBe(90)
    expect(statFor(result, 'accent').minutes).toBe(60)
    expect(statFor(result, 'sage').minutes).toBe(60)
    // (60 / 90) * 100 = 66.666... �?rounded to 66.7
    expect(statFor(result, 'accent').percentage).toBe(66.7)
    expect(statFor(result, 'sage').percentage).toBe(66.7)
  })
})

// ── computeWeekStats �?week boundary clipping ────────────

describe('computeWeekStats �?week boundary clipping', () => {
  it('clips the start of an event that begins before weekStart', () => {
    // Event: [-30min, 30min] �?clipped to [0, 30min] = 30 min
    const events = [makeEvent('e1', 'accent', -30 * MINUTE, 30 * MINUTE)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)
    expect(statFor(result, 'accent').minutes).toBe(30)
    expect(result.totalMinutes).toBe(30)
  })

  it('clips the end of an event that finishes after weekEnd', () => {
    // Event: [WEEK_END-30min, WEEK_END+30min] �?clipped to 30 min
    const events = [makeEvent('e1', 'accent', WEEK_END - 30 * MINUTE, WEEK_END + 30 * MINUTE)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)
    expect(statFor(result, 'accent').minutes).toBe(30)
  })

  it('excludes an event completely before weekStart', () => {
    const events = [makeEvent('e1', 'accent', -2 * HOUR, -HOUR)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)
    expect(result.totalMinutes).toBe(0)
  })

  it('excludes an event completely after weekEnd', () => {
    const events = [makeEvent('e1', 'accent', WEEK_END + HOUR, WEEK_END + 2 * HOUR)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)
    expect(result.totalMinutes).toBe(0)
  })

  it('includes an event that starts exactly at weekStart', () => {
    const events = [makeEvent('e1', 'accent', WEEK_START, WEEK_START + 30 * MINUTE)]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)
    expect(statFor(result, 'accent').minutes).toBe(30)
  })
})

// ── computeWeekStats �?byCategory ordering ───────────────

describe('computeWeekStats �?byCategory ordering', () => {
  it('returns byCategory in the same order as the categories argument', () => {
    const result = computeWeekStats([], DEFAULT_CATEGORIES, WEEK_RANGE)
    const expected = DEFAULT_CATEGORIES.map((c) => c.id)
    const actual   = result.byCategory.map((s) => s.categoryId)
    expect(actual).toEqual(expected)
  })
})

// ── computeStreak ──────────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60_000

describe('computeStreak', () => {
  it('returns 0 for empty events', () => {
    expect(computeStreak([], 0)).toBe(0)
  })

  it('returns 1 when one event falls in the current week', () => {
    // anchor=WEEK_MS �?current week is [0, WEEK_MS)
    const events = [makeEvent('e1', 'accent', HOUR, 2 * HOUR)]
    expect(computeStreak(events, WEEK_MS)).toBe(1)
  })

  it('returns 3 when events span 3 consecutive weeks back', () => {
    // anchor=3*WEEK_MS �?weeks are [2W,3W), [1W,2W), [0,W)
    const events = [
      makeEvent('e1', 'accent', HOUR,                    2 * HOUR),                // week [0,W)
      makeEvent('e2', 'sage',   WEEK_MS + HOUR,          WEEK_MS + 2 * HOUR),       // week [W,2W)
      makeEvent('e3', 'sand',   2 * WEEK_MS + HOUR,     2 * WEEK_MS + 2 * HOUR),   // week [2W,3W)
    ]
    expect(computeStreak(events, 3 * WEEK_MS)).toBe(3)
  })

  it('breaks streak when a week has no events', () => {
    // Events in week 0 and week 2, but gap in week 1 �?streak = 1 (only current week)
    const events = [
      makeEvent('e1', 'accent', HOUR,                    2 * HOUR),                // week [0,W)
      makeEvent('e2', 'sage',   2 * WEEK_MS + HOUR,     2 * WEEK_MS + 2 * HOUR),   // week [2W,3W)
    ]
    expect(computeStreak(events, 3 * WEEK_MS)).toBe(1)
  })

  it('counts an event exactly at the week boundary', () => {
    // Event at anchor-2*WEEK_MS (start of oldest counted week)
    const events = [makeEvent('e1', 'accent', 2 * WEEK_MS, 2 * WEEK_MS + HOUR)]
    // anchor=3W �?week [2W,3W) starts at 2W, event at 2W falls in
    expect(computeStreak(events, 3 * WEEK_MS)).toBe(1)
  })
})

// ── computeTypeSplit ───────────────────────────────────────

describe('computeTypeSplit', () => {
  it('returns all zeros for empty byCategory', () => {
    const result = computeTypeSplit({} as Record<CategoryId, number>)
    expect(result.typeI.hours).toBe(0)
    expect(result.typeI.pct).toBe(0)
    expect(result.typeII.hours).toBe(0)
    expect(result.typeII.pct).toBe(0)
  })

  it('correctly splits balanced categories', () => {
    const byCategory: Record<CategoryId, number> = {
      accent: 4, sky: 2, sage: 2, sand: 1, rose: 1, stone: 0,
    }
    const result = computeTypeSplit(byCategory)
    expect(result.typeI.hours).toBe(6)    // accent 4 + sky 2
    expect(result.typeII.hours).toBe(4)   // sage 2 + sand 1 + rose 1
    expect(result.typeI.pct).toBe(60)     // Math.round(6/10 * 100)
    expect(result.typeII.pct).toBe(40)    // Math.round(4/10 * 100)
  })

  it('returns 100% Type I when Type II is zero', () => {
    const byCategory: Record<CategoryId, number> = {
      accent: 3, sky: 1, sage: 0, sand: 0, rose: 0, stone: 0,
    }
    const result = computeTypeSplit(byCategory)
    expect(result.typeI.pct).toBe(100)
    expect(result.typeII.pct).toBe(0)
  })

  it('returns 100% Type II when Type I is zero', () => {
    const byCategory: Record<CategoryId, number> = {
      accent: 0, sky: 0, sage: 2, sand: 2, rose: 1, stone: 1,
    }
    const result = computeTypeSplit(byCategory)
    expect(result.typeI.pct).toBe(0)
    expect(result.typeII.pct).toBe(100)
  })

  it('ignores unknown category IDs', () => {
    const byCategory = {
      accent: 5, sky: 0, sage: 0, sand: 0, rose: 0, stone: 0,
      unknown: 100,
    } as Record<CategoryId, number>
    const result = computeTypeSplit(byCategory)
    expect(result.typeI.hours).toBe(5)
    expect(result.typeII.hours).toBe(0)
  })
})

// ── computeWeekStats �?percentage rounding ───────────────

describe('computeWeekStats �?percentage rounding', () => {
  it('rounds to 1 decimal place and returns a number (not a string)', () => {
    // 1 min out of 3 min = 33.333...% �?33.3
    const events = [
      makeEvent('e1', 'accent', 0,         1 * MINUTE),
      makeEvent('e2', 'sage',   1 * MINUTE, 2 * MINUTE),
      makeEvent('e3', 'sand',   2 * MINUTE, 3 * MINUTE),
    ]
    const result = computeWeekStats(events, DEFAULT_CATEGORIES, WEEK_RANGE)
    // denominator = 3 min (no overlap)
    expect(result.totalMinutes).toBe(3)
    const pct = statFor(result, 'accent').percentage
    expect(typeof pct).toBe('number')
    expect(pct).toBe(33.3)
  })
})
