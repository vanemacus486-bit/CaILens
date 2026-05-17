import { describe, it, expect } from 'vitest'
import {
  computeStandardWeek,
  mergeConsecutiveBuckets,
  type StandardWeekData,
  type StandardWeekBucket,
} from '../standardWeek'
import type { CalendarEvent } from '../event'

/** Helper: create a CalendarEvent with minimal fields. */
function ev(overrides: Partial<CalendarEvent> & { startTime: number; endTime: number }): CalendarEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? 'Untitled',
    startTime: overrides.startTime,
    endTime: overrides.endTime,
    color: overrides.color ?? 'accent',
    categoryId: overrides.categoryId ?? 'accent',
    description: overrides.description,
    location: overrides.location,
    createdAt: overrides.createdAt ?? 0,
    updatedAt: overrides.updatedAt ?? 0,
  }
}

/** Return a bucket for a given (weekday, hour), or undefined. */
function findBucket(data: StandardWeekData, weekday: number, hour: number): StandardWeekBucket | undefined {
  return data.buckets.find((b) => b.weekday === weekday && b.hour === hour)
}

// ── Fixed anchors so tests are weekday-deterministic ──────────
// 2025-05-12 is a Monday (local time).
const MON = new Date(2025, 4, 12, 0, 0, 0).getTime()
const TUE = new Date(2025, 4, 13, 0, 0, 0).getTime()

const MS_DAY = 24 * 60 * 60 * 1000

// Single calendar week (Monday 00:00 → next Monday 00:00), spanWeeks = 1.
const WEEK1 = { weekRangeStart: MON, weekRangeEnd: MON + 7 * MS_DAY }
// Two calendar weeks, spanWeeks = 2.
const WEEK2 = { weekRangeStart: MON, weekRangeEnd: MON + 14 * MS_DAY }
// Unbounded — used only for tests that don't check percentages.
const ALL_TIME = { weekRangeStart: 0, weekRangeEnd: 1e15 }

function h(dayBase: number, hour: number, minute = 0): number {
  return dayBase + hour * 60 * 60_000 + minute * 60_000
}

