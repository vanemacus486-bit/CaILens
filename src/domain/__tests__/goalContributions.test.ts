import { describe, it, expect } from 'vitest'
import {
  computeCompletionContributions,
  computeDurationContributions,
  computeContribStreak,
} from '../goalContributions'
import type { Todo } from '../todo'
import type { CalendarEvent } from '../event'

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: 'Test Todo',
    description: '',
    status: 'todo',
    priority: 'medium',
    domain: null,
    dueDate: null,
    sortOrder: 0,
    projectId: null,
    categoryId: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    repeatPattern: null,
    goalId: null,
    ...overrides,
  }
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: 'Test Event',
    startTime: now,
    endTime: now + 3_600_000,
    color: 'accent',
    categoryId: 'accent',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const DAY_MS = 86_400_000

describe('computeCompletionContributions', () => {
  const subIds = new Set(['goal-a'])

  it('returns empty map for no matching todos', () => {
    const result = computeCompletionContributions([], subIds, 0, Date.now())
    expect(result.size).toBe(0)
  })

  it('counts completed todos by local day', () => {
    const day1 = new Date(2025, 0, 1).getTime() // Jan 1 2025 local midnight
    const day2 = day1 + DAY_MS
    const todos = [
      makeTodo({ goalId: 'goal-a', status: 'done', completedAt: day1 + 3_600_000 }),
      makeTodo({ goalId: 'goal-a', status: 'done', completedAt: day1 + 7_200_000 }),
      makeTodo({ goalId: 'goal-a', status: 'done', completedAt: day2 + 3_600_000 }),
    ]
    const result = computeCompletionContributions(todos, subIds, day1, day2 + DAY_MS)
    expect(result.get(day1)).toBe(2)
    expect(result.get(day2)).toBe(1)
  })

  it('ignores todos not in subtreeIds', () => {
    const todos = [
      makeTodo({ goalId: 'other-goal', status: 'done', completedAt: 1000 }),
    ]
    const result = computeCompletionContributions(todos, subIds, 0, Date.now())
    expect(result.size).toBe(0)
  })

  it('ignores non-done todos', () => {
    const todos = [
      makeTodo({ goalId: 'goal-a', status: 'todo', completedAt: null }),
    ]
    const result = computeCompletionContributions(todos, subIds, 0, Date.now())
    expect(result.size).toBe(0)
  })

  it('filters by range', () => {
    const day1 = new Date(2025, 0, 1).getTime()
    const todos = [
      makeTodo({ goalId: 'goal-a', status: 'done', completedAt: day1 + 3_600_000 }), // inside
    ]
    const result = computeCompletionContributions(todos, subIds, day1 + DAY_MS, day1 + 2 * DAY_MS)
    expect(result.size).toBe(0) // outside range
  })
})

describe('computeDurationContributions', () => {
  const subIds = new Set(['goal-a'])

  it('returns empty map for no matching events', () => {
    const result = computeDurationContributions([], subIds, 0, Date.now())
    expect(result.size).toBe(0)
  })

  it('accumulates event hours by local day', () => {
    const day = new Date(2025, 0, 1).getTime()
    const events = [
      makeEvent({ goalId: 'goal-a', startTime: day + 3_600_000, endTime: day + 7_200_000 }), // 1 hour
    ]
    const result = computeDurationContributions(events, subIds, day, day + DAY_MS)
    expect(result.get(day)).toBeCloseTo(1.0, 1)
  })

  it('ignores events not in subtreeIds', () => {
    const events = [makeEvent({ goalId: 'other', startTime: 0, endTime: 3600000 })]
    const result = computeDurationContributions(events, subIds, 0, DAY_MS)
    expect(result.size).toBe(0)
  })

  it('splits multi-day event across days', () => {
    const day1 = new Date(2025, 0, 1).getTime()
    const day2 = day1 + DAY_MS
    // 3-hour event spanning midnight
    const events = [
      makeEvent({
        goalId: 'goal-a',
        startTime: day1 + 22 * 3_600_000, // 22:00 day1
        endTime: day2 + 1 * 3_600_000,    // 01:00 day2 = 3h total
      }),
    ]
    const result = computeDurationContributions(events, subIds, day1, day2 + DAY_MS)
    expect(result.get(day1)).toBeCloseTo(2.0, 1) // 22:00→00:00 = 2h on day1
    expect(result.get(day2)).toBeCloseTo(1.0, 1) // 00:00→01:00 = 1h on day2
  })
})

describe('computeContribStreak', () => {
  const DAY = 86_400_000
  const today = new Date(2025, 0, 15).getTime() // Jan 15, 2025

  it('returns zeros for empty map', () => {
    const result = computeContribStreak(new Map(), today)
    expect(result).toEqual({ currentStreak: 0, longestStreak: 0, activeDays: 0 })
  })

  it('computes activeDays from map size', () => {
    const map = new Map<number, number>([
      [today, 1],
      [today - DAY, 2],
    ])
    const result = computeContribStreak(map, today)
    expect(result.activeDays).toBe(2)
  })

  it('currentStreak counts consecutive days back from today', () => {
    const map = new Map<number, number>([
      [today, 1],
      [today - DAY, 1],
      [today - 2 * DAY, 1],
    ])
    const result = computeContribStreak(map, today)
    expect(result.currentStreak).toBe(3)
  })

  it('currentStreak does not break on today if no contribution today', () => {
    // Today has no contribution but yesterday through 3 days ago do
    const map = new Map<number, number>([
      [today - DAY, 1],
      [today - 2 * DAY, 1],
    ])
    const result = computeContribStreak(map, today)
    expect(result.currentStreak).toBe(2)
  })

  it('currentStreak breaks if gap exists', () => {
    const map = new Map<number, number>([
      [today, 1],
      [today - 2 * DAY, 1], // gap on yesterday
    ])
    const result = computeContribStreak(map, today)
    expect(result.currentStreak).toBe(1) // only today
  })

  it('longestStreak captures historical maximum', () => {
    const map = new Map<number, number>([
      [today - 10 * DAY, 1],
      [today - 11 * DAY, 1],
      [today - 12 * DAY, 1],
      [today, 1],
      [today - DAY, 1],
    ])
    const result = computeContribStreak(map, today)
    expect(result.longestStreak).toBe(3) // the 3-day block at -10 is longest
    expect(result.currentStreak).toBe(2) // today + yesterday
  })
})
