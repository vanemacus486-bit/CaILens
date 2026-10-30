import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  computeYearDailyGrid,
  buildHeatmapGrid,
  getIntensityLevel,
  computeDailyStreak,
  computeStats,
} from '../YearHeatmap'
import type { DayCell } from '../YearHeatmap'
import type { CalendarEvent } from '@/domain/event'
import type { Category, CategoryId } from '@/domain/category'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

function makeCategories(): Category[] {
  return [
    { id: 'accent', name: '涓昏�鐭涚浘', color: 'accent', weeklyBudget: 20, folders: [] },
    { id: 'sage', name: '娆¤�鐭涚浘', color: 'sage', weeklyBudget: 10, folders: [] },
    { id: 'sand', name: '搴跺姟鏃堕棿', color: 'sand', weeklyBudget: 5, folders: [] },
    { id: 'sky', name: '涓�汉鎻愬崌', color: 'sky', weeklyBudget: 5, folders: [] },
    { id: 'rose', name: '浼戞伅濞变箰', color: 'rose', weeklyBudget: 5, folders: [] },
    { id: 'stone', name: '鐫＄湢鏃堕暱', color: 'stone', weeklyBudget: 3, folders: [] },
  ]
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    title: 'Test Event',
    startTime: new Date(2026, 0, 15, 9, 0).getTime(),
    endTime: new Date(2026, 0, 15, 11, 0).getTime(),
    color: 'accent',
    categoryId: 'accent',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

// 鈹€鈹€ computeYearDailyGrid 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

describe('computeYearDailyGrid', () => {
  it('returns 365 days for a non-leap year', () => {
    const categories = makeCategories()
    const days = computeYearDailyGrid([], categories, 2026)
    expect(days).toHaveLength(365)
  })

  it('returns 366 days for a leap year', () => {
    const categories = makeCategories()
    const days = computeYearDailyGrid([], categories, 2024)
    expect(days).toHaveLength(366)
  })

  it('all categories have zero hours with empty events', () => {
    const categories = makeCategories()
    const days = computeYearDailyGrid([], categories, 2026)
    for (const day of days) {
      for (const id of CATEGORY_IDS) {
        expect(day.byCategory[id]).toBe(0)
        expect(day.byRatio[id]).toBe(0)
      }
    }
  })

  it('computes correct hours for a single-day event', () => {
    const categories = makeCategories()
    const event = makeEvent({
      startTime: new Date(2026, 0, 15, 9, 0).getTime(), // 9:00
      endTime: new Date(2026, 0, 15, 11, 0).getTime(),   // 11:00
      categoryId: 'accent',
    })
    const days = computeYearDailyGrid([event], categories, 2026)
    // Jan 15 = day index 14 (0-based)
    expect(days[14].byCategory['accent']).toBeCloseTo(2, 1) // 2 hours
    expect(days[14].byCategory['sage']).toBe(0)
  })

  it('computes correct ratio based on weekly budget', () => {
    const categories = makeCategories()
    // accent weeklyBudget = 20 鈫?daily target = 20/7 鈮?2.857h
    // 2h event 鈫?ratio = 2 / 2.857 鈮?0.7
    const event = makeEvent({
      startTime: new Date(2026, 0, 15, 9, 0).getTime(),
      endTime: new Date(2026, 0, 15, 11, 0).getTime(),
      categoryId: 'accent',
    })
    const days = computeYearDailyGrid([event], categories, 2026)
    expect(days[14].byRatio['accent']).toBeCloseTo(2 / (20 / 7), 1)
  })

  it('handles zero weeklyBudget gracefully (ratio = 0)', () => {
    const categories = makeCategories()
    categories[0].weeklyBudget = 0
    const event = makeEvent({
      startTime: new Date(2026, 0, 15, 9, 0).getTime(),
      endTime: new Date(2026, 0, 15, 11, 0).getTime(),
      categoryId: 'accent',
    })
    const days = computeYearDailyGrid([event], categories, 2026)
    expect(days[14].byRatio['accent']).toBe(0)
  })

  it('splits a cross-midnight event across two days', () => {
    const categories = makeCategories()
    const event = makeEvent({
      startTime: new Date(2026, 0, 15, 22, 0).getTime(), // Jan 15, 22:00
      endTime: new Date(2026, 0, 16, 2, 0).getTime(),     // Jan 16, 02:00
      categoryId: 'accent',
    })
    const days = computeYearDailyGrid([event], categories, 2026)
    // Jan 15 (index 14): 22:00鈥?0:00 = 2h
    expect(days[14].byCategory['accent']).toBeCloseTo(2, 1)
    // Jan 16 (index 15): 00:00鈥?2:00 = 2h
    expect(days[15].byCategory['accent']).toBeCloseTo(2, 1)
  })

  it('filters events outside the year range', () => {
    const categories = makeCategories()
    const event = makeEvent({
      startTime: new Date(2025, 11, 31, 9, 0).getTime(),
      endTime: new Date(2025, 11, 31, 11, 0).getTime(),
      categoryId: 'accent',
    })
    const days = computeYearDailyGrid([event], categories, 2026)
    for (const day of days) {
      expect(day.byCategory['accent']).toBe(0)
    }
  })

  it('handles multiple categories on the same day', () => {
    const categories = makeCategories()
    const e1 = makeEvent({
      startTime: new Date(2026, 0, 15, 9, 0).getTime(),
      endTime: new Date(2026, 0, 15, 11, 0).getTime(),
      categoryId: 'accent',
    })
    const e2 = makeEvent({
      id: crypto.randomUUID(),
      startTime: new Date(2026, 0, 15, 10, 0).getTime(),
      endTime: new Date(2026, 0, 15, 12, 0).getTime(),
      categoryId: 'sage',
    })
    const days = computeYearDailyGrid([e1, e2], categories, 2026)
    expect(days[14].byCategory['accent']).toBeCloseTo(2, 1)
    expect(days[14].byCategory['sage']).toBeCloseTo(2, 1)
  })
})

// 鈹€鈹€ getIntensityLevel 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

describe('getIntensityLevel', () => {
  it('returns 0 for ratio <= 0', () => {
    expect(getIntensityLevel(0)).toBe(0)
    expect(getIntensityLevel(-0.5)).toBe(0)
  })

  it('returns 1 for 0 < ratio < 0.1', () => {
    expect(getIntensityLevel(0.01)).toBe(1)
    expect(getIntensityLevel(0.09)).toBe(1)
  })

  it('returns 2 for 0.1 <= ratio < 0.25', () => {
    expect(getIntensityLevel(0.1)).toBe(2)
    expect(getIntensityLevel(0.24)).toBe(2)
  })

  it('returns 3 for 0.25 <= ratio < 0.5', () => {
    expect(getIntensityLevel(0.25)).toBe(3)
    expect(getIntensityLevel(0.49)).toBe(3)
  })

  it('returns 4 for ratio >= 1.5', () => {
    expect(getIntensityLevel(1.5)).toBe(4)
    expect(getIntensityLevel(2.0)).toBe(4)
    expect(getIntensityLevel(10)).toBe(4)
  })
})

// 鈹€鈹€ computeDailyStreak 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

describe('computeDailyStreak', () => {
  function makeDaysWithStreak(data: Array<{ accent: number }>): DayCell[] {
    const emptyDay = (): DayCell => {
      const bc: Record<string, number> = {}
      const br: Record<string, number> = {}
      for (const id of CATEGORY_IDS) { bc[id] = 0; br[id] = 0 }
      return { byCategory: bc as Record<CategoryId, number>, byRatio: br as Record<CategoryId, number> }
    }
    return data.map((d) => {
      const day = emptyDay()
      if (d.accent > 0) {
        day.byCategory['accent'] = d.accent
        day.byRatio['accent'] = d.accent / (20 / 7)
      }
      return day
    })
  }

  it('returns streak count of consecutive non-zero days ending at today', () => {
    // 10 days all with data, today is the 10th day
    const jan1 = new Date(2026, 0, 1).getTime()
    const now = jan1 + 9 * 24 * 60 * 60_000 + 12 * 60 * 60_000 // Jan 10, 12:00
    const data = Array.from({ length: 10 }, () => ({ accent: 2 }))
    const days = makeDaysWithStreak(data)
    const streak = computeDailyStreak(days, 'accent', now)
    expect(streak).toBe(10)
  })

  it('breaks streak at first zero day', () => {
    const jan1 = new Date(2026, 0, 1).getTime()
    const now = jan1 + 9 * 24 * 60 * 60_000 + 12 * 60 * 60_000 // Jan 10
    const data = Array.from({ length: 10 }, (_, i) => ({ accent: i === 5 ? 0 : 2 })) // Jan 6 has zero
    const days = makeDaysWithStreak(data)
    const streak = computeDailyStreak(days, 'accent', now)
    expect(streak).toBe(4) // Jan 10,9,8,7 = 4 days
  })

  it('returns 0 when today itself has zero hours', () => {
    const jan1 = new Date(2026, 0, 1).getTime()
    const now = jan1 + 9 * 24 * 60 * 60_000 + 12 * 60 * 60_000 // Jan 10
    const data = Array.from({ length: 10 }, (_, i) => ({ accent: i === 9 ? 0 : 2 })) // today = zero
    const days = makeDaysWithStreak(data)
    const streak = computeDailyStreak(days, 'accent', now)
    expect(streak).toBe(0)
  })
})

// 鈹€鈹€ buildHeatmapGrid 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

describe('buildHeatmapGrid', () => {
  function emptyDay(): DayCell {
    const bc: Record<string, number> = {}
    const br: Record<string, number> = {}
    for (const id of CATEGORY_IDS) { bc[id] = 0; br[id] = 0 }
    return { byCategory: bc as Record<CategoryId, number>, byRatio: br as Record<CategoryId, number> }
  }

  function make365Days(): DayCell[] {
    return Array.from({ length: 365 }, () => emptyDay())
  }

  it('returns a grid with 7 rows', () => {
    const days = make365Days()
    const now = new Date(2026, 6, 1).getTime()
    const { grid } = buildHeatmapGrid(days, 'accent', 2026, now)
    expect(grid).toHaveLength(7)
  })

  it('has 52 or 53 columns depending on year start day', () => {
    const days = make365Days()
    const now = new Date(2026, 6, 1).getTime()
    const { grid, numWeeks } = buildHeatmapGrid(days, 'accent', 2026, now)
    expect(numWeeks).toBeGreaterThanOrEqual(52)
    expect(numWeeks).toBeLessThanOrEqual(53)
    // All rows should have same length
    for (let d = 0; d < 7; d++) {
      expect(grid[d].length).toBeGreaterThanOrEqual(52)
    }
  })

  it('marks future dates', () => {
    const days = make365Days()
    const now = new Date(2026, 0, 15).getTime() // Jan 15 鈥?most of the year is future
    const { grid } = buildHeatmapGrid(days, 'accent', 2026, now)
    const allCells = grid.flat().filter((c): c is NonNullable<typeof c> => c !== null)
    const futureCells = allCells.filter((c) => c.isFuture)
    expect(futureCells.length).toBeGreaterThan(200)
  })

  it('produces month labels', () => {
    const days = make365Days()
    const now = new Date(2026, 6, 1).getTime()
    const { monthLabels } = buildHeatmapGrid(days, 'accent', 2026, now)
    expect(monthLabels.length).toBeGreaterThanOrEqual(12)
    expect(monthLabels[0].colIndex).toBe(2) // first month label at column 2
  })

  it('cells reference correct dates within the year', () => {
    const days = make365Days()
    const now = new Date(2026, 6, 1).getTime()
    const { grid } = buildHeatmapGrid(days, 'accent', 2026, now)
    const allCells = grid.flat().filter((c): c is NonNullable<typeof c> => c !== null)
    const year2026 = allCells.filter(
      (c) => c.date.getFullYear() === 2026 && !c.isFuture,
    )
    // Should have Jan 1 through Jul 1 at minimum
    expect(year2026.length).toBeGreaterThan(150)
  })
})

// 鈹€鈹€ computeStats 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

describe('computeStats', () => {
  function emptyDay(): DayCell {
    const bc: Record<string, number> = {}
    const br: Record<string, number> = {}
    for (const id of CATEGORY_IDS) { bc[id] = 0; br[id] = 0 }
    return { byCategory: bc as Record<CategoryId, number>, byRatio: br as Record<CategoryId, number> }
  }

  function dayWithHours(hours: number): DayCell {
    const day = emptyDay()
    day.byCategory['accent'] = hours
    day.byRatio['accent'] = hours / (20 / 7)
    return day
  }

  it('computes cumulative hours', () => {
    const days = [dayWithHours(2), dayWithHours(3), dayWithHours(1)]
    const now = new Date(2026, 0, 3, 12, 0).getTime()
    const stats = computeStats(days, 'accent', now)
    expect(stats.cumulative).toBeCloseTo(6, 1)
  })

  it('computes daily average over active days only', () => {
    const days = [dayWithHours(2), emptyDay(), dayWithHours(4)]
    const now = new Date(2026, 0, 3, 12, 0).getTime()
    const stats = computeStats(days, 'accent', now)
    expect(stats.dailyAvg).toBeCloseTo(3, 1) // 6h / 2 active days
  })

  it('finds best day', () => {
    const days = [dayWithHours(2), dayWithHours(8), dayWithHours(1)]
    const now = new Date(2026, 0, 3, 12, 0).getTime()
    const stats = computeStats(days, 'accent', now)
    expect(stats.bestDay).not.toBeNull()
    expect(stats.bestDay!.hours).toBeCloseTo(8, 1)
  })

  it('returns null bestDay with no data', () => {
    const days = [emptyDay(), emptyDay()]
    const now = new Date(2026, 0, 2, 12, 0).getTime()
    const stats = computeStats(days, 'accent', now)
    expect(stats.bestDay).toBeNull()
  })
})

// 鈹€鈹€ Component tests 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

describe('YearHeatmap component', () => {
  it('renders without crashing with empty data', async () => {
    const { YearHeatmap } = await import('../YearHeatmap')
    const categories = makeCategories()
    const now = Date.now()
    const { container } = render(
      <YearHeatmap selectedId="accent" onCategoryChange={()=>{}} viewMode="roll" onViewModeChange={()=>{}} rangeEvents={[]} categories={categories} language="zh" now={now} />,
    )
    // Should render without crashing
    expect(container.querySelector('.year-heatmap-root')).not.toBeNull()
  })

  it('renders the heatmap grid with cells', async () => {
    const { YearHeatmap } = await import('../YearHeatmap')
    const categories = makeCategories()
    const event = makeEvent({
      startTime: new Date(2026, 0, 1, 9, 0).getTime(),
      endTime: new Date(2026, 0, 1, 10, 0).getTime(),
      categoryId: 'accent',
    })
    const { container } = render(
      <YearHeatmap selectedId="accent" onCategoryChange={()=>{}} viewMode="roll" onViewModeChange={()=>{}} rangeEvents={[event]} categories={categories} language="zh" />,
    )
    // Should have heatmap cells
    const cells = container.querySelectorAll('.heatmap-cell')
    expect(cells.length).toBeGreaterThan(300)
  })

  it('marks today cell', async () => {
    const { YearHeatmap } = await import('../YearHeatmap')
    const categories = makeCategories()
    const now = Date.now()
    const todayDate = new Date(now)
    // Event today from 9-10am
    const event = makeEvent({
      startTime: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 9, 0).getTime(),
      endTime: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 10, 0).getTime(),
      categoryId: 'accent',
    })
    const { container } = render(
      <YearHeatmap selectedId="accent" onCategoryChange={()=>{}} viewMode="roll" onViewModeChange={()=>{}} rangeEvents={[event]} categories={categories} language="zh" now={now} />,
    )
    const todayCell = container.querySelector('.cell-today')
    expect(todayCell).not.toBeNull()
  })

})
