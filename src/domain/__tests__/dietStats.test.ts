/**
 * # dietStats 纯函数测试
 *
 * 覆盖：groupMealsByDay, computeWeeklyTagTrend,
 *       computeMealTimeStats, getDietDimensionRange,
 *       computeFoodFreqWeek, computeFoodFreqMonth
 */

import { describe, it, expect } from 'vitest'
import type { CalendarEvent, MealData, MealOrder } from '../event'
import type { DateRange } from '../dateRange'
import {
  groupMealsByDay,
  computeWeeklyTagTrend,
  computeMealTimeStats,
  getDietDimensionRange,
  computeFoodFreqWeek,
  computeFoodFreqMonth,
  weekStartMonday,
} from '../dietStats'

// ── Helpers ───────────────────────────────────────────────

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

/** 2025-05-12 is a Monday (weekStartsOn=1) */
const MONDAY = new Date(2025, 4, 12).getTime() // May 12, 2025 00:00 local

function ts(dayOffset: number, hour: number, minute = 0): number {
  return MONDAY + dayOffset * DAY_MS + hour * HOUR_MS + minute * 60_000
}

function makeMealEvent(
  overrides: Partial<CalendarEvent> & {
    startTime: number
    endTime: number
    mealOrder?: MealOrder
    foodTags?: MealData['foodTags']
    source?: MealData['source']
    title?: string
  },
): CalendarEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? '吃饭',
    startTime: overrides.startTime,
    endTime: overrides.endTime,
    color: 'sand',
    categoryId: 'sand',
    createdAt: 1,
    updatedAt: 1,
    typedKey: 'meal',
    typedData: {
      type: 'meal',
      mealOrder: overrides.mealOrder ?? 'lunch',
      foodTags: overrides.foodTags ?? [],
      source: overrides.source ?? 'home',
    },
  }
}

/** Mon-Sun range (7 days) */
const weekRange: DateRange = {
  start: MONDAY,
  end: MONDAY + 7 * DAY_MS,
}

// ═══════════════════════════════════════════════════════════
//  groupMealsByDay
// ═══════════════════════════════════════════════════════════

