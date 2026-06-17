import { describe, it, expect } from 'vitest'
import { sortGoals, getMainGoals, getChildren, nextGoalSortOrder } from '../goal'
import type { Goal } from '../goal'

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

  it('returns empty if none match', () => {
    expect(getChildren([], 'root')).toEqual([])
  })
})
