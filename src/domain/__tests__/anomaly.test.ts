/**
 * Tests for domain/anomaly.ts — 本地异常检测
 */

import { describe, it, expect } from 'vitest'
import { detectAnomalies, type Anomaly } from '@/domain/anomaly'
import type { CalendarEvent } from '@/domain/event'
import type { Todo } from '@/domain/todo'

const DAY = new Date(2026, 7, 3).getTime() // 2026-08-03 00:00

function makeEvent(start: number, end: number, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: `ev-${start}`,
    title: 'ev',
    startTime: start,
    endTime: end,
    color: overrides.categoryId ?? 'accent',
    categoryId: overrides.categoryId ?? 'accent',
    createdAt: start,
    updatedAt: start,
    ...overrides,
  }
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 't1',
    listId: 'default',
    title: 'T',
    description: '',
    status: 'todo',
    priority: 'medium',
    domain: null,
    dueDate: null,
    sortOrder: 0,
    projectId: null,
    categoryId: null,
    createdAt: DAY,
    updatedAt: DAY,
    deletedAt: null,
    completedAt: null,
    repeatPattern: null,
    goalId: null,
    isStarred: false,
    archivedAt: null,
    ...overrides,
  }
}

describe('detectAnomalies', () => {
  it('flags short sleep', () => {
    const sleep = makeEvent(DAY + 23 * 3600_000, DAY + 24 * 3600_000, { typedKey: 'sleep', categoryId: 'stone', title: '睡眠' })
    const anomalies = detectAnomalies([sleep], [], DAY, 'zh')
    const kinds = anomalies.map((a: Anomaly) => a.kind)
    expect(kinds).toContain('sleep')
    expect(anomalies.find((a) => a.kind === 'sleep')?.summary).toContain('睡眠不足')
  })

  it('clips a cross-day sleep event to the day segment', () => {
    // 跨天单条 23:00–次日 07:00：当日段 1h → 报睡眠不足；次日段 7h → 不报
    const crossDay = makeEvent(DAY + 23 * 3600_000, DAY + 31 * 3600_000, { typedKey: 'sleep', categoryId: 'stone' })
    const day1 = detectAnomalies([crossDay], [], DAY, 'zh')
    const day2 = detectAnomalies([crossDay], [], DAY + 24 * 3600_000, 'zh')
    expect(day1.some((a) => a.kind === 'sleep')).toBe(true)
    expect(day2.some((a) => a.kind === 'sleep')).toBe(false)
  })

  it('does not flag adequate sleep', () => {
    const sleep = makeEvent(DAY, DAY + 8 * 3600_000, { typedKey: 'sleep', categoryId: 'stone' })
    expect(detectAnomalies([sleep], [], DAY, 'zh')).toEqual([])
  })

  it('flags a long work block as sedentary', () => {
    const work = makeEvent(DAY + 9 * 3600_000, DAY + 14 * 3600_000, { title: '大块工作', categoryId: 'accent' })
    const anomalies = detectAnomalies([work], [], DAY, 'zh')
    expect(anomalies.some((a) => a.kind === 'sedentary')).toBe(true)
  })

  it('flags overdue todos', () => {
    const overdue = makeTodo({ dueDate: DAY - 24 * 3600_000, title: '旧任务' })
    const anomalies = detectAnomalies([], [overdue], DAY, 'zh')
    expect(anomalies.some((a) => a.kind === 'overdue' && a.summary.includes('旧任务'))).toBe(true)
  })

  it('ignores non-overdue todos and future events', () => {
    const todo = makeTodo({ dueDate: DAY + 24 * 3600_000 })
    const future = makeEvent(DAY + 48 * 3600_000, DAY + 49 * 3600_000, { categoryId: 'accent' })
    expect(detectAnomalies([future], [todo], DAY, 'zh')).toEqual([])
  })

  it('renders English summaries for non-zh', () => {
    const sleep = makeEvent(DAY, DAY + 5 * 3600_000, { typedKey: 'sleep', categoryId: 'stone' })
    const anomalies = detectAnomalies([sleep], [], DAY, 'en')
    expect(anomalies[0].summary).toContain('Not enough sleep')
  })
})