describe('computeStandardWeek', () => {
  // ── Basic ──────────────────────────────────────────────

  it('maps a single 1-hour event to the correct bucket', () => {
    const events = [ev({ title: 'Coding', startTime: h(MON, 9), endTime: h(MON, 10) })]
    const data = computeStandardWeek({ events, ...WEEK1 })

    const bucket = findBucket(data, 0, 9)
    expect(bucket).toBeDefined()
    expect(bucket!.entries).toHaveLength(1)
    expect(bucket!.entries[0].title).toBe('Coding')
    expect(bucket!.entries[0].minutes).toBe(60)
    // across-all-weeks: 60 / (1 * 60) = 100%
    expect(bucket!.entries[0].percentage).toBe(100)
    expect(bucket!.totalMinutes).toBe(60)
    expect(data.totalWeeks).toBe(1)
    expect(data.spanWeeks).toBe(1)
  })

  it('maps a 30-minute event into the correct hour bucket', () => {
    const events = [ev({ title: 'Meeting', startTime: h(MON, 14, 30), endTime: h(MON, 15, 0) })]
    const data = computeStandardWeek({ events, ...WEEK1 })

    const bucket = findBucket(data, 0, 14)
    expect(bucket).toBeDefined()
    expect(bucket!.entries[0].minutes).toBe(30)
    // across-all-weeks: 30 / (1 * 60) = 50%
    expect(bucket!.entries[0].percentage).toBe(50)
  })

  // ── Minute-weight slicing ──────────────────────────────

  it('splits an event across two adjacent hours by minute weight', () => {
    // 22:30 – 23:15 → 30 min in hour 22, 15 min in hour 23
    const events = [ev({ title: '社交', startTime: h(MON, 22, 30), endTime: h(MON, 23, 15) })]
    const data = computeStandardWeek({ events, ...WEEK1 })

    const b22 = findBucket(data, 0, 22)
    const b23 = findBucket(data, 0, 23)
    expect(b22).toBeDefined()
    expect(b23).toBeDefined()
    expect(b22!.entries[0].minutes).toBe(30)
    expect(b23!.entries[0].minutes).toBe(15)
    // across-all-weeks: 30/60=50%, 15/60=25%
    expect(b22!.entries[0].percentage).toBe(50)
    expect(b23!.entries[0].percentage).toBe(25)
  })

  it('handles an event spanning multiple full hours', () => {
    const events = [ev({ title: 'Deep work', startTime: h(MON, 8), endTime: h(MON, 12) })]
    const data = computeStandardWeek({ events, ...WEEK1 })

    for (let hr = 8; hr < 12; hr++) {
      const b = findBucket(data, 0, hr)
      expect(b).toBeDefined()
      expect(b!.entries[0].minutes).toBe(60)
    }
    expect(findBucket(data, 0, 12)).toBeUndefined()
  })

  // ── Cross-midnight ─────────────────────────────────────

  it('splits a cross-midnight event across two days', () => {
    const events = [ev({ title: 'Sleep', startTime: h(MON, 23), endTime: h(TUE, 1) })]
    const data = computeStandardWeek({ events, ...WEEK1 })

    const mon23 = findBucket(data, 0, 23)
    const tue0 = findBucket(data, 1, 0)
    expect(mon23).toBeDefined()
    expect(tue0).toBeDefined()
    expect(mon23!.entries[0].minutes).toBe(60)
    expect(tue0!.entries[0].minutes).toBe(60)
  })

  it('handles the 23:00–05:00 case from the original bug report', () => {
    const events = [ev({ title: '社交', startTime: h(MON, 23), endTime: h(TUE, 5) })]
    const data = computeStandardWeek({ events, ...WEEK1 })

    expect(findBucket(data, 0, 23)!.entries[0].minutes).toBe(60)
    expect(findBucket(data, 1, 0)!.entries[0].minutes).toBe(60)
    expect(findBucket(data, 1, 1)!.entries[0].minutes).toBe(60)
    expect(findBucket(data, 1, 4)!.entries[0].minutes).toBe(60)
  })

  // ── Aggregation ────────────────────────────────────────

  it('aggregates multiple events with the same title in the same bucket', () => {
    const events = [
      ev({ title: 'Coding', startTime: h(MON, 9), endTime: h(MON, 10) }),
      ev({ title: 'Coding', startTime: h(MON, 9), endTime: h(MON, 9, 30) }),
    ]
    const data = computeStandardWeek({ events, ...WEEK1 })

    const bucket = findBucket(data, 0, 9)
    expect(bucket!.entries).toHaveLength(1)
    expect(bucket!.entries[0].title).toBe('Coding')
    expect(bucket!.entries[0].minutes).toBe(90)
    // across-all-weeks: 90/60 = 150% → capped at 100
    expect(bucket!.entries[0].percentage).toBe(100)
    expect(bucket!.totalMinutes).toBe(90)
  })

  it('aggregates different titles in the same bucket — minutes not inflated', () => {
    // Same week, same bucket: 30 min vibe coding + 30 min reading.
    // Each should count 30 min, not be scaled by week count.
    const events = [
      ev({ title: 'vibe coding', startTime: h(MON, 10), endTime: h(MON, 10, 30) }),
      ev({ title: '阅读', startTime: h(MON, 10, 30), endTime: h(MON, 11) }),
    ]
    const data = computeStandardWeek({ events, ...WEEK1 })

    const bucket = findBucket(data, 0, 10)
    expect(bucket!.entries).toHaveLength(2)
    expect(bucket!.entries[0].title).toBe('vibe coding')
    expect(bucket!.entries[0].minutes).toBe(30)
    expect(bucket!.entries[1].title).toBe('阅读')
    expect(bucket!.entries[1].minutes).toBe(30)
    expect(bucket!.totalMinutes).toBe(60)
    // across-all-weeks: each 30/60 = 50%
    expect(bucket!.entries[0].percentage).toBe(50)
    expect(bucket!.entries[1].percentage).toBe(50)
  })

  it('computes correct percentages with multiple titles (within-recorded mode)', () => {
    const events = [
      ev({ title: 'Coding', startTime: h(MON, 9), endTime: h(MON, 10) }),
      ev({ title: 'Reading', startTime: h(MON, 9), endTime: h(MON, 9, 40) }),
    ]
    const data = computeStandardWeek({
      events, ...WEEK1, percentageMode: 'within-recorded',
    })

    const bucket = findBucket(data, 0, 9)
    expect(bucket!.entries[0].percentage).toBe(60)  // 60/100
    expect(bucket!.entries[1].percentage).toBe(40)  // 40/100
    expect(bucket!.totalMinutes).toBe(100)
  })

  // ── percentageMode: across-all-weeks ───────────────────

  it('scales percentage down with more weeks in across-all-weeks mode', () => {
    // Same 60-minute event, but across 2 calendar weeks.
    const events = [ev({ title: 'Coding', startTime: h(MON, 9), endTime: h(MON, 10) })]
    const data = computeStandardWeek({ events, ...WEEK2 })

    const bucket = findBucket(data, 0, 9)
    // 60 min / (2 weeks × 60) = 50%
    expect(bucket!.entries[0].percentage).toBe(50)
    expect(data.spanWeeks).toBe(2)
    expect(data.totalWeeks).toBe(1) // only 1 week has events
  })

  // ── Empty / no data ────────────────────────────────────

  it('returns zero buckets and zero weeks for empty events', () => {
    const data = computeStandardWeek({ events: [], ...WEEK1 })
    expect(data.buckets).toHaveLength(0)
    expect(data.totalWeeks).toBe(0)
    expect(data.spanWeeks).toBe(1)
  })

  // ── Excluded categories ─────────────────────────────────

  it('excludes events whose categoryId is in excludeCategoryIds', () => {
    const events = [
      ev({ title: 'Sleep', startTime: h(MON, 23), endTime: h(TUE, 7), categoryId: 'stone' }),
      ev({ title: 'Coding', startTime: h(MON, 9), endTime: h(MON, 10), categoryId: 'accent' }),
    ]
    const data = computeStandardWeek({
      events, ...WEEK1, excludeCategoryIds: new Set(['stone']),
    })

    expect(findBucket(data, 0, 23)).toBeUndefined()
    expect(findBucket(data, 0, 9)).toBeDefined()
    expect(data.totalWeeks).toBe(1)
  })

  // ── Week counting ──────────────────────────────────────

  it('counts distinct weeks correctly', () => {
    const week2Monday = new Date(2025, 4, 19, 0, 0, 0).getTime() // next Monday
    const events = [
      ev({ title: 'A', startTime: h(MON, 9), endTime: h(MON, 10) }),
      ev({ title: 'B', startTime: h(week2Monday, 14), endTime: h(week2Monday, 15) }),
    ]
    const data = computeStandardWeek({ events, ...ALL_TIME })
    expect(data.totalWeeks).toBe(2)
  })

  it('returns spanWeeks = number of calendar weeks in range', () => {
    const events = [ev({ title: 'A', startTime: h(MON, 9), endTime: h(MON, 10) })]
    // 2 calendar weeks
    const data = computeStandardWeek({
      events,
      weekRangeStart: MON,
      weekRangeEnd: MON + 14 * MS_DAY,
    })
    expect(data.spanWeeks).toBe(2)
    expect(data.totalWeeks).toBe(1)
  })

  // ── Week range filtering ───────────────────────────────

  it('filters events outside the week range', () => {
    const events = [
      ev({ title: 'Old', startTime: h(MON, 9), endTime: h(MON, 10) }),
      ev({ title: 'New', startTime: h(TUE, 14), endTime: h(TUE, 15) }),
    ]
    const data = computeStandardWeek({
      events,
      weekRangeStart: TUE,
      weekRangeEnd: TUE + MS_DAY,
    })

    expect(findBucket(data, 0, 9)).toBeUndefined()
    expect(findBucket(data, 1, 14)).toBeDefined()
  })

  // ── Edge: exact hour boundary ──────────────────────────

  it('handles an event exactly on hour boundaries', () => {
    const events = [ev({ title: 'X', startTime: h(MON, 9), endTime: h(MON, 11) })]
    const data = computeStandardWeek({ events, ...WEEK1 })

    expect(findBucket(data, 0, 9)!.entries[0].minutes).toBe(60)
    expect(findBucket(data, 0, 10)!.entries[0].minutes).toBe(60)
    expect(findBucket(data, 0, 11)).toBeUndefined()
  })

  // ── Edge: empty-title events ───────────────────────────

  it('groups empty-title events under the empty string', () => {
    const events = [
      ev({ title: '', startTime: h(MON, 9), endTime: h(MON, 10) }),
      ev({ title: '', startTime: h(MON, 9), endTime: h(MON, 9, 30) }),
    ]
    const data = computeStandardWeek({ events, ...WEEK1 })

    const bucket = findBucket(data, 0, 9)
    expect(bucket!.entries).toHaveLength(1)
    expect(bucket!.entries[0].title).toBe('')
    expect(bucket!.entries[0].minutes).toBe(90)
  })

  it('counts distinct weeks across two events in different weeks', () => {
    const week2Monday = new Date(2025, 4, 19, 0, 0, 0).getTime() // next Monday
    const events = [
      ev({ title: 'Coding', startTime: h(MON, 9), endTime: h(MON, 10) }),
      ev({ title: 'Coding', startTime: h(week2Monday, 9), endTime: h(week2Monday, 10) }),
    ]
    const range = { weekRangeStart: MON, weekRangeEnd: week2Monday + 7 * MS_DAY }
    const data = computeStandardWeek({ events, ...range })

    const bucket = findBucket(data, 0, 9)
    expect(bucket!.entries[0].weekCount).toBe(2)
    expect(data.totalWeeks).toBe(2)
    expect(data.spanWeeks).toBe(2)
  })

  // ── Edge: multiple weekdays ────────────────────────────

  it('places events on different weekdays correctly', () => {
    const events = [
      ev({ title: 'Mon', startTime: h(MON, 9), endTime: h(MON, 10) }),
      ev({ title: 'Tue', startTime: h(TUE, 14), endTime: h(TUE, 15) }),
    ]
    const data = computeStandardWeek({ events, ...WEEK1 })

    expect(findBucket(data, 0, 9)!.entries[0].title).toBe('Mon')
    expect(findBucket(data, 1, 14)!.entries[0].title).toBe('Tue')
  })
})

