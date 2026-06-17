/**
 * # goalTree — 目标树纯函数
 *
 * 构建森林→树→进度聚合的全链路。
 * 零副作用，不依赖 React/Dexie/浏览器 API。
 */

import type { Goal } from './goal'
import type { Todo } from './todo'

// ── 树节点类型 ──────────────────────────────────────────────

export interface GoalNode {
  goal: Goal
  children: GoalNode[]
  depth: number
}

// ── 森林 / 树构建 ──────────────────────────────────────────

/** 构建全部顶层树（排除 archived） */
export function buildGoalForest(goals: Goal[]): GoalNode[] {
  const active = goals.filter((g) => g.status !== 'archived')
  const childrenMap = buildChildrenMap(active)
  const roots: GoalNode[] = []
  for (const g of active) {
    if (g.parentId === null) {
      roots.push(buildNode(g, childrenMap, new Set(), 0))
    }
  }
  return roots.sort((a, b) => a.goal.sortOrder - b.goal.sortOrder)
}

/**
 * 构建以 rootId 为根的子树。
 * 用 visited Set 循环防护。
 */
export function buildGoalTree(goals: Goal[], rootId: string): GoalNode | null {
  const root = goals.find((g) => g.id === rootId)
  if (!root) return null
  const active = goals.filter((g) => g.status !== 'archived')
  const childrenMap = buildChildrenMap(active)
  return buildNode(root, childrenMap, new Set(), 0)
}

/** 展平子树所有后代 id（含自身） */
export function flattenSubtreeIds(node: GoalNode): Set<string> {
  const ids = new Set<string>([node.goal.id])
  for (const child of node.children) {
    for (const id of flattenSubtreeIds(child)) {
      ids.add(id)
    }
  }
  return ids
}

// ── 进度计算 ──────────────────────────────────────────────────

export interface GoalProgress {
  done: number
  total: number
  percent: number
}

/**
 * 递归聚合：子树下所有 todo 完成率。
 * 叶子且无 todo → 看 goal.status（done=100%，否则 0% 且 total=0 视为"未开始"）。
 */
export function computeGoalProgress(
  node: GoalNode,
  todosByGoal: Map<string, Todo[]>,
): GoalProgress {
  const ids = flattenSubtreeIds(node)
  let done = 0
  let total = 0

  for (const goalId of ids) {
    const todos = todosByGoal.get(goalId)
    if (todos && todos.length > 0) {
      for (const t of todos) {
        total++
        if (t.status === 'done') done++
      }
    }
  }

  // 叶子节点无 todo → 看 goal.status
  if (total === 0) {
    if (node.goal.status === 'done') {
      return { done: 1, total: 1, percent: 100 }
    }
    // 有子节点但子节点也无 todo（中间空节点）→ 未开始
    if (node.children.length > 0) {
      return { done: 0, total: 0, percent: 0 }
    }
    // 纯叶子无 todo
    return { done: 0, total: 0, percent: 0 }
  }

  return {
    done,
    total,
    percent: Math.round((done / total) * 100),
  }
}

/** 当前主目标的一级子目标各自进度（= 下段"子项目进度条"数据源） */
export function computeChildrenProgress(
  root: GoalNode,
  todosByGoal: Map<string, Todo[]>,
): { node: GoalNode; progress: GoalProgress }[] {
  return root.children.map((child) => ({
    node: child,
    progress: computeGoalProgress(child, todosByGoal),
  }))
}

// ── 内部辅助 ──────────────────────────────────────────────────

function buildChildrenMap(
  goals: Goal[],
): Map<string, Goal[]> {
  const map = new Map<string, Goal[]>()
  for (const g of goals) {
    if (g.parentId !== null) {
      const list = map.get(g.parentId)
      if (list) {
        list.push(g)
      } else {
        map.set(g.parentId, [g])
      }
    }
  }
  // 按 sortOrder 排序
  for (const [, list] of map) {
    list.sort((a, b) => a.sortOrder - b.sortOrder)
  }
  return map
}

function buildNode(
  goal: Goal,
  childrenMap: Map<string, Goal[]>,
  visited: Set<string>,
  depth: number,
): GoalNode {
  // 循环防护
  if (visited.has(goal.id)) {
    return { goal, children: [], depth }
  }
  visited.add(goal.id)

  const rawChildren = childrenMap.get(goal.id) ?? []
  const children: GoalNode[] = []
  for (const child of rawChildren) {
    // 跳过已访问节点防止深度循环
    if (!visited.has(child.id)) {
      children.push(buildNode(child, childrenMap, new Set(visited), depth + 1))
    }
  }

  return { goal, children, depth }
}
