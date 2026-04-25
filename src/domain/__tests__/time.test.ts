import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getWeekStart,
  getWeekDays,
  addWeeks,
  isSameDay,
  isToday,
  getDayStart,
  getDayEnd,
  getMinutesFromDayStart,
  moveTimestampToDay,
  formatISODate,
  parseISODate,
  formatTime,
  formatWeekday,
  formatMonthDay,
  isRangeOverlapping,
  isEventOnDay,
} from '../time'

// ── helpers ───────────────────────────────────────────────

/** Local-timezone midnight for a given calendar date. */
function localMidnight(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

function localTime(year: number, month: number, day: number, h: number, m = 0): Date {
  return new Date(year, month - 1, day, h, m, 0, 0)
}

// ── getWeekStart ──────────────────────────────────────────

describe('getWeekStart', () => {
  // April 20, 2026 is a Monday.
  // April 19, 2026 is a Sunday.
  // January 1, 2026 is a Thursday.

  it('returns the same Monday at 00:00 when a Monday is passed (weekStartsOn: 1)', () => {
    const monday = localTime(2026, 4, 20, 15, 30) // Monday at 15:30
    const result = getWeekStart(monday, 1)
    expect(result).toEqual(localMidnight(2026, 4, 20))
  })

  it('returns the previous Monday when a Sunday is passed (weekStartsOn: 1)', () => {
    const sunday = localMidnight(2026, 4, 19) // Sunday
    const result = getWeekStart(sunday, 1)
    expect(result).toEqual(localMidnight(2026, 4, 13))
  })

  it('returns the same Sunday at 00:00 when a Sunday is passed (weekStartsOn: 0)', () => {
    const sunday = localTime(2026, 4, 19, 12, 0)
    const result = getWeekStart(sunday, 0)
    expect(result).toEqual(localMidnight(2026, 4, 19))
  })

  it('always returns 00:00:00.000 regardless of input time', () => {
    const d = localTime(2026, 4, 20, 15, 30)
    const result = getWeekStart(d, 1)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('handles the new-year boundary correctly (Jan 1, 2026 → week starts Dec 29, 2025)', () => {
    const jan1 = localMidnight(2026, 1, 1) // Thursday
    const result = getWeekStart(jan1, 1)
    expect(result).toEqual(localMidnight(2025, 12, 29))
  })

  it('handles end-of-year boundary (Dec 31, 2025 is a Wednesday → week starts Dec 29)', () => {
    const dec31 = localMidnight(2025, 12, 31) // Wednesday
    const result = getWeekStart(dec31, 1)
    expect(result).toEqual(localMidnight(2025, 12, 29))
  })
})

// ── getWeekDays ───────────────────────────────────────────

describe('getWeekDays', () => {
  const weekStart = localMidnight(2026, 4, 20) // Monday

  it('returns exactly 7 Date objects', () => {
    expect(getWeekDays(weekStart)).toHaveLength(7)
  })

  it('first element equals weekStart', () => {
    const days = getWeekDays(weekStart)
    expect(days[0]).toEqual(weekStart)
  })

  it('each day is at 00:00:00.000', () => {
    const days = getWeekDays(weekStart)
    for (const d of days) {
      expect(d.getHours()).toBe(0)
      expect(d.getMinutes()).toBe(0)
      expect(d.getSeconds()).toBe(0)
      expect(d.getMilliseconds()).toBe(0)
    }
  })

  it('dates increase by exactly one calendar day each step', () => {
    const days = getWeekDays(weekStart)
    for (let i = 1; i < days.length; i++) {
      expect(days[i].getDate()).toBe(days[i - 1].getDate() + 1 <= 30
        ? days[i - 1].getDate() + 1
        : days[i].getDate()) // handles month boundary by just checking the diff
      const diffMs = days[i].getTime() - days[i - 1].getTime()
      // Diff should be 23–25 hours to account for DST; practically always 24h.
      expect(diffMs).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000)
      expect(diffMs).toBeLessThanOrEqual(25 * 60 * 60 * 1000)
    }
  })

  it('last element is 6 days after weekStart', () => {
    const days = getWeekDays(weekStart)
    expect(days[6]).toEqual(localMidnight(2026, 4, 26)) // Sunday
  })
})

// ── addWeeks ──────────────────────────────────────────────

describe('addWeeks', () => {
  it('adds 1 week (7 days)', () => {
    const start = localMidnight(2026, 4, 20)
    expect(addWeeks(start, 1)).toEqual(localMidnight(2026, 4, 27))
  })

  it('adds negative weeks (goes back in time)', () => {
    const start = localMidnight(2026, 4, 20)
    expect(addWeeks(start, -1)).toEqual(localMidnight(2026, 4, 13))
  })

  it('crosses month boundary correctly', () => {
    const start = localMidnight(2026, 4, 27) // April 27
    expect(addWeeks(start, 1)).toEqual(localMidnight(2026, 5, 4)) // May 4
  })

  it('crosses year boundary correctly', () => {
    const start = localMidnight(2025, 12, 29)
    expect(addWeeks(start, 1)).toEqual(localMidnight(2026, 1, 5))
  })

  it('adding 0 weeks returns an equivalent date', () => {
    const start = localMidnight(2026, 4, 20)
    const result = addWeeks(start, 0)
    expect(result.getTime()).toBe(start.getTime())
  })
})

// ── isSameDay ─────────────────────────────────────────────

describe('isSameDay', () => {
  it('returns true for same calendar day at different times', () => {
    const a = localTime(2026, 4, 20, 8, 0)
    const b = localTime(2026, 4, 20, 23, 59)
    expect(isSameDay(a, b)).toBe(true)
  })

  it('returns false for adjacent days at boundary times', () => {
    const a = localTime(2026, 4, 20, 23, 59)
    const b = localMidnight(2026, 4, 21)
    expect(isSameDay(a, b)).toBe(false)
  })

  it('accepts timestamps (number) as well as Date objects', () => {
    const a = localMidnight(2026, 4, 20).getTime()
    const b = localTime(2026, 4, 20, 12, 0).getTime()
    expect(isSameDay(a, b)).toBe(true)
  })

  it('accepts mixed Date and number arguments', () => {
    const a = localMidnight(2026, 4, 20)
    const b = localTime(2026, 4, 20, 6, 0).getTime()
    expect(isSameDay(a, b)).toBe(true)
  })

  it('returns false for same time on different days', () => {
    const a = localTime(2026, 4, 20, 12, 0)
    const b = localTime(2026, 4, 21, 12, 0)
    expect(isSameDay(a, b)).toBe(false)
  })
})

// ── isToday ───────────────────────────────────────────────

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(localTime(2026, 4, 20, 9, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true for a timestamp on "today"', () => {
    expect(isToday(localTime(2026, 4, 20, 15, 0).getTime())).toBe(true)
  })

  it('returns true for midnight of "today"', () => {
    expect(isToday(localMidnight(2026, 4, 20).getTime())).toBe(true)
  })

  it('returns false for yesterday', () => {
    expect(isToday(localMidnight(2026, 4, 19).getTime())).toBe(false)
  })

  it('returns false for tomorrow', () => {
    expect(isToday(localMidnight(2026, 4, 21).getTime())).toBe(false)
  })
})

