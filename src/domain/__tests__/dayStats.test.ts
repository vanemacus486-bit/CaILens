import { describe, it, expect } from 'vitest'
import { computeDayStats } from '../stats'
import type { CalendarEvent } from '../event'
import type { Category } from '../category'

const MOCK_CATEGORIES: Category[] = [
  { id: 'accent', name: { zh: '主要矛盾', en: 'Core Focus' }, color: 'accent', weeklyBudget: 20, folders: [] },
  { id: 'sage', name: { zh: '次要矛盾', en: 'Support Tasks' }, color: 'sage', weeklyBudget: 10, folders: [] },
  { id: 'stone', name: { zh: '睡眠时长', en: 'Sleep' }, color: 'stone', weeklyBudget: 3, folders: [] },
]

// April 30, 2025 00:00 UTC → ms
const DAY_START = new Date('2025-04-30T00:00:00Z').getTime()
const DAY_END = new Date('2025-05-01T00:00:00Z').getTime()

describe('computeDayStats', () => {
  it('returns zero for empty events', () => {
    const result = computeDayStats([], MOCK_CATEGORIES, DAY_START, DAY_END)
    expect(result.totalMinutes).toBe(0)
    expect(result.byCategory.every((s) => s.minutes === 0)).toBe(true)
  })

  it('computes stats for events within a single day', () => {
    const events: CalendarEvent[] = [
      {
        id: '1', title: 'Work', startTime: new Date('2025-04-30T09:00:00Z').getTime(),
        endTime: new Date('2025-04-30T11:00:00Z').getTime(),
        color: 'accent', categoryId: 'accent', createdAt: 1, updatedAt: 1,
      },
      {
        id: '2', title: 'Meeting', startTime: new Date('2025-04-30T14:00:00Z').getTime(),
        endTime: new Date('2025-04-30T15:00:00Z').getTime(),
        color: 'stone', categoryId: 'stone', createdAt: 1, updatedAt: 1,
      },
    ]
    const result = computeDayStats(events, MOCK_CATEGORIES, DAY_START, DAY_END)
    expect(result.totalMinutes).toBe(180) // 120 + 60
    const accent = result.byCategory.find((s) => s.categoryId === 'accent')!
    expect(accent.minutes).toBe(120)
    const stone = result.byCategory.find((s) => s.categoryId === 'stone')!
    expect(stone.minutes).toBe(60)
  })

  it('clips events to day boundary', () => {
    const events: CalendarEvent[] = [
      {
        id: '1', title: 'Overnight', startTime: new Date('2025-04-29T22:00:00Z').getTime(),
        endTime: new Date('2025-04-30T02:00:00Z').getTime(),
        color: 'accent', categoryId: 'accent', createdAt: 1, updatedAt: 1,
      },
    ]
    const result = computeDayStats(events, MOCK_CATEGORIES, DAY_START, DAY_END)
    // Only 2 hours (midnight to 2am) should count
    expect(result.totalMinutes).toBe(120)
  })
})