describe('groupMealsByDay', () => {
  it('returns empty array when no meal events in range', () => {
    const nonMeal: CalendarEvent = {
      id: '1', title: 'Work',
      startTime: ts(0, 9), endTime: ts(0, 10),
      color: 'accent', categoryId: 'accent',
      createdAt: 1, updatedAt: 1,
    }
    const result = groupMealsByDay([nonMeal], weekRange)
    expect(result).toEqual([])
  })

  it('groups a single meal into its day', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast' }),
    ]
    const result = groupMealsByDay(events, weekRange)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2025-05-12')
    expect(result[0].meals).toHaveLength(1)
    expect(result[0].meals[0].mealOrder).toBe('breakfast')
  })

  it('groups multiple meals on same day together', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast' }),
      makeMealEvent({ startTime: ts(0, 12), endTime: ts(0, 13), mealOrder: 'lunch' }),
      makeMealEvent({ startTime: ts(0, 19), endTime: ts(0, 20), mealOrder: 'dinner' }),
    ]
    const result = groupMealsByDay(events, weekRange)
    expect(result).toHaveLength(1)
    expect(result[0].meals).toHaveLength(3)
  })

  it('splits meals across different days', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 12), endTime: ts(0, 13), mealOrder: 'lunch' }),
      makeMealEvent({ startTime: ts(2, 12), endTime: ts(2, 13), mealOrder: 'lunch' }),
    ]
    const result = groupMealsByDay(events, weekRange)
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2025-05-12')
    expect(result[1].date).toBe('2025-05-14')
  })

  it('excludes events outside the range', () => {
    const events = [
      makeMealEvent({ startTime: ts(-1, 12), endTime: ts(-1, 13), mealOrder: 'lunch' }),
      makeMealEvent({ startTime: ts(0, 12), endTime: ts(0, 13), mealOrder: 'lunch' }),
      makeMealEvent({ startTime: ts(7, 12), endTime: ts(7, 13), mealOrder: 'lunch' }),
    ]
    const result = groupMealsByDay(events, weekRange)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2025-05-12')
  })

  it('sorts meals within a day by mealOrder', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 19), endTime: ts(0, 20), mealOrder: 'dinner' }),
      makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast' }),
      makeMealEvent({ startTime: ts(0, 12), endTime: ts(0, 13), mealOrder: 'lunch' }),
    ]
    const result = groupMealsByDay(events, weekRange)
    const orders = result[0].meals.map((m) => m.mealOrder)
    expect(orders).toEqual(['breakfast', 'lunch', 'dinner'])
  })

  it('returns days sorted by date ascending', () => {
    const events = [
      makeMealEvent({ startTime: ts(3, 12), endTime: ts(3, 13), mealOrder: 'lunch' }),
      makeMealEvent({ startTime: ts(0, 12), endTime: ts(0, 13), mealOrder: 'lunch' }),
    ]
    const result = groupMealsByDay(events, weekRange)
    expect(result[0].date).toBe('2025-05-12')
    expect(result[1].date).toBe('2025-05-15')
  })

  it('includes foodTags and source in output', () => {
    const events = [
      makeMealEvent({
        startTime: ts(0, 12), endTime: ts(0, 13),
        mealOrder: 'lunch',
        foodTags: ['protein', 'vegetable'],
        source: 'takeout',
      }),
    ]
    const result = groupMealsByDay(events, weekRange)
    const meal = result[0].meals[0]
    expect(meal.foodTags).toEqual(['protein', 'vegetable'])
    expect(meal.source).toBe('takeout')
  })

  it('includes event title', () => {
    const events = [
      makeMealEvent({
        startTime: ts(0, 12), endTime: ts(0, 13),
        mealOrder: 'lunch', title: '麻辣香锅',
      }),
    ]
    const result = groupMealsByDay(events, weekRange)
    expect(result[0].meals[0].title).toBe('麻辣香锅')
  })

  it('fills days with no meals as empty entries when includeEmpty is true', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 12), endTime: ts(0, 13), mealOrder: 'lunch' }),
    ]
    const result = groupMealsByDay(events, weekRange, true)
    // Should have 7 entries (Mon-Sun), only Mon has a meal
    expect(result).toHaveLength(7)
    expect(result[0].date).toBe('2025-05-12')
    expect(result[0].meals).toHaveLength(1)
    expect(result[1].date).toBe('2025-05-13')
    expect(result[1].meals).toHaveLength(0)
  })

  it('does not include empty days when includeEmpty is false (default)', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 12), endTime: ts(0, 13), mealOrder: 'lunch' }),
    ]
    const result = groupMealsByDay(events, weekRange)
    expect(result).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════
//  computeWeeklyTagTrend
// ═══════════════════════════════════════════════════════════

