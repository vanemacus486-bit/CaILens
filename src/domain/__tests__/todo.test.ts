import { describe, it, expect } from 'vitest'
import {
  sortTodos,
  groupTodosByDueDate,
  groupTodosByCompletionDate,
  nextSortOrder,
  calcProjectProgress,
  TODO_PRIORITY_ORDER,
} from '../todo'
import type { Todo } from '../todo'

// ── Helpers ─────────────────────────────────────────

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: 'Test todo',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    sortOrder: 0,
    projectId: null,
    categoryId: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    ...overrides,
  }
}

// ── Tests ───────────────────────────────────────────

describe('sortTodos', () => {
  it('puts undone items before done items', () => {
    const done = makeTodo({ id: '1', status: 'done', sortOrder: 0 })
    const todo = makeTodo({ id: '2', status: 'todo', sortOrder: 1 })
    const sorted = sortTodos([done, todo])
    expect(sorted[0].id).toBe('2')
    expect(sorted[1].id).toBe('1')
  })

  it('sorts by sortOrder within same status', () => {
    const a = makeTodo({ id: '1', sortOrder: 5 })
    const b = makeTodo({ id: '2', sortOrder: 1 })
    const c = makeTodo({ id: '3', sortOrder: 3 })
    const sorted = sortTodos([a, b, c])
    expect(sorted.map((t) => t.id)).toEqual(['2', '3', '1'])
  })

  it('sorts by priority when sortOrder is equal', () => {
    const high = makeTodo({ id: '1', priority: 'high', sortOrder: 0 })
    const low = makeTodo({ id: '2', priority: 'low', sortOrder: 0 })
    const med = makeTodo({ id: '3', priority: 'medium', sortOrder: 0 })
    const sorted = sortTodos([low, high, med])
    expect(sorted.map((t) => t.id)).toEqual(['1', '3', '2'])
  })

  it('falls back to createdAt for tiebreaker', () => {
    const a = makeTodo({ id: '1', sortOrder: 0, priority: 'medium', createdAt: 200 })
    const b = makeTodo({ id: '2', sortOrder: 0, priority: 'medium', createdAt: 100 })
    const sorted = sortTodos([a, b])
    expect(sorted.map((t) => t.id)).toEqual(['2', '1'])
  })

  it('does not mutate the original array', () => {
    const original = [makeTodo({ id: '2', sortOrder: 2 }), makeTodo({ id: '1', sortOrder: 1 })]
    const originalIds = original.map((t) => t.id)
    sortTodos(original)
    expect(original.map((t) => t.id)).toEqual(originalIds)
  })

  it('handles empty array', () => {
    expect(sortTodos([])).toEqual([])
  })
})

describe('groupTodosByDueDate', () => {
  const now = new Date('2025-01-15T12:00:00Z').getTime()

  it('groups overdue items correctly', () => {
    const overdue = makeTodo({ dueDate: now - 86400000 })
    const result = groupTodosByDueDate([overdue], now)
    expect(result.overdue).toHaveLength(1)
    expect(result.today).toHaveLength(0)
    expect(result.future).toHaveLength(0)
    expect(result.noDate).toHaveLength(0)
  })

  it('groups today items correctly', () => {
    const today = makeTodo({ dueDate: now + 3600000 }) // still within today
    const result = groupTodosByDueDate([today], now)
    expect(result.today).toHaveLength(1)
    expect(result.overdue).toHaveLength(0)
  })

  it('groups future items correctly', () => {
    const future = makeTodo({ dueDate: now + 86400000 * 3 })
    const result = groupTodosByDueDate([future], now)
    expect(result.future).toHaveLength(1)
  })

  it('groups no-date items correctly', () => {
    const noDate = makeTodo({ dueDate: null })
    const result = groupTodosByDueDate([noDate], now)
    expect(result.noDate).toHaveLength(1)
  })

  it('handles mixed input', () => {
    const items = [
      makeTodo({ id: '1', dueDate: now - 86400000 }),
      makeTodo({ id: '2', dueDate: now + 3600000 }),
      makeTodo({ id: '3', dueDate: now + 86400000 * 5 }),
      makeTodo({ id: '4', dueDate: null }),
    ]
    const result = groupTodosByDueDate(items, now)
    expect(result.overdue).toHaveLength(1)
    expect(result.today).toHaveLength(1)
    expect(result.future).toHaveLength(1)
    expect(result.noDate).toHaveLength(1)
  })

  it('handles empty array', () => {
    const result = groupTodosByDueDate([], now)
    expect(result.overdue).toEqual([])
    expect(result.today).toEqual([])
    expect(result.future).toEqual([])
    expect(result.noDate).toEqual([])
  })
})

describe('nextSortOrder', () => {
  it('returns max + 1', () => {
    const todos = [
      makeTodo({ sortOrder: 0 }),
      makeTodo({ sortOrder: 5 }),
      makeTodo({ sortOrder: 3 }),
    ]
    expect(nextSortOrder(todos)).toBe(6)
  })

  it('returns 0 for empty array', () => {
    expect(nextSortOrder([])).toBe(0)
  })
})

