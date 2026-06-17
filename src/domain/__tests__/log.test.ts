import { describe, it, expect } from 'vitest'
import type { CalendarEvent } from '@/domain/event'
import type { Todo } from '@/domain/todo'
import {
  computeWeekTimeline,
  computeDaySummary,
  fmtDurationCompact,
} from '@/domain/log'

// ── Helpers ────────────────────────────────────────────────

function makeEvent(overrides: Partial<CalendarEvent> & { id: string; startTime: number; endTime: number }): CalendarEvent {
  return {
    title: 'test',
    color: 'accent',
    categoryId: 'accent',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function makeTodo(overrides: Partial<Todo> & { id: string }): Todo {
  return {
    title: 'test todo',
    description: '',
    status: 'done',
    priority: 'medium',
    sortOrder: 0,
    dueDate: null,
    projectId: null,
    categoryId: null,
    domain: null,
    createdAt: 0,
    updatedAt: 0,
    completedAt: null,
    repeatPattern: null,
    goalId: null,
    ...overrides,
  }
}

// ── 周一 2025-03-03 ─────────────────────────────────────
const MONDAY_TS = new Date(2025, 2, 3).getTime() // Mon Mar 3 2025
const TUESDAY_TS = new Date(2025, 2, 4).getTime()

// ── Tests ─────────────────────────────────────────────────

describe('fmtDurationCompact', () => {
  it('formats hours', () => {
    expect(fmtDurationCompact(7_200_000)).toBe('2.0h') // 2 hours
  })

  it('formats minutes', () => {
    expect(fmtDurationCompact(1_800_000)).toBe('30m')   // 30 min
  })

  it('formats 0', () => {
    expect(fmtDurationCompact(0)).toBe('0m')
  })
})

describe('computeWeekTimeline', () => {
  const weekStart = MONDAY_TS

  it('returns 7 days with correct structure', () => {
    const result = computeWeekTimeline([], [], weekStart)

    expect(result.days).toHaveLength(7)
    expect(result.weekStart).toBe(weekStart)
    expect(result.weekLabel).toContain('3月3日')
    expect(result.days[0].dateTs).toBe(weekStart)
    expect(result.days[6].dateTs).toBe(weekStart + 6 * 86_400_000)
  })

  it('distributes events to correct days', () => {
    const eventMon = makeEvent({
      id: 'e1',
      startTime: MONDAY_TS + 9 * 3_600_000,  // Mon 09:00
      endTime: MONDAY_TS + 10 * 3_600_000,    // Mon 10:00
      categoryId: 'accent',
    })
    const eventTue = makeEvent({
      id: 'e2',
      startTime: TUESDAY_TS + 14 * 3_600_000, // Tue 14:00
      endTime: TUESDAY_TS + 15 * 3_600_000,   // Tue 15:00
      categoryId: 'sage',
    })

    const result = computeWeekTimeline([eventMon, eventTue], [], weekStart)

    expect(result.days[0].events).toHaveLength(1)
    expect(result.days[0].events[0].id).toBe('e1')
    expect(result.days[1].events).toHaveLength(1)
    expect(result.days[1].events[0].id).toBe('e2')
  })

  it('distributes done todos to correct days', () => {
    const todoMon = makeTodo({
      id: 't1',
      completedAt: MONDAY_TS + 10 * 3_600_000, // Mon 10:00
    })
    const todoTue = makeTodo({
      id: 't2',
      completedAt: TUESDAY_TS + 10 * 3_600_000, // Tue 10:00
    })

    const result = computeWeekTimeline([], [todoMon, todoTue], weekStart)

    expect(result.days[0].doneTodos).toHaveLength(1)
    expect(result.days[0].doneTodos[0].id).toBe('t1')
    expect(result.days[1].doneTodos).toHaveLength(1)
    expect(result.days[1].doneTodos[0].id).toBe('t2')
  })

  it('ignores done todos outside the week', () => {
    const prevWeek = makeTodo({ id: 't_prev', completedAt: MONDAY_TS - 86_400_000 })
    const nextWeek = makeTodo({ id: 't_next', completedAt: weekStart + 7 * 86_400_000 + 86_400_000 })

    const result = computeWeekTimeline([], [prevWeek, nextWeek], weekStart)

    for (const day of result.days) {
      expect(day.doneTodos).toHaveLength(0)
    }
  })

  it('computes totalMs and categoryMs correctly', () => {
    const event = makeEvent({
      id: 'e1',
      startTime: MONDAY_TS + 9 * 3_600_000,    // Mon 09:00
      endTime: MONDAY_TS + 11 * 3_600_000,      // Mon 11:00 (2 hours)
      categoryId: 'accent',
    })

    const result = computeWeekTimeline([event], [], weekStart)

    expect(result.days[0].totalMs).toBe(2 * 3_600_000)
    expect(result.days[0].categoryMs.get('accent')).toBe(2 * 3_600_000)
    expect(result.weekTotalMs).toBe(2 * 3_600_000)
  })

  it('handles empty week', () => {
    const result = computeWeekTimeline([], [], weekStart)

    for (const day of result.days) {
      expect(day.events).toHaveLength(0)
      expect(day.doneTodos).toHaveLength(0)
      expect(day.totalMs).toBe(0)
      expect(day.mealSummary.count).toBe(0)
      expect(day.hasSleep).toBe(false)
    }
    expect(result.weekTotalMs).toBe(0)
  })

  it('detects sleep and meals from event typedData', () => {
    const mealEvent = makeEvent({
      id: 'e1',
      startTime: MONDAY_TS + 12 * 3_600_000,
      endTime: MONDAY_TS + 12.5 * 3_600_000,
      categoryId: 'sand',
      typedKey: 'meal',
      typedData: { type: 'meal', mealOrder: 'lunch', foodTags: [], source: 'home' },
    })
    const sleepEvent = makeEvent({
      id: 'e2',
      startTime: MONDAY_TS + 23 * 3_600_000,
      endTime: MONDAY_TS + 31 * 3_600_000, // next day
      categoryId: 'stone',
      typedKey: 'sleep',
      typedData: { type: 'sleep', sleepType: 'main', bedtime: MONDAY_TS + 23 * 3_600_000, wakeTime: MONDAY_TS + 31 * 3_600_000 },
    })

    const result = computeWeekTimeline([mealEvent, sleepEvent], [], weekStart)

    expect(result.days[0].hasSleep).toBe(true)
    expect(result.days[0].mealSummary.count).toBe(1)
    expect(result.days[0].mealSummary.orders).toContain('lunch')
  })
})

describe('computeDaySummary', () => {
  it('returns correct summary for a day with data', () => {
    const event = makeEvent({
      id: 'e1',
      startTime: MONDAY_TS + 9 * 3_600_000,
      endTime: MONDAY_TS + 11 * 3_600_000,
      categoryId: 'accent',
      typedKey: 'meal',
      typedData: { type: 'meal', mealOrder: 'lunch', foodTags: [], source: 'home' },
    })

    const timeline = computeWeekTimeline([event], [], MONDAY_TS)
    const summary = computeDaySummary(timeline.days[0])

    expect(summary.hoursStr).toBe('2.0h')
    expect(summary.eventCount).toBe(1)
    expect(summary.doneCount).toBe(0)
    expect(summary.mealCount).toBe(1)
  })

  it('returns zeros for empty day', () => {
    const timeline = computeWeekTimeline([], [], MONDAY_TS)
    const summary = computeDaySummary(timeline.days[0])

    expect(summary.hoursStr).toBe('0m')
    expect(summary.eventCount).toBe(0)
    expect(summary.doneCount).toBe(0)
    expect(summary.mealCount).toBe(0)
  })
})
