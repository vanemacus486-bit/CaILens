import { describe, it, expect } from 'vitest'
import {
  buildGoalForest,
  buildGoalTree,
  flattenSubtreeIds,
  computeGoalProgress,
  computeChildrenProgress,
} from '../goalTree'
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

describe('buildGoalForest', () => {
  it('returns empty for no goals', () => {
    expect(buildGoalForest([])).toEqual([])
  })

  it('builds flat forest of root goals', () => {
    const goals = [
      makeGoal({ id: 'a', parentId: null, sortOrder: 1 }),
      makeGoal({ id: 'b', parentId: null, sortOrder: 0 }),
    ]
    const forest = buildGoalForest(goals)
    expect(forest).toHaveLength(2)
    expect(forest[0].goal.id).toBe('b')
    expect(forest[1].goal.id).toBe('a')
    expect(forest[0].depth).toBe(0)
  })

  it('builds nested tree with children', () => {
    const goals = [
      makeGoal({ id: 'root', parentId: null }),
      makeGoal({ id: 'child1', parentId: 'root', sortOrder: 1 }),
      makeGoal({ id: 'child2', parentId: 'root', sortOrder: 0 }),
    ]
    const forest = buildGoalForest(goals)
    expect(forest).toHaveLength(1)
    expect(forest[0].children).toHaveLength(2)
    expect(forest[0].children[0].goal.id).toBe('child2')
    expect(forest[0].children[0].depth).toBe(1)
    expect(forest[0].children[1].goal.id).toBe('child1')
  })

  it('excludes archived goals from forest', () => {
    const goals = [
      makeGoal({ id: 'root', parentId: null }),
      makeGoal({ id: 'child', parentId: 'root', status: 'archived' }),
    ]
    const forest = buildGoalForest(goals)
    expect(forest[0].children).toHaveLength(0)
  })

  it('handles deep nesting (>= 3 levels)', () => {
    const goals = [
      makeGoal({ id: 'l0', parentId: null }),
      makeGoal({ id: 'l1', parentId: 'l0' }),
      makeGoal({ id: 'l2', parentId: 'l1' }),
    ]
    const forest = buildGoalForest(goals)
    expect(forest[0].children[0].children[0].goal.id).toBe('l2')
    expect(forest[0].children[0].children[0].depth).toBe(2)
  })
})

describe('buildGoalTree', () => {
  it('returns null if root not found', () => {
    expect(buildGoalTree([], 'nonexistent')).toBeNull()
  })

  it('builds tree from rootId', () => {
    const goals = [
      makeGoal({ id: 'root', parentId: null }),
      makeGoal({ id: 'child', parentId: 'root' }),
      makeGoal({ id: 'other', parentId: null }), // sibling, should not appear
    ]
    const tree = buildGoalTree(goals, 'root')
    expect(tree).not.toBeNull()
    expect(tree!.goal.id).toBe('root')
    expect(tree!.children).toHaveLength(1)
    expect(tree!.children[0].goal.id).toBe('child')
  })

  it('handles circular reference gracefully', () => {
    const goals: Goal[] = [
      { ...makeGoal({ id: 'a' }), parentId: 'b' },
      { ...makeGoal({ id: 'b' }), parentId: 'a' },
    ]
    const tree = buildGoalTree(goals, 'a')
    expect(tree).not.toBeNull()
    expect(tree!.goal.id).toBe('a')
    // a → b is built, but b's child 'a' is blocked by visited set
    expect(tree!.children).toHaveLength(1)
    expect(tree!.children[0].goal.id).toBe('b')
    expect(tree!.children[0].children).toHaveLength(0)
  })
})

describe('flattenSubtreeIds', () => {
  it('returns set with self id', () => {
    const goals = [makeGoal({ id: 'root', parentId: null })]
    const tree = buildGoalTree(goals, 'root')!
    const ids = flattenSubtreeIds(tree)
    expect(Array.from(ids).sort()).toEqual(['root'])
  })

  it('includes all descendant ids', () => {
    const goals = [
      makeGoal({ id: 'root', parentId: null }),
      makeGoal({ id: 'a', parentId: 'root' }),
      makeGoal({ id: 'b', parentId: 'a' }),
      makeGoal({ id: 'c', parentId: 'root' }),
    ]
    const tree = buildGoalTree(goals, 'root')!
    const ids = flattenSubtreeIds(tree)
    expect(Array.from(ids).sort()).toEqual(['a', 'b', 'c', 'root'])
  })
})