// ── getDayStart / getDayEnd ───────────────────────────────

describe('getDayStart', () => {
  it('returns local midnight as a timestamp', () => {
    const d = localTime(2026, 4, 20, 15, 30)
    expect(getDayStart(d)).toBe(localMidnight(2026, 4, 20).getTime())
  })

  it('returns itself when already at midnight', () => {
    const d = localMidnight(2026, 4, 20)
    expect(getDayStart(d)).toBe(d.getTime())
  })
})

describe('getDayEnd', () => {
  it('returns the start of the next day (exclusive upper bound)', () => {
    const d = localTime(2026, 4, 20, 15, 30)
    expect(getDayEnd(d)).toBe(localMidnight(2026, 4, 21).getTime())
  })

  it('getDayEnd > getDayStart for the same date', () => {
    const d = localMidnight(2026, 4, 20)
    expect(getDayEnd(d)).toBeGreaterThan(getDayStart(d))
  })
})

// ── getMinutesFromDayStart ────────────────────────────────

describe('getMinutesFromDayStart', () => {
  it('returns 0 for local midnight', () => {
    expect(getMinutesFromDayStart(localMidnight(2026, 4, 20).getTime())).toBe(0)
  })

  it('returns 750 for 12:30', () => {
    expect(getMinutesFromDayStart(localTime(2026, 4, 20, 12, 30).getTime())).toBe(750)
  })

  it('returns 1439 for 23:59', () => {
    expect(getMinutesFromDayStart(localTime(2026, 4, 20, 23, 59).getTime())).toBe(1439)
  })

  it('returns 60 for 01:00', () => {
    expect(getMinutesFromDayStart(localTime(2026, 4, 20, 1, 0).getTime())).toBe(60)
  })
})

// ── formatISODate / parseISODate ──────────────────────────

describe('formatISODate', () => {
  it('formats a local date as yyyy-MM-dd', () => {
    expect(formatISODate(localMidnight(2026, 4, 20))).toBe('2026-04-20')
  })

  it('formats regardless of time-of-day', () => {
    expect(formatISODate(localTime(2026, 4, 20, 23, 59))).toBe('2026-04-20')
  })

  it('formats month correctly with zero padding', () => {
    expect(formatISODate(localMidnight(2026, 1, 5))).toBe('2026-01-05')
  })
})