// ── mergeConsecutiveBuckets ──────────────────────────────

function bkt(weekday: number, hour: number, title: string, categoryId = 'accent' as const): StandardWeekBucket {
  return {
    weekday,
    hour,
    entries: [{
      title,
      categoryId,
      minutes: 30,
      percentage: 100,
      weekCount: 1,
    }],
    totalMinutes: 30,
  }
}

describe('mergeConsecutiveBuckets', () => {
  it('returns empty array for empty input', () => {
    expect(mergeConsecutiveBuckets([])).toHaveLength(0)
  })

  it('single bucket → single block', () => {
    const blocks = mergeConsecutiveBuckets([bkt(0, 9, 'Coding')])
    expect(blocks).toHaveLength(1)
    expect(blocks[0].weekday).toBe(0)
    expect(blocks[0].startHour).toBe(9)
    expect(blocks[0].endHour).toBe(10)
  })

  it('merges two consecutive hours with same top activity', () => {
    const blocks = mergeConsecutiveBuckets([
      bkt(0, 9, 'Coding'),
      bkt(0, 10, 'Coding'),
    ])
    expect(blocks).toHaveLength(1)
    expect(blocks[0].startHour).toBe(9)
    expect(blocks[0].endHour).toBe(11)
  })

  it('does NOT merge across different titles', () => {
    const blocks = mergeConsecutiveBuckets([
      bkt(0, 9, 'Coding'),
      bkt(0, 10, 'Reading'),
    ])
    expect(blocks).toHaveLength(2)
  })

  it('does NOT merge across day boundaries even with same title', () => {
    const blocks = mergeConsecutiveBuckets([
      bkt(0, 23, 'Sleep'),
      bkt(1, 0, 'Sleep'),
    ])
    expect(blocks).toHaveLength(2)
    expect(blocks[0].weekday).toBe(0)
    expect(blocks[1].weekday).toBe(1)
  })

  it('merges three consecutive hours and splits on title change', () => {
    const blocks = mergeConsecutiveBuckets([
      bkt(0, 8, 'Coding'),
      bkt(0, 9, 'Coding'),
      bkt(0, 10, 'Meeting'),
      bkt(0, 11, 'Coding'),
    ])
    expect(blocks).toHaveLength(3)
    expect(blocks[0].startHour).toBe(8)
    expect(blocks[0].endHour).toBe(10)
    expect(blocks[1].startHour).toBe(10)
    expect(blocks[1].endHour).toBe(11)
    expect(blocks[2].startHour).toBe(11)
    expect(blocks[2].endHour).toBe(12)
  })

  it('sorts unsorted buckets before merging', () => {
    const blocks = mergeConsecutiveBuckets([
      bkt(0, 10, 'Coding'),
      bkt(0, 9, 'Coding'),
    ])
    expect(blocks).toHaveLength(1)
    expect(blocks[0].startHour).toBe(9)
    expect(blocks[0].endHour).toBe(11)
  })
})