describe('computeGoalProgress', () => {
  it('leaf node with no todos and active status returns 0%', () => {
    const goals = [makeGoal({ id: 'a', parentId: null })]
    const tree = buildGoalTree(goals, 'a')!
    const progress = computeGoalProgress(tree, new Map())
    expect(progress).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it('leaf node with no todos and done status returns 100%', () => {
    const goals = [makeGoal({ id: 'a', parentId: null, status: 'done' })]
    const tree = buildGoalTree(goals, 'a')!
    const progress = computeGoalProgress(tree, new Map())
    expect(progress).toEqual({ done: 1, total: 1, percent: 100 })
  })

  it('aggregates todos from entire subtree', () => {
    const goals = [
      makeGoal({ id: 'root', parentId: null }),
      makeGoal({ id: 'a', parentId: 'root' }),
      makeGoal({ id: 'b', parentId: 'root' }),
    ]
    const todosByGoal = new Map<string, Todo[]>([
      ['a', [makeTodo({ status: 'done' }), makeTodo({ status: 'todo' })]],
      ['b', [makeTodo({ status: 'done' })]],
    ])
    const tree = buildGoalTree(goals, 'root')!
    const progress = computeGoalProgress(tree, todosByGoal)
    expect(progress).toEqual({ done: 2, total: 3, percent: 67 })
  })

  it('intermediate node with no direct todos delegates to children', () => {
    const goals = [
      makeGoal({ id: 'root', parentId: null }),
      makeGoal({ id: 'a', parentId: 'root' }),
    ]
    const todosByGoal = new Map<string, Todo[]>([
      ['a', [makeTodo({ status: 'done' })]],
    ])
    const tree = buildGoalTree(goals, 'root')!
    const progress = computeGoalProgress(tree, todosByGoal)
    expect(progress).toEqual({ done: 1, total: 1, percent: 100 })
  })

  it('all todos done returns 100%', () => {
    const goals = [makeGoal({ id: 'a', parentId: null })]
    const todosByGoal = new Map<string, Todo[]>([
      ['a', [makeTodo({ status: 'done' })]],
    ])
    const tree = buildGoalTree(goals, 'a')!
    const progress = computeGoalProgress(tree, todosByGoal)
    expect(progress).toEqual({ done: 1, total: 1, percent: 100 })
  })

  it('no todos returns as "not started"', () => {
    const goals = [makeGoal({ id: 'a', parentId: null })]
    const tree = buildGoalTree(goals, 'a')!
    const progress = computeGoalProgress(tree, new Map())
    expect(progress).toEqual({ done: 0, total: 0, percent: 0 })
  })
})

describe('computeChildrenProgress', () => {
  it('returns empty for leaf root', () => {
    const goals = [makeGoal({ id: 'root', parentId: null })]
    const tree = buildGoalTree(goals, 'root')!
    expect(computeChildrenProgress(tree, new Map())).toEqual([])
  })

  it('returns progress for each direct child', () => {
    const goals = [
      makeGoal({ id: 'root', parentId: null }),
      makeGoal({ id: 'a', parentId: 'root' }),
      makeGoal({ id: 'b', parentId: 'root' }),
    ]
    const todosByGoal = new Map<string, Todo[]>([
      ['a', [makeTodo({ status: 'done' })]],
    ])
    const tree = buildGoalTree(goals, 'root')!
    const results = computeChildrenProgress(tree, todosByGoal)
    expect(results).toHaveLength(2)
    expect(results[0].node.goal.id).toBe('a')
    expect(results[0].progress.done).toBe(1)
    expect(results[1].node.goal.id).toBe('b')
    expect(results[1].progress.done).toBe(0)
  })
})
