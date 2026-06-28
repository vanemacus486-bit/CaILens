import { describe, it, expect } from 'vitest'
import {
  sortTodos,
  groupTodosByDueDate,
  groupTodosByCompletionDate,
  groupTodosByWeekDays,
  nextSortOrder,
  calcProjectProgress,
  TODO_PRIORITY_ORDER,
  isRepeatingTodo,
  spawnNextRepeat,
  filterDoneTodosByDay,
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
    listId: 'default',
    dueDate: null,
    sortOrder: 0,
    projectId: null,
    categoryId: null,
    domain: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    repeatPattern: null,
    goalId: null,
    isStarred: false,
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

// ── groupTodosByWeekDays ────────────────────────────

describe('groupTodosByWeekDays', () => {
  // 以 2025-03-17（周一）为 weekStart，用本地时区构造时间戳
  const weekStart = new Date(2025, 2, 17).getTime() // Monday March 17, 2025 local midnight

  /** 创建指定本地日期的 completedAt 时间戳（当天 12:00） */
  function localTs(year: number, month: number, day: number, hour = 12): number {
    return new Date(year, month, day, hour, 0, 0).getTime()
  }

  it('groups active todos by dueDate into correct weekdays', () => {
    // days[] layout (Monday-first): 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
    const tueTodo = makeTodo({ id: '1', dueDate: localTs(2025, 2, 18) })   // Tuesday
    const friTodo = makeTodo({ id: '2', dueDate: localTs(2025, 2, 21) })   // Friday
    const result = groupTodosByWeekDays([tueTodo, friTodo], weekStart)

    // Tuesday → days[1]
    expect(result.days[1].activeTodos).toHaveLength(1)
    expect(result.days[1].activeTodos[0].id).toBe('1')
    // Friday → days[4]
    expect(result.days[4].activeTodos).toHaveLength(1)
    expect(result.days[4].activeTodos[0].id).toBe('2')
  })

  it('groups done todos by completedAt into correct weekdays', () => {
    const doneOnWed = makeTodo({
      id: '1', status: 'done',
      dueDate: localTs(2025, 2, 21),            // dueDate = Friday
      completedAt: localTs(2025, 2, 19),          // completedAt = Wednesday
    })
    const result = groupTodosByWeekDays([doneOnWed], weekStart)

    // 应该出现在 Wednesday (days[2])，而非 Friday (days[4])
    expect(result.days[2].doneTodos).toHaveLength(1)
    expect(result.days[2].doneTodos[0].id).toBe('1')
    expect(result.days[4].doneTodos).toHaveLength(0)
  })

  it('excludes done todos whose completedAt is outside current week', () => {
    const doneBeforeWeek = makeTodo({
      id: '1', status: 'done',
      completedAt: localTs(2025, 2, 14),          // Friday before the week
    })
    const doneAfterWeek = makeTodo({
      id: '2', status: 'done',
      completedAt: localTs(2025, 2, 24),          // Monday after the week
    })
    const doneInWeek = makeTodo({
      id: '3', status: 'done',
      completedAt: localTs(2025, 2, 19),          // Wednesday → days[2]
    })
    const result = groupTodosByWeekDays([doneBeforeWeek, doneAfterWeek, doneInWeek], weekStart)

    // 仅本周完成的出现在 days 中
    expect(result.days[2].doneTodos).toHaveLength(1)
    expect(result.days[2].doneTodos[0].id).toBe('3')
    // 其他天应该都没有
    for (const day of result.days) {
      const total = day.doneTodos.filter((t) => t.id === '1' || t.id === '2')
      expect(total).toHaveLength(0)
    }
  })

  it('handles done todos with dueDate: null (previously went to unscheduledTodos)', () => {
    const doneNoDue = makeTodo({
      id: '1', status: 'done',
      dueDate: null,
      completedAt: localTs(2025, 2, 20),          // Thursday → days[3]
    })
    const result = groupTodosByWeekDays([doneNoDue], weekStart)

    expect(result.days[3].doneTodos).toHaveLength(1)
    expect(result.days[3].doneTodos[0].id).toBe('1')
    expect(result.unscheduledTodos).toHaveLength(0)
  })

  it('skips done todos with null completedAt (defensive)', () => {
    const badTodo = makeTodo({ id: '1', status: 'done', completedAt: null })
    const result = groupTodosByWeekDays([badTodo], weekStart)
    // 不应出现在任何 day 或列表
    for (const day of result.days) {
      expect(day.doneTodos).toHaveLength(0)
      expect(day.activeTodos).toHaveLength(0)
    }
    expect(result.overdueTodos).toHaveLength(0)
    expect(result.unscheduledTodos).toHaveLength(0)
  })

  it('mixed: active + done todos each use their own date field', () => {
    const activeTue = makeTodo({ id: 'a', dueDate: localTs(2025, 2, 18) })  // Tuesday → days[1]
    const doneMon = makeTodo({
      id: 'd', status: 'done',
      dueDate: localTs(2025, 2, 21),              // due = Friday
      completedAt: localTs(2025, 2, 17),            // completed = Monday → days[0]
    })
    const result = groupTodosByWeekDays([activeTue, doneMon], weekStart)

    // activeTue → Tuesday (days[1]) activeTodos
    expect(result.days[1].activeTodos).toHaveLength(1)
    expect(result.days[1].activeTodos[0].id).toBe('a')
    // doneMon → Monday (days[0]) doneTodos
    expect(result.days[0].doneTodos).toHaveLength(1)
    expect(result.days[0].doneTodos[0].id).toBe('d')
  })

  it('active overdue and unscheduled still work correctly', () => {
    const overdue = makeTodo({ id: 'o', dueDate: localTs(2025, 2, 10) })   // before week
    const unscheduled = makeTodo({ id: 'u', dueDate: null })
    const result = groupTodosByWeekDays([overdue, unscheduled], weekStart)

    expect(result.overdueTodos).toHaveLength(1)
    expect(result.overdueTodos[0].id).toBe('o')
    expect(result.unscheduledTodos).toHaveLength(1)
    expect(result.unscheduledTodos[0].id).toBe('u')
  })

  it('handles empty array', () => {
    const result = groupTodosByWeekDays([], weekStart)
    expect(result.days).toHaveLength(7)
    for (const day of result.days) {
      expect(day.activeTodos).toEqual([])
      expect(day.doneTodos).toEqual([])
    }
    expect(result.overdueTodos).toEqual([])
    expect(result.unscheduledTodos).toEqual([])
  })

  it('sorts doneTodos within each day by completedAt descending', () => {
    const earlier = makeTodo({ id: '1', status: 'done', completedAt: localTs(2025, 2, 19, 10) })
    const later = makeTodo({ id: '2', status: 'done', completedAt: localTs(2025, 2, 19, 14) })
    const result = groupTodosByWeekDays([earlier, later], weekStart)

    // 同一天 (Wed = days[2])，later 应排在前面
    expect(result.days[2].doneTodos).toHaveLength(2)
    expect(result.days[2].doneTodos[0].id).toBe('2')
    expect(result.days[2].doneTodos[1].id).toBe('1')
  })

  it('does not mutate input array', () => {
    const input = [makeTodo({ id: '1', dueDate: localTs(2025, 2, 18) })]
    const copy = [...input]
    groupTodosByWeekDays(input, weekStart)
    expect(input).toEqual(copy)
  })
})

describe('TODO_PRIORITY_ORDER', () => {
  it('has high > medium > low', () => {
    expect(TODO_PRIORITY_ORDER.high).toBeGreaterThan(TODO_PRIORITY_ORDER.medium)
    expect(TODO_PRIORITY_ORDER.medium).toBeGreaterThan(TODO_PRIORITY_ORDER.low)
  })
})

// ── RepeatPattern ──────────────────────────────────────────

describe('isRepeatingTodo', () => {
  it('returns true for daily repeat todo', () => {
    const todo = makeTodo({ repeatPattern: 'daily' })
    expect(isRepeatingTodo(todo)).toBe(true)
  })

  it('returns false for null repeat pattern', () => {
    const todo = makeTodo({ repeatPattern: null })
    expect(isRepeatingTodo(todo)).toBe(false)
  })
})

describe('filterDoneTodosByDay', () => {
  const DAY = 86400000
  const day1 = new Date(2025, 2, 19).getTime() // Wednesday

  it('returns done todos on the given day sorted by completedAt desc', () => {
    const earlier = makeTodo({ id: '1', status: 'done', completedAt: day1 + 10 * 3_600_000 })
    const later = makeTodo({ id: '2', status: 'done', completedAt: day1 + 14 * 3_600_000 })
    const result = filterDoneTodosByDay([earlier, later], day1)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('2') // later first
    expect(result[1].id).toBe('1')
  })

  it('excludes non-done todos', () => {
    const todo = makeTodo({ id: '1', status: 'todo', completedAt: day1 + 10 * 3_600_000 })
    const done = makeTodo({ id: '2', status: 'done', completedAt: day1 + 10 * 3_600_000 })
    const result = filterDoneTodosByDay([todo, done], day1)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('excludes done todos from other days', () => {
    const todayTodo = makeTodo({ id: '1', status: 'done', completedAt: day1 + 10 * 3_600_000 })
    const yesterdayTodo = makeTodo({ id: '2', status: 'done', completedAt: day1 - DAY + 10 * 3_600_000 })
    const tomorrowTodo = makeTodo({ id: '3', status: 'done', completedAt: day1 + DAY + 10 * 3_600_000 })
    const result = filterDoneTodosByDay([todayTodo, yesterdayTodo, tomorrowTodo], day1)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('excludes done todos with null completedAt', () => {
    const badTodo = makeTodo({ id: '1', status: 'done', completedAt: null })
    const result = filterDoneTodosByDay([badTodo], day1)
    expect(result).toHaveLength(0)
  })

  it('returns empty array for empty input', () => {
    expect(filterDoneTodosByDay([], day1)).toEqual([])
  })
})

describe('spawnNextRepeat', () => {
  it('creates a clone with status todo and same title', () => {
    const todo = makeTodo({ repeatPattern: 'daily', sortOrder: 5 })
    const now = Date.now()
    const spawned = spawnNextRepeat(todo, now)
    expect(spawned.status).toBe('todo')
    expect(spawned.title).toBe(todo.title)
    expect(spawned.repeatPattern).toBe('daily')
    expect(spawned.sortOrder).toBe(5)
    expect(spawned.id).not.toBe(todo.id)
    expect(spawned.completedAt).toBe(null)
    expect(spawned.dueDate).toBe(null)
  })

  it('preserves projectId and categoryId', () => {
    const todo = makeTodo({
      repeatPattern: 'daily',
      projectId: 'proj-1',
      categoryId: 'accent',
    })
    const spawned = spawnNextRepeat(todo)
    expect(spawned.projectId).toBe('proj-1')
    expect(spawned.categoryId).toBe('accent')
  })

  it('does not mutate original todo', () => {
    const todo = makeTodo({ repeatPattern: 'daily' })
    spawnNextRepeat(todo)
    expect(todo.status).toBe('todo')
  })
})

describe('sortTodos with repeating todos', () => {
  it('sorts repeating todos alongside normal todos by sortOrder', () => {
    const normal = makeTodo({ id: '1', sortOrder: 1 })
    const repeating = makeTodo({ id: '2', repeatPattern: 'daily', sortOrder: 2 })
    const sorted = sortTodos([repeating, normal])
    expect(sorted.map(t => t.id)).toEqual(['1', '2'])
  })
})