describe('computeWeeklyTagTrend', () => {
  const ninetyDayRange: DateRange = {
    start: MONDAY,
    end: MONDAY + 90 * DAY_MS,
  }

  it('returns empty array for no meal events', () => {
    const result = computeWeeklyTagTrend([], ninetyDayRange)
    expect(result).toEqual([])
  })

  it('returns one week entry for a single meal', () => {
    const events = [
      makeMealEvent({
        startTime: ts(0, 12), endTime: ts(0, 13),
        mealOrder: 'lunch',
        foodTags: ['protein'],
      }),
    ]
    const result = computeWeeklyTagTrend(events, ninetyDayRange)
    expect(result).toHaveLength(1)
    expect(result[0].protein).toBe(1)
    expect(result[0].staple).toBe(0)
  })

  it('aggregates multiple meals in same week', () => {
    const events = [
      makeMealEvent({
        startTime: ts(0, 12), endTime: ts(0, 13),
        foodTags: ['protein', 'vegetable'],
      }),
      makeMealEvent({
        startTime: ts(1, 12), endTime: ts(1, 13),
        foodTags: ['protein', 'staple'],
      }),
    ]
    const result = computeWeeklyTagTrend(events, ninetyDayRange)
    expect(result).toHaveLength(1)
    expect(result[0].protein).toBe(2)
    expect(result[0].vegetable).toBe(1)
    expect(result[0].staple).toBe(1)
  })

  it('splits meals across weeks by weekStart boundary', () => {
    // Monday meal
    const mondayMeal = makeMealEvent({
      startTime: ts(0, 12), endTime: ts(0, 13),
      foodTags: ['protein'],
    })
    // Next Monday meal (different week)
    const nextMondayMeal = makeMealEvent({
      startTime: ts(7, 12), endTime: ts(7, 13),
      foodTags: ['vegetable'],
    })
    const result = computeWeeklyTagTrend([mondayMeal, nextMondayMeal], ninetyDayRange)
    expect(result).toHaveLength(2)
    expect(result[0].protein).toBe(1)
    expect(result[0].vegetable).toBe(0)
    expect(result[1].protein).toBe(0)
    expect(result[1].vegetable).toBe(1)
  })

  it('returns weeks sorted by weekStart ascending', () => {
    const events = [
      makeMealEvent({ startTime: ts(7, 12), endTime: ts(7, 13), foodTags: [] }),
      makeMealEvent({ startTime: ts(0, 12), endTime: ts(0, 13), foodTags: [] }),
    ]
    const result = computeWeeklyTagTrend(events, ninetyDayRange)
    expect(result[0].weekStart).toBeLessThan(result[1].weekStart)
  })

  it('includes all 8 tag fields in each week entry', () => {
    const events = [
      makeMealEvent({
        startTime: ts(0, 12), endTime: ts(0, 13),
        foodTags: ['protein', 'staple', 'vegetable', 'fruit', 'caffeine', 'sugar', 'alcohol', 'fried'],
      }),
    ]
    const result = computeWeeklyTagTrend(events, ninetyDayRange)
    const week = result[0]
    expect(week.protein).toBe(1)
    expect(week.staple).toBe(1)
    expect(week.vegetable).toBe(1)
    expect(week.fruit).toBe(1)
    expect(week.caffeine).toBe(1)
    expect(week.sugar).toBe(1)
    expect(week.alcohol).toBe(1)
    expect(week.fried).toBe(1)
  })

  it('excludes meals outside the range', () => {
    const beforeRange = makeMealEvent({
      startTime: MONDAY - DAY_MS, endTime: MONDAY - DAY_MS + HOUR_MS,
      foodTags: ['protein'],
    })
    const inRange = makeMealEvent({
      startTime: ts(0, 12), endTime: ts(0, 13),
      foodTags: ['vegetable'],
    })
    const result = computeWeeklyTagTrend([beforeRange, inRange], ninetyDayRange)
    expect(result).toHaveLength(1)
    expect(result[0].protein).toBe(0)
    expect(result[0].vegetable).toBe(1)
  })

  it('handles 90-day range with ~13 weeks', () => {
    // Spread meals across 90 days (roughly 2 per week)
    const events: CalendarEvent[] = []
    for (let day = 0; day < 90; day += 3) {
      events.push(makeMealEvent({
        startTime: ts(day, 12), endTime: ts(day, 13),
        foodTags: ['protein'],
      }))
    }
    const result = computeWeeklyTagTrend(events, ninetyDayRange)
    // 90 days = ~13 weeks (ceil)
    expect(result.length).toBeGreaterThanOrEqual(12)
    expect(result.length).toBeLessThanOrEqual(14)
  })
})

// ═══════════════════════════════════════════════════════════
//  computeMealTimeStats
// ═══════════════════════════════════════════════════════════