describe('calcProjectProgress', () => {
  it('returns 0/0/0 for empty array', () => {
    const result = calcProjectProgress([])
    expect(result).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it('counts done items correctly', () => {
    const todos = [
      makeTodo({ id: '1', status: 'done' }),
      makeTodo({ id: '2', status: 'todo' }),
      makeTodo({ id: '3', status: 'done' }),
    ]
    const result = calcProjectProgress(todos)
    expect(result.done).toBe(2)
    expect(result.total).toBe(3)
    expect(result.percent).toBe(67) // 2/3 rounded
  })

  it('returns 100% when all done', () => {
    const todos = [
      makeTodo({ id: '1', status: 'done' }),
      makeTodo({ id: '2', status: 'done' }),
    ]
    expect(calcProjectProgress(todos).percent).toBe(100)
  })

  it('returns 0% when none done', () => {
    const todos = [
      makeTodo({ id: '1', status: 'todo' }),
      makeTodo({ id: '2', status: 'in_progress' }),
    ]
    expect(calcProjectProgress(todos).percent).toBe(0)
  })
})

describe('groupTodosByCompletionDate', () => {
  // Use fixed reference date: 2025-03-15T12:00:00Z
  const day1 = new Date('2025-03-15T10:00:00Z').getTime()  // March 15
  const day2 = new Date('2025-03-14T08:00:00Z').getTime()  // March 14
  const day3 = new Date('2025-03-13T22:00:00Z').getTime()  // March 13

  it('groups completed todos by completion date', () => {
    const todos = [
      makeTodo({ id: '1', status: 'done', completedAt: day1 }),
      makeTodo({ id: '2', status: 'done', completedAt: day2 }),
      makeTodo({ id: '3', status: 'done', completedAt: day1 }),
    ]
    const result = groupTodosByCompletionDate(todos)
    expect(result).toHaveLength(2) // 2 distinct days
    expect(result[0].todos).toHaveLength(2) // day1 has 2
    expect(result[1].todos).toHaveLength(1) // day2 has 1
  })

  it('sorts groups by date descending (most recent first)', () => {
    const todos = [
      makeTodo({ id: '1', status: 'done', completedAt: day3 }), // oldest
      makeTodo({ id: '2', status: 'done', completedAt: day1 }), // newest
    ]
    const result = groupTodosByCompletionDate(todos)
    expect(result[0].dateTs).toBeGreaterThan(result[1].dateTs)
  })

  it('sorts todos within a group by completedAt descending', () => {
    // Use midday timestamps to avoid timezone day-crossing issues
    const earlier = new Date('2025-03-15T11:00:00Z').getTime()
    const later = new Date('2025-03-15T13:00:00Z').getTime()
    const todos = [
      makeTodo({ id: '1', status: 'done', completedAt: earlier }),
      makeTodo({ id: '2', status: 'done', completedAt: later }),
    ]
    const result = groupTodosByCompletionDate(todos)
    expect(result).toHaveLength(1)
    expect(result[0].todos[0].id).toBe('2') // later first
    expect(result[0].todos[1].id).toBe('1') // earlier second
  })

  it('excludes non-done todos', () => {
    const todos = [
      makeTodo({ id: '1', status: 'done', completedAt: day1 }),
      makeTodo({ id: '2', status: 'todo', completedAt: day1 }),
      makeTodo({ id: '3', status: 'in_progress', completedAt: day1 }),
    ]
    const result = groupTodosByCompletionDate(todos)
    expect(result).toHaveLength(1)
    expect(result[0].todos).toHaveLength(1)
    expect(result[0].todos[0].id).toBe('1')
  })

  it('excludes done todos with null completedAt', () => {
    const todos = [
      makeTodo({ id: '1', status: 'done', completedAt: day1 }),
      makeTodo({ id: '2', status: 'done', completedAt: null }),
    ]
    const result = groupTodosByCompletionDate(todos)
    expect(result).toHaveLength(1)
    expect(result[0].todos).toHaveLength(1)
    expect(result[0].todos[0].id).toBe('1')
  })

  it('handles empty array', () => {
    expect(groupTodosByCompletionDate([])).toEqual([])
  })

  it('handles all non-done todos (returns empty)', () => {
    const todos = [
      makeTodo({ id: '1', status: 'todo' }),
      makeTodo({ id: '2', status: 'in_progress' }),
    ]
    expect(groupTodosByCompletionDate(todos)).toEqual([])
  })

  it('produces dateLabel in a readable format', () => {
    const todos = [makeTodo({ id: '1', status: 'done', completedAt: day1 })]
    const result = groupTodosByCompletionDate(todos)
    expect(result[0].dateLabel).toBeTruthy()
    expect(typeof result[0].dateLabel).toBe('string')
  })
})

describe('TODO_PRIORITY_ORDER', () => {
  it('has high > medium > low', () => {
    expect(TODO_PRIORITY_ORDER.high).toBeGreaterThan(TODO_PRIORITY_ORDER.medium)
    expect(TODO_PRIORITY_ORDER.medium).toBeGreaterThan(TODO_PRIORITY_ORDER.low)
  })
})
