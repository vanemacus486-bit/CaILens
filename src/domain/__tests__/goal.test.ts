import { describe, it, expect } from 'vitest'
import {
  sortGoals,
  getMainGoals,
  getChildren,
  nextGoalSortOrder,
  getDoneProjects,
  isActiveGoal,
  isProjectComplete,
} from '../goal'
import type { Goal } from '../goal'
import type { Todo } from '../todo'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    parentId: null,
    title: 'Test Goal',
    description: '',
    categoryId: null,
    status: 'active',
    sortOrder: 0,
    targetDate: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('sortGoals', () => {
  it('returns empty array for empty input', () => {
    expect(sortGoals([])).toEqual([])
  })

  it('sorts by sortOrder ascending', () => {
    const goals = [
      makeGoal({ id: 'a', sortOrder: 2 }),
      makeGoal({ id: 'b', sortOrder: 0 }),
      makeGoal({ id: 'c', sortOrder: 1 }),
    ]
    const sorted = sortGoals(goals)
    expect(sorted.map((g) => g.id)).toEqual(['b', 'c', 'a'])
  })

  it('does not mutate original array', () => {
    const goals = [
      makeGoal({ id: 'a', sortOrder: 2 }),
      makeGoal({ id: 'b', sortOrder: 0 }),
    ]
    const sorted = sortGoals(goals)
    expect(sorted.map((g) => g.id)).toEqual(['b', 'a'])
    expect(goals[0].id).toBe('a')
  })
})

describe('nextGoalSortOrder', () => {
  it('returns 0 for empty array', () => {
    expect(nextGoalSortOrder([])).toBe(0)
  })

  it('returns max + 1', () => {
    const siblings = [
      makeGoal({ sortOrder: 0 }),
      makeGoal({ sortOrder: 3 }),
      makeGoal({ sortOrder: 7 }),
    ]
    expect(nextGoalSortOrder(siblings)).toBe(8)
  })
})

describe('getMainGoals', () => {
  it('returns only parentId===null goals', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: null }),
      makeGoal({ id: 'b', parentId: 'parent' }),
      makeGoal({ id: 'c', parentId: null }),
    ]
    const main = getMainGoals(goals)
    expect(main.map((g) => g.id)).toEqual(['a', 'c'])
  })

  it('excludes archived goals', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: null }),
      makeGoal({ id: 'b', parentId: null, status: 'archived' }),
    ]
    const main = getMainGoals(goals)
    expect(main.map((g) => g.id)).toEqual(['a'])
  })

  it('excludes done goals', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: null }),
      makeGoal({ id: 'b', parentId: null, status: 'done' }),
    ]
    const main = getMainGoals(goals)
    expect(main.map((g) => g.id)).toEqual(['a'])
  })

  it('returns sorted by sortOrder', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: null, sortOrder: 2 }),
      makeGoal({ id: 'b', parentId: null, sortOrder: 0 }),
    ]
    const main = getMainGoals(goals)
    expect(main.map((g) => g.id)).toEqual(['b', 'a'])
  })
})

describe('getChildren', () => {
  it('returns direct children sorted by sortOrder', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: 'root' }),
      makeGoal({ id: 'b', parentId: 'root', sortOrder: 2 }),
      makeGoal({ id: 'c', parentId: 'other' }),
      makeGoal({ id: 'd', parentId: 'root', sortOrder: 1 }),
    ]
    const children = getChildren(goals, 'root')
    expect(children.map((g) => g.id)).toEqual(['a', 'd', 'b'])
  })

  it('excludes archived children', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: 'root' }),
      makeGoal({ id: 'b', parentId: 'root', status: 'archived' }),
    ]
    const children = getChildren(goals, 'root')
    expect(children.map((g) => g.id)).toEqual(['a'])
  })

  it('excludes done children', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: 'root' }),
      makeGoal({ id: 'b', parentId: 'root', status: 'done' }),
    ]
    const children = getChildren(goals, 'root')
    expect(children.map((g) => g.id)).toEqual(['a'])
  })

  it('returns empty if none match', () => {
    expect(getChildren([], 'root')).toEqual([])
  })
})

describe('isActiveGoal', () => {
  it('returns true for active', () => {
    expect(isActiveGoal(makeGoal({ status: 'active' }))).toBe(true)
  })

  it('returns false for done', () => {
    expect(isActiveGoal(makeGoal({ status: 'done' }))).toBe(false)
  })

  it('returns false for archived', () => {
    expect(isActiveGoal(makeGoal({ status: 'archived' }))).toBe(false)
  })
})

describe('getDoneProjects', () => {
  it('returns only parentId===null done goals', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: null, status: 'done', completedAt: 200 }),
      makeGoal({ id: 'b', parentId: null, status: 'active' }),
      makeGoal({ id: 'c', parentId: 'a', status: 'done' }),
      makeGoal({ id: 'd', parentId: null, status: 'archived' }),
    ]
    const done = getDoneProjects(goals)
    expect(done.map((g) => g.id)).toEqual(['a'])
  })

  it('sorts by completedAt descending', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: null, status: 'done', completedAt: 100 }),
      makeGoal({ id: 'b', parentId: null, status: 'done', completedAt: 300 }),
      makeGoal({ id: 'c', parentId: null, status: 'done', completedAt: 200 }),
    ]
    const done = getDoneProjects(goals)
    expect(done.map((g) => g.id)).toEqual(['b', 'c', 'a'])
  })

  it('goals without completedAt sort to end', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: null, status: 'done', completedAt: 100 }),
      makeGoal({ id: 'b', parentId: null, status: 'done' }),
      makeGoal({ id: 'c', parentId: null, status: 'done', completedAt: 200 }),
    ]
    const done = getDoneProjects(goals)
    expect(done.map((g) => g.id)).toEqual(['c', 'a', 'b'])
  })

  it('returns empty when no done projects', () => {
    expect(getDoneProjects([makeGoal({ status: 'active' })])).toEqual([])
  })
})

describe('isProjectComplete', () => {
  it('returns true when all subtree todos are done', () => {
    const goal = makeGoal({ id: 'root', parentId: null })
    const allGoals = [
      goal,
      makeGoal({ id: 'child', parentId: 'root' }),
    ]
    const allTodos: Todo[] = [
      { id: 't1', goalId: 'root', status: 'done', title: 'a', description: '', priority: 'medium', domain: null, dueDate: null, sortOrder: 0, projectId: null, categoryId: null, createdAt: 0, updatedAt: 0, completedAt: 1, repeatPattern: null },
      { id: 't2', goalId: 'child', status: 'done', title: 'b', description: '', priority: 'medium', domain: null, dueDate: null, sortOrder: 0, projectId: null, categoryId: null, createdAt: 0, updatedAt: 0, completedAt: 1, repeatPattern: null },
    ]
    expect(isProjectComplete(goal, allGoals, allTodos)).toBe(true)
  })

  it('returns false when any todo is not done', () => {
    const goal = makeGoal({ id: 'root', parentId: null })
    const allTodos: Todo[] = [
      { id: 't1', goalId: 'root', status: 'todo', title: 'a', description: '', priority: 'medium', domain: null, dueDate: null, sortOrder: 0, projectId: null, categoryId: null, createdAt: 0, updatedAt: 0, completedAt: null, repeatPattern: null },
    ]
    expect(isProjectComplete(goal, [], allTodos)).toBe(false)
  })

  it('returns false when no todos exist', () => {
    const goal = makeGoal({ id: 'root', parentId: null })
    expect(isProjectComplete(goal, [], [])).toBe(false)
  })
})