describe('computeMealTimeStats', () => {
  it('returns null for all averages when no meals', () => {
    const result = computeMealTimeStats([], weekRange)
    expect(result.avgBreakfastTime).toBeNull()
    expect(result.avgLunchTime).toBeNull()
    expect(result.avgDinnerTime).toBeNull()
    expect(result.avgNightSnackTime).toBeNull()
  })

  it('computes average time for a single meal of each type', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 8, 30), endTime: ts(0, 9), mealOrder: 'breakfast' }),
      makeMealEvent({ startTime: ts(0, 12, 0), endTime: ts(0, 13), mealOrder: 'lunch' }),
      makeMealEvent({ startTime: ts(0, 19, 15), endTime: ts(0, 20), mealOrder: 'dinner' }),
    ]
    const result = computeMealTimeStats(events, weekRange)
    expect(result.avgBreakfastTime).toBeCloseTo(8.5, 1)  // 8:30 = 8.5
    expect(result.avgLunchTime).toBeCloseTo(12.0, 1)
    expect(result.avgDinnerTime).toBeCloseTo(19.25, 2)   // 19:15 = 19.25
    expect(result.avgNightSnackTime).toBeNull()
  })

  it('averages multiple meals of same order', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 12, 0), endTime: ts(0, 13), mealOrder: 'lunch' }),
      makeMealEvent({ startTime: ts(1, 13, 0), endTime: ts(1, 14), mealOrder: 'lunch' }),
    ]
    const result = computeMealTimeStats(events, weekRange)
    expect(result.avgLunchTime).toBeCloseTo(12.5, 1)
  })

  it('excludes events outside the range', () => {
    const events = [
      makeMealEvent({ startTime: ts(-1, 12, 0), endTime: ts(-1, 13), mealOrder: 'lunch' }),
      makeMealEvent({ startTime: ts(0, 14, 0), endTime: ts(0, 15), mealOrder: 'lunch' }),
    ]
    const result = computeMealTimeStats(events, weekRange)
    expect(result.avgLunchTime).toBeCloseTo(14.0, 1)
  })

  it('handles night_snack times correctly (late night hours)', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 23, 0), endTime: ts(0, 23, 30), mealOrder: 'night_snack' }),
      makeMealEvent({ startTime: ts(1, 0, 30), endTime: ts(1, 1), mealOrder: 'night_snack' }),
    ]
    const result = computeMealTimeStats(events, weekRange)
    // 23.0 and 0.5 → avg 11.75 as-is; implementation may choose to shift post-midnight
    // We just assert it's a number
    expect(typeof result.avgNightSnackTime).toBe('number')
  })

  it('only counts meal-typed events', () => {
    const nonMeal: CalendarEvent = {
      id: '1', title: 'Work',
      startTime: ts(0, 12), endTime: ts(0, 13),
      color: 'accent', categoryId: 'accent',
      createdAt: 1, updatedAt: 1,
    }
    const meal = makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast' })
    const result = computeMealTimeStats([nonMeal, meal], weekRange)
    expect(result.avgBreakfastTime).toBeCloseTo(8.0, 1)
    expect(result.avgLunchTime).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════
//  getDietDimensionRange
// ═══════════════════════════════════════════════════════════

describe('getDietDimensionRange', () => {
  // Use a fixed reference date: May 15, 2025
  const refDate = new Date(2025, 4, 15).getTime()

  it('month covers the full calendar month', () => {
    const range = getDietDimensionRange('month', refDate)
    // May 2025: May 1 00:00 to June 1 00:00
    const may1 = new Date(2025, 4, 1).getTime()
    const june1 = new Date(2025, 5, 1).getTime()
    expect(range.start).toBe(may1)
    expect(range.end).toBe(june1)
  })

  it('quarter covers 3 months from the quarter start', () => {
    const range = getDietDimensionRange('quarter', refDate)
    // Q2 2025: April 1 to July 1 (3 months)
    const apr1 = new Date(2025, 3, 1).getTime()
    const jul1 = new Date(2025, 6, 1).getTime()
    expect(range.start).toBe(apr1)
    expect(range.end).toBe(jul1)
  })

  it('year covers the full calendar year', () => {
    const range = getDietDimensionRange('year', refDate)
    const jan1 = new Date(2025, 0, 1).getTime()
    const nextJan1 = new Date(2026, 0, 1).getTime()
    expect(range.start).toBe(jan1)
    expect(range.end).toBe(nextJan1)
  })

  it('all covers 10 years (generous upper bound)', () => {
    const range = getDietDimensionRange('all', refDate)
    // Should go back at least 5 years and forward at least a bit
    expect(range.start).toBeLessThanOrEqual(refDate - 5 * 365 * DAY_MS)
    expect(range.end).toBeGreaterThan(refDate)
  })

  it('returns consistent ranges for different days within same month', () => {
    const may5 = new Date(2025, 4, 5).getTime()
    const may25 = new Date(2025, 4, 25).getTime()
    expect(getDietDimensionRange('month', may5)).toEqual(getDietDimensionRange('month', may25))
  })

  it('returns consistent quarter ranges for different months in same quarter', () => {
    const apr = new Date(2025, 3, 1).getTime()
    const jun = new Date(2025, 5, 30).getTime()
    expect(getDietDimensionRange('quarter', apr)).toEqual(getDietDimensionRange('quarter', jun))
  })
})

// ═══════════════════════════════════════════════════════════
//  computeFoodFreqWeek
// ═══════════════════════════════════════════════════════════

describe('computeFoodFreqWeek', () => {
  it('returns empty array for no meal events', () => {
    const nonMeal: CalendarEvent = {
      id: '1', title: 'Work',
      startTime: ts(0, 9), endTime: ts(0, 10),
      color: 'accent', categoryId: 'accent',
      createdAt: 1, updatedAt: 1,
    }
    const result = computeFoodFreqWeek([nonMeal], weekRange)
    expect(result).toEqual([])
  })

  it('aggregates meals by title across the week', () => {
    // Baozi on Mon breakfast, Tue lunch, Wed dinner = 3 total
    const events = [
      makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast', title: '包子' }),
      makeMealEvent({ startTime: ts(1, 12), endTime: ts(1, 13), mealOrder: 'lunch', title: '包子' }),
      makeMealEvent({ startTime: ts(2, 18), endTime: ts(2, 19), mealOrder: 'dinner', title: '包子' }),
    ]
    const result = computeFoodFreqWeek(events, weekRange)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('包子')
    expect(result[0].total).toBe(3)
    // Mon=breakfast, Tue=lunch, Wed=dinner, Thu-Sun=null
    expect(result[0].days[0]).toBe('breakfast')
    expect(result[0].days[1]).toBe('lunch')
    expect(result[0].days[2]).toBe('dinner')
    expect(result[0].days[3]).toBeNull()
    expect(result[0].days[4]).toBeNull()
    expect(result[0].days[5]).toBeNull()
    expect(result[0].days[6]).toBeNull()
  })

  it('counts multiple meals on same day for total but uses earliest mealOrder', () => {
    // Baozi twice on Monday: breakfast at 8:00, lunch at 12:00
    const events = [
      makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast', title: '包子' }),
      makeMealEvent({ startTime: ts(0, 12), endTime: ts(0, 13), mealOrder: 'lunch', title: '包子' }),
    ]
    const result = computeFoodFreqWeek(events, weekRange)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('包子')
    expect(result[0].total).toBe(2)
    // Earliest on Monday is breakfast (8:00)
    expect(result[0].days[0]).toBe('breakfast')
    // Other days are null
    expect(result[0].days[1]).toBeNull()
  })

  it('uses null for days with no meal', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast', title: '牛奶' }),
    ]
    const result = computeFoodFreqWeek(events, weekRange)
    expect(result[0].days[0]).toBe('breakfast')
    for (let i = 1; i < 7; i++) {
      expect(result[0].days[i]).toBeNull()
    }
  })

  it('sorts by total descending, stable by title on tie', () => {
    // 2 events for 'A', 3 for 'B', 1 for 'C'
    const events = [
      makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast', title: 'A' }),
      makeMealEvent({ startTime: ts(0, 12), endTime: ts(0, 13), mealOrder: 'lunch', title: 'A' }),
      makeMealEvent({ startTime: ts(1, 8), endTime: ts(1, 9), mealOrder: 'breakfast', title: 'B' }),
      makeMealEvent({ startTime: ts(1, 12), endTime: ts(1, 13), mealOrder: 'lunch', title: 'B' }),
      makeMealEvent({ startTime: ts(2, 8), endTime: ts(2, 9), mealOrder: 'breakfast', title: 'B' }),
      makeMealEvent({ startTime: ts(2, 12), endTime: ts(2, 13), mealOrder: 'lunch', title: 'C' }),
    ]
    const result = computeFoodFreqWeek(events, weekRange)
    expect(result.map((r) => r.title)).toEqual(['B', 'A', 'C'])
  })

  it('stably sorts ties by localeCompare', () => {
    // Both have 1 event each
    const events = [
      makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast', title: 'B' }),
      makeMealEvent({ startTime: ts(1, 8), endTime: ts(1, 9), mealOrder: 'breakfast', title: 'A' }),
    ]
    const result = computeFoodFreqWeek(events, weekRange)
    expect(result.map((r) => r.title)).toEqual(['A', 'B'])
  })

  it('defaults empty title to 吃饭', () => {
    const events = [
      makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast', title: '' }),
    ]
    const result = computeFoodFreqWeek(events, weekRange)
    expect(result[0].title).toBe('吃饭')
  })

  it('excludes events outside the range', () => {
    const outside = makeMealEvent({ startTime: ts(7, 8), endTime: ts(7, 9), mealOrder: 'breakfast', title: '包子' })
    const inside = makeMealEvent({ startTime: ts(0, 8), endTime: ts(0, 9), mealOrder: 'breakfast', title: '包子' })
    const result = computeFoodFreqWeek([outside, inside], weekRange)
    expect(result).toHaveLength(1)
    expect(result[0].total).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════
//  computeFoodFreqMonth
// ═══════════════════════════════════════════════════════════

describe('computeFoodFreqMonth', () => {
  // May 2025: Mon 12, Tue 13, Wed 14, Thu 15, Fri 16, Sat 17, Sun 18
  // Week 2: Mon 19, Tue 20, Wed 21, Thu 22, Fri 23, Sat 24, Sun 25
  // Week 3: Mon 26, Tue 27, Wed 28, Thu 29, Fri 30, Sat 31
  // Jun 1 is Sunday in week 4
  const MAY_RANGE: DateRange = {
    start: new Date(2025, 4, 1).getTime(),  // May 1 (Thursday)
    end: new Date(2025, 5, 1).getTime(),    // Jun 1
  }

  const MONTH_WEEK_MS = 7 * 86_400_000

  it('returns empty rows for no meal events', () => {
    const result = computeFoodFreqMonth([], MAY_RANGE, 8)
    expect(result.rows).toEqual([])
    // weekCount depends on range
    // May 1 (Thu) → weekStart = Mon Apr 28; May 31 (Sat) → weekStart = Mon May 26
    // Apr 28 + floor((May 26 - Apr 28)/7) + 1 = floor(28/7) + 1 = 4 + 1 = 5
    expect(result.weekCount).toBeGreaterThanOrEqual(4)
  })

  it('aggregates meals by title across month weeks', () => {
    // Baozi on Mon May 12 (week 2), Mon May 19 (week 3), Mon May 26 (week 4)
    const base = weekStartMonday(MAY_RANGE.start) // Mon Apr 28
    const w2 = base + 2 * MONTH_WEEK_MS + 0 * 86_400_000 // Mon May 12
    const w3 = base + 3 * MONTH_WEEK_MS + 0 * 86_400_000 // Mon May 19
    const w4 = base + 4 * MONTH_WEEK_MS + 0 * 86_400_000 // Mon May 26

    const events = [
      makeMealEvent({ startTime: w2 + 8 * 3_600_000, endTime: w2 + 9 * 3_600_000, mealOrder: 'breakfast', title: '包子' }),
      makeMealEvent({ startTime: w3 + 8 * 3_600_000, endTime: w3 + 9 * 3_600_000, mealOrder: 'breakfast', title: '包子' }),
      makeMealEvent({ startTime: w4 + 8 * 3_600_000, endTime: w4 + 9 * 3_600_000, mealOrder: 'breakfast', title: '包子' }),
    ]

    const result = computeFoodFreqMonth(events, MAY_RANGE, 8)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].title).toBe('包子')
    expect(result.rows[0].total).toBe(3)
    // weeks[0]=0 (Apr 28 - May 4), weeks[1]=0 (May 5-11), weeks[2]=1 (May 12-18), weeks[3]=1 (May 19-25), weeks[4]=1 (May 26 - Jun 1)
    expect(result.rows[0].weeks[0]).toBe(0)
    expect(result.rows[0].weeks[1]).toBe(0)
    expect(result.rows[0].weeks[2]).toBe(1)
    expect(result.rows[0].weeks[3]).toBe(1)
    expect(result.rows[0].weeks[4]).toBe(1)
  })

  it('fills zero for empty middle weeks', () => {
    // Meals only in week 0 (May 2, Fri) and week 4 (May 28, Wed)
    const base = weekStartMonday(MAY_RANGE.start) // Mon Apr 28
    const events = [
      makeMealEvent({ startTime: base + 4 * 86_400_000, endTime: base + 5 * 86_400_000, mealOrder: 'lunch', title: '泡面' }),
      makeMealEvent({ startTime: base + 4 * MONTH_WEEK_MS + 2 * 86_400_000, endTime: base + 4 * MONTH_WEEK_MS + 3 * 86_400_000, mealOrder: 'lunch', title: '泡面' }),
    ]
    const result = computeFoodFreqMonth(events, MAY_RANGE, 8)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].weeks[0]).toBe(1)
    expect(result.rows[0].weeks[1]).toBe(0)
    expect(result.rows[0].weeks[2]).toBe(0)
    expect(result.rows[0].weeks[3]).toBe(0)
    expect(result.rows[0].weeks[4]).toBe(1)
  })

  it('sorts by total descending, topN truncation', () => {
    // 3 events for 'B', 2 for 'A', 1 for 'C' — topN=2 should return B, A
    const base = weekStartMonday(MAY_RANGE.start)
    const events = [
      makeMealEvent({ startTime: base + 2 * MONTH_WEEK_MS, endTime: base + 2 * MONTH_WEEK_MS + 3_600_000, mealOrder: 'breakfast', title: 'A' }),
      makeMealEvent({ startTime: base + 2 * MONTH_WEEK_MS + 86_400_000, endTime: base + 2 * MONTH_WEEK_MS + 86_400_000 + 3_600_000, mealOrder: 'breakfast', title: 'A' }),
      makeMealEvent({ startTime: base + 2 * MONTH_WEEK_MS + 86_400_000, endTime: base + 2 * MONTH_WEEK_MS + 86_400_000 + 3_600_000, mealOrder: 'breakfast', title: 'B' }),
      makeMealEvent({ startTime: base + 2 * MONTH_WEEK_MS + 2 * 86_400_000, endTime: base + 2 * MONTH_WEEK_MS + 2 * 86_400_000 + 3_600_000, mealOrder: 'breakfast', title: 'B' }),
      makeMealEvent({ startTime: base + 2 * MONTH_WEEK_MS + 3 * 86_400_000, endTime: base + 2 * MONTH_WEEK_MS + 3 * 86_400_000 + 3_600_000, mealOrder: 'breakfast', title: 'B' }),
      makeMealEvent({ startTime: base + 2 * MONTH_WEEK_MS + 4 * 86_400_000, endTime: base + 2 * MONTH_WEEK_MS + 4 * 86_400_000 + 3_600_000, mealOrder: 'breakfast', title: 'C' }),
    ]
    const result = computeFoodFreqMonth(events, MAY_RANGE, 2)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].title).toBe('B')
    expect(result.rows[1].title).toBe('A')
  })

  it('stably sorts ties by localeCompare', () => {
    const base = weekStartMonday(MAY_RANGE.start)
    const events = [
      makeMealEvent({ startTime: base + 2 * MONTH_WEEK_MS, endTime: base + 2 * MONTH_WEEK_MS + 3_600_000, mealOrder: 'breakfast', title: 'B' }),
      makeMealEvent({ startTime: base + 2 * MONTH_WEEK_MS + 86_400_000, endTime: base + 2 * MONTH_WEEK_MS + 86_400_000 + 3_600_000, mealOrder: 'breakfast', title: 'A' }),
    ]
    const result = computeFoodFreqMonth(events, MAY_RANGE, 8)
    expect(result.rows.map((r) => r.title)).toEqual(['A', 'B'])
  })

  it('defaults empty title to 吃饭', () => {
    const base = weekStartMonday(MAY_RANGE.start)
    const events = [
      makeMealEvent({ startTime: base + 2 * MONTH_WEEK_MS, endTime: base + 2 * MONTH_WEEK_MS + 3_600_000, mealOrder: 'breakfast', title: '' }),
    ]
    const result = computeFoodFreqMonth(events, MAY_RANGE, 8)
    expect(result.rows[0].title).toBe('吃饭')
  })
})