describe('parseISODate', () => {
  it('parses yyyy-MM-dd to the correct local day', () => {
    const result = parseISODate('2026-04-20')
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3)   // 0-indexed
    expect(result.getDate()).toBe(20)
  })

  it('round-trips with formatISODate (constructed with local timezone)', () => {
    const original = new Date(2026, 3, 20, 0, 0, 0) // local midnight, no timezone ambiguity
    const iso = formatISODate(original)
    const back = parseISODate(iso)
    expect(isSameDay(original, back)).toBe(true)
  })

  it('round-trips across month and year boundaries', () => {
    const dates = [
      localMidnight(2026, 1, 1),
      localMidnight(2025, 12, 31),
      localMidnight(2026, 2, 28),
    ]
    for (const d of dates) {
      expect(isSameDay(d, parseISODate(formatISODate(d)))).toBe(true)
    }
  })
})

// ── formatTime ────────────────────────────────────────────

describe('formatTime', () => {
  describe('12h format', () => {
    it('formats afternoon time as h:mm PM', () => {
      expect(formatTime(localTime(2026, 4, 20, 14, 30).getTime(), '12h')).toBe('2:30 PM')
    })

    it('formats noon as 12:00 PM', () => {
      expect(formatTime(localTime(2026, 4, 20, 12, 0).getTime(), '12h')).toBe('12:00 PM')
    })

    it('formats midnight as 12:00 AM', () => {
      expect(formatTime(localMidnight(2026, 4, 20).getTime(), '12h')).toBe('12:00 AM')
    })

    it('formats morning time as h:mm AM', () => {
      expect(formatTime(localTime(2026, 4, 20, 9, 5).getTime(), '12h')).toBe('9:05 AM')
    })
  })

  describe('24h format', () => {
    it('formats afternoon time as HH:mm', () => {
      expect(formatTime(localTime(2026, 4, 20, 14, 30).getTime(), '24h')).toBe('14:30')
    })

    it('formats midnight as 00:00', () => {
      expect(formatTime(localMidnight(2026, 4, 20).getTime(), '24h')).toBe('00:00')
    })

    it('formats noon as 12:00', () => {
      expect(formatTime(localTime(2026, 4, 20, 12, 0).getTime(), '24h')).toBe('12:00')
    })
  })
})

// ── formatWeekday ─────────────────────────────────────────

describe('formatWeekday', () => {
  const monday = localMidnight(2026, 4, 20) // known Monday

  it('short style returns abbreviated name (Mon)', () => {
    expect(formatWeekday(monday, 'short')).toBe('Mon')
  })

  it('long style returns full name (Monday)', () => {
    expect(formatWeekday(monday, 'long')).toBe('Monday')
  })

  it('Sunday formats correctly', () => {
    const sunday = localMidnight(2026, 4, 19)
    expect(formatWeekday(sunday, 'short')).toBe('Sun')
    expect(formatWeekday(sunday, 'long')).toBe('Sunday')
  })
})

// ── formatMonthDay ────────────────────────────────────────

describe('formatMonthDay', () => {
  it('formats as "MMM d" (Apr 20)', () => {
    expect(formatMonthDay(localMidnight(2026, 4, 20))).toBe('Apr 20')
  })

  it('formats single-digit days without zero padding (Jan 5)', () => {
    expect(formatMonthDay(localMidnight(2026, 1, 5))).toBe('Jan 5')
  })

  it('formats December correctly', () => {
    expect(formatMonthDay(localMidnight(2025, 12, 31))).toBe('Dec 31')
  })
})

// ── isRangeOverlapping ────────────────────────────────────

describe('isRangeOverlapping', () => {
  it('returns true when ranges partially overlap', () => {
    expect(isRangeOverlapping({ start: 0, end: 100 }, { start: 50, end: 150 })).toBe(true)
  })

  it('returns false when ranges do not overlap', () => {
    expect(isRangeOverlapping({ start: 0, end: 100 }, { start: 200, end: 300 })).toBe(false)
  })

  it('returns false when a.end === b.start (half-open intervals touch, not overlap)', () => {
    expect(isRangeOverlapping({ start: 0, end: 100 }, { start: 100, end: 200 })).toBe(false)
  })

  it('returns false when b.end === a.start', () => {
    expect(isRangeOverlapping({ start: 100, end: 200 }, { start: 0, end: 100 })).toBe(false)
  })

  it('returns true when one range contains the other', () => {
    expect(isRangeOverlapping({ start: 0, end: 1000 }, { start: 100, end: 200 })).toBe(true)
    expect(isRangeOverlapping({ start: 100, end: 200 }, { start: 0, end: 1000 })).toBe(true)
  })

  it('returns true when ranges are identical', () => {
    expect(isRangeOverlapping({ start: 0, end: 100 }, { start: 0, end: 100 })).toBe(true)
  })
})

