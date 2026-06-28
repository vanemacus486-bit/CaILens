import { describe, it, expect } from 'vitest'
import {
  isSameLocalDay,
  marksOnDay,
  upcomingMarks,
  formatRelativeDay,
  type DayMark,
} from '../dayMark'

const DAY_MS = 86_400_000

/** 快速构造 DayMark（精确控制 date） */
function mk(id: string, date: number, label: string, createdAt = date): DayMark {
  return { id, date, label, createdAt, updatedAt: createdAt, color: null }
}

describe('isSameLocalDay', () => {
  it('returns true for identical timestamps', () => {
    const t = 1_700_000_000_000
    expect(isSameLocalDay(t, t)).toBe(true)
  })

  it('returns true for two timestamps on the same local day', () => {
    const midnight = new Date(2026, 5, 15).getTime() // 2026-06-15 00:00:00 local
    expect(isSameLocalDay(midnight, midnight + 86_400_000 - 1)).toBe(true)
  })

  it('returns false for consecutive days', () => {
    const day1 = new Date(2026, 5, 15).getTime()
    const day2 = new Date(2026, 5, 16).getTime()
    expect(isSameLocalDay(day1, day2)).toBe(false)
  })

  it('returns false for far apart days', () => {
    const day1 = new Date(2026, 0, 1).getTime()
    const day2 = new Date(2026, 5, 15).getTime()
    expect(isSameLocalDay(day1, day2)).toBe(false)
  })

  it('handles timestamps near midnight correctly', () => {
    // 2026-06-15 23:59:59.999 local
    const late = new Date(2026, 5, 15, 23, 59, 59, 999).getTime()
    // 2026-06-16 00:00:00.000 local
    const earlyNext = new Date(2026, 5, 16, 0, 0, 0, 0).getTime()
    expect(isSameLocalDay(late, late)).toBe(true)
    expect(isSameLocalDay(late, earlyNext)).toBe(false)
  })
})

describe('marksOnDay', () => {
  const d1 = new Date(2026, 5, 15).getTime() // 2026-06-15
  const d2 = new Date(2026, 5, 16).getTime() // 2026-06-16
  const d3 = new Date(2026, 5, 20).getTime() // 2026-06-20

  const marks: DayMark[] = [
    mk('a', d1, '发薪日'),
    mk('b', d1, '交房租'),
    mk('c', d2, '体检'),
    mk('d', d3, 'DDL'),
  ]

  it('returns marks for a day with multiple marks', () => {
    expect(marksOnDay(marks, d1)).toHaveLength(2)
    expect(marksOnDay(marks, d1).map((m) => m.label)).toEqual(['发薪日', '交房租'])
  })

  it('returns marks for a day with a single mark', () => {
    const result = marksOnDay(marks, d2)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('体检')
  })

  it('returns empty array for a day with no marks', () => {
    const noMarkDay = new Date(2026, 5, 10).getTime()
    expect(marksOnDay(marks, noMarkDay)).toEqual([])
  })

  it('returns empty array for empty marks input', () => {
    expect(marksOnDay([], d1)).toEqual([])
  })

  it('matches even when given timestamp is not at midnight', () => {
    const afternoon = new Date(2026, 5, 15, 14, 30).getTime()
    expect(marksOnDay(marks, afternoon)).toHaveLength(2)
  })
})

describe('upcomingMarks', () => {
  const today = new Date(2026, 5, 15).getTime()
  const yesterday = today - DAY_MS
  const tomorrow = today + DAY_MS
  const dayAfter = today + 2 * DAY_MS

  const marks: DayMark[] = [
    mk('past', yesterday, '过期的事', yesterday),
    mk('today', today, '今天的事', today),
    mk('tmrw', tomorrow, '明天的事', tomorrow),
    mk('later', dayAfter, '后天的事', dayAfter),
  ]

  it('returns today + future marks sorted by date', () => {
    const result = upcomingMarks(marks, today)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('today')
    expect(result[1].id).toBe('tmrw')
    expect(result[2].id).toBe('later')
  })

  it('excludes past marks', () => {
    const result = upcomingMarks(marks, today)
    expect(result.find((m) => m.id === 'past')).toBeUndefined()
  })

  it('sorts by date then by createdAt on same day', () => {
    const marks2: DayMark[] = [
      mk('b', today, 'second', today + 1000),
      mk('a', today, 'first', today),
    ]
    const result = upcomingMarks(marks2, today)
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('b')
  })

  it('returns empty array when no upcoming marks', () => {
    const allPast = [mk('p1', yesterday, 'done'), mk('p2', yesterday - DAY_MS, 'done2')]
    expect(upcomingMarks(allPast, today)).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(upcomingMarks([], today)).toEqual([])
  })
})

describe('formatRelativeDay', () => {
  const today = new Date(2026, 5, 15).getTime()
  const tomorrow = today + DAY_MS
  const dayAfter = today + 2 * DAY_MS
  const yesterday = today - DAY_MS
  const twoDaysAgo = today - 2 * DAY_MS
  const farFuture = today + 5 * DAY_MS

  describe('zh', () => {
    it('今天', () => expect(formatRelativeDay(today, today, 'zh')).toBe('今天'))
    it('明天', () => expect(formatRelativeDay(tomorrow, today, 'zh')).toBe('明天'))
    it('N 天后', () => expect(formatRelativeDay(dayAfter, today, 'zh')).toBe('2 天后'))
    it('昨天', () => expect(formatRelativeDay(yesterday, today, 'zh')).toBe('昨天'))
    it('N 天前', () => expect(formatRelativeDay(twoDaysAgo, today, 'zh')).toBe('2 天前'))
    it('5 天后', () => expect(formatRelativeDay(farFuture, today, 'zh')).toBe('5 天后'))
  })

  describe('en', () => {
    it('Today', () => expect(formatRelativeDay(today, today, 'en')).toBe('Today'))
    it('Tomorrow', () => expect(formatRelativeDay(tomorrow, today, 'en')).toBe('Tomorrow'))
    it('in N days', () => expect(formatRelativeDay(dayAfter, today, 'en')).toBe('in 2 days'))
    it('Yesterday', () => expect(formatRelativeDay(yesterday, today, 'en')).toBe('Yesterday'))
    it('N days ago', () => expect(formatRelativeDay(twoDaysAgo, today, 'en')).toBe('2 days ago'))
    it('in 5 days', () => expect(formatRelativeDay(farFuture, today, 'en')).toBe('in 5 days'))
  })
})
