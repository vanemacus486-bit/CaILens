/**
 * # Goal — 长期目标领域类型
 *
 * 自引用 parentId 树结构，支持多层展开折叠与进度聚合。
 * 纯类型 + 纯函数，不依赖 React/Dexie/浏览器 API。
 */

import type { CategoryId } from './category'
import type { KeyMetric } from './keyMetric'
import type { GoalDoc } from './goalDoc'
import type { Todo } from './todo'

export const ALL_CATEGORY_IDS: readonly CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as const

// ── 状态枚举 ────────────────────────────────────────────────

export type GoalStatus = 'active' | 'done' | 'archived'

export const GOAL_STATUSES: readonly GoalStatus[] = ['active', 'done', 'archived'] as const

// ── 主类型 ──────────────────────────────────────────────────

export interface Goal {
  id: string
  /** null = 主目标（顶层） */
  parentId: string | null
  title: string
  description: string
  /** 着色用；null 时继承父 / 用默认 accent */
  categoryId: CategoryId | null
  status: GoalStatus
  /** 同层内排序，越小越靠前 */
  sortOrder: number
  /** 可选目标日期 (UTC ms) */
  targetDate: number | null
  /** 绑定的具体事件 ID 列表，有记录时自动检测打卡 */
  linkedEventIds?: string[]
  /** 关键指标计数器（手动 −/+ 为主，可绑事件自动累加） */
  metrics?: KeyMetric[]
  /** 结构化复盘文档：为什么做 / 取得什么结果 / 试过什么·效果如何 */
  doc?: GoalDoc
  createdAt: number
  updatedAt: number
  archivedAt?: number
  /** 标记为已完成的时间戳 (UTC ms)，由 markProjectDone 写入 */
  completedAt?: number
}

// ── 输入类型 ────────────────────────────────────────────────

export interface CreateGoalInput {
  title: string
  parentId?: string | null
  categoryId?: CategoryId | null
  linkedEventIds?: string[]
  description?: string
  targetDate?: number | null
  sortOrder?: number
}

export type UpdateGoalInput = Pick<Goal, 'id'> &
  Partial<Omit<Goal, 'id' | 'createdAt'>>

// ── 纯函数 ──────────────────────────────────────────────────

/** 判断 goal 是否为活跃态（可显示在切换器/脑图中） */
export function isActiveGoal(g: Goal): boolean {
  return g.status === 'active'
}

/** 按 sortOrder 排序 */
export function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => a.sortOrder - b.sortOrder)
}

/** 同层下一个可用 sortOrder（max + 1） */
export function nextGoalSortOrder(siblings: Goal[]): number {
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((g) => g.sortOrder)) + 1
}

/** 获取活跃主目标（parentId===null && status==='active'），已排序 */
export function getMainGoals(goals: Goal[]): Goal[] {
  return sortGoals(goals.filter((g) => g.parentId === null && isActiveGoal(g)))
}

/** getMainGoals 的显式别名 */
export function getActiveMainGoals(goals: Goal[]): Goal[] {
  return getMainGoals(goals)
}

/**
 * 获取已完成的项目（parentId===null && status==='done'），按完成时间倒序。
 * 无 completedAt 的排末尾。
 */
export function getDoneProjects(goals: Goal[]): Goal[] {
  return sortGoals(goals.filter((g) => g.parentId === null && g.status === 'done')).sort((a, b) => {
    const ca = a.completedAt ?? -Infinity
    const cb = b.completedAt ?? -Infinity
    return cb - ca
  })
}

/** 获取活跃的直接子节点，已排序 */
export function getChildren(goals: Goal[], parentId: string): Goal[] {
  return sortGoals(goals.filter((g) => g.parentId === parentId && isActiveGoal(g)))
}

/**
 * 判断项目（主目标）的所有子树待办是否全部完成。
 * 递归收集所有 descendant goalId，检查这些 goalId 下所有 todo 的 status。
 * 没有待办时返回 false（未开始 = 未完成）。
 */
export function isProjectComplete(goal: Goal, allGoals: Goal[], allTodos: Todo[]): boolean {
  const collectDescendantIds = (parentId: string): string[] => {
    const children = allGoals.filter((g) => g.parentId === parentId)
    return [parentId, ...children.flatMap((c) => collectDescendantIds(c.id))]
  }
  const goalIds = new Set(collectDescendantIds(goal.id))
  const relevant = allTodos.filter((t) => t.goalId && goalIds.has(t.goalId))
  if (relevant.length === 0) return false
  return relevant.every((t) => t.status === 'done')
}