// ── isEventOnDay ──────────────────────────────────────────

describe('isEventOnDay', () => {
  const day = localMidnight(2026, 4, 20)
  const dayStart = day.getTime()
  const dayEnd = localMidnight(2026, 4, 21).getTime()

  it('returns true for an event fully within the day', () => {
    expect(isEventOnDay(
      { startTime: dayStart + 3600_000, endTime: dayStart + 7200_000 },
      day,
    )).toBe(true)
  })

  it('returns false for an event on the previous day', () => {
    const prevDayStart = localMidnight(2026, 4, 19).getTime()
    expect(isEventOnDay(
      { startTime: prevDayStart, endTime: prevDayStart + 3600_000 },
      day,
    )).toBe(false)
  })

  it('returns false for an event whose endTime equals day start (touches, no overlap)', () => {
    expect(isEventOnDay(
      { startTime: dayStart - 3600_000, endTime: dayStart },
      day,
    )).toBe(false)
  })

  it('returns false for an event that starts at day end', () => {
    expect(isEventOnDay(
      { startTime: dayEnd, endTime: dayEnd + 3600_000 },
      day,
    )).toBe(false)
  })

  it('returns true for an event spanning multiple days (covers this day)', () => {
    const yesterday = localMidnight(2026, 4, 19).getTime()
    const tomorrow = localMidnight(2026, 4, 21).getTime()
    // Hypothetical cross-day event — the logic should still be correct even if
    // v1 doesn't allow creating such events.
    expect(isEventOnDay({ startTime: yesterday, endTime: tomorrow }, day)).toBe(true)
  })

  it('returns true for an event that starts before day and ends within it', () => {
    expect(isEventOnDay(
      { startTime: dayStart - 3600_000, endTime: dayStart + 3600_000 },
      day,
    )).toBe(true)
  })

  it('returns true for an event that starts within day and ends after it', () => {
    expect(isEventOnDay(
      { startTime: dayStart + 3600_000, endTime: dayEnd + 3600_000 },
      day,
    )).toBe(true)
  })
})

// ── moveTimestampToDay ────────────────────────────────────

describe('moveTimestampToDay', () => {
  it('moves a timestamp to the target day, preserving hours and minutes', () => {
    const ts     = new Date(2026, 3, 20, 10, 30).getTime()   // Monday 10:30
    const target = new Date(2026, 3, 22)                      // Wednesday
    const result = new Date(moveTimestampToDay(ts, target))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3)
    expect(result.getDate()).toBe(22)
    expect(result.getHours()).toBe(10)
    expect(result.getMinutes()).toBe(30)
  })

  it('resets seconds and milliseconds to zero', () => {
    const ts     = new Date(2026, 3, 20, 10, 30, 45, 500).getTime()
    const target = new Date(2026, 3, 22)
    const result = new Date(moveTimestampToDay(ts, target))
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('works at 23:59', () => {
    const ts     = new Date(2026, 3, 20, 23, 59).getTime()
    const target = new Date(2026, 3, 25)
    const result = new Date(moveTimestampToDay(ts, target))
    expect(result.getDate()).toBe(25)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
  })

  it('works at midnight (0:00)', () => {
    const ts     = new Date(2026, 3, 20, 0, 0).getTime()
    const target = new Date(2026, 3, 21)
    const result = new Date(moveTimestampToDay(ts, target))
    expect(result.getDate()).toBe(21)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })

  it('works across a month boundary', () => {
    const ts     = new Date(2026, 3, 27, 15, 0).getTime()  // April 27
    const target = new Date(2026, 4, 1)                     // May 1
    const result = new Date(moveTimestampToDay(ts, target))
    expect(result.getMonth()).toBe(4)   // May
    expect(result.getDate()).toBe(1)
    expect(result.getHours()).toBe(15)
  })

  it('works across a year boundary', () => {
    const ts     = new Date(2025, 11, 31, 9, 0).getTime()  // Dec 31
    const target = new Date(2026, 0, 1)                     // Jan 1
    const result = new Date(moveTimestampToDay(ts, target))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(1)
    expect(result.getHours()).toBe(9)
  })

  it('is idempotent when source and target are the same day', () => {
    const ts     = new Date(2026, 3, 20, 14, 45).getTime()
    const target = new Date(2026, 3, 20)
    const result = moveTimestampToDay(ts, target)
    const d = new Date(result)
    expect(d.getDate()).toBe(20)
    expect(d.getHours()).toBe(14)
    expect(d.getMinutes()).toBe(45)
  })
})
