/**
 * # Goal — 长期目标领域类型
 *
 * 自引用 parentId 树结构，支持多层展开折叠与进度聚合。
 * 纯类型 + 纯函数，不依赖 React/Dexie/浏览器 API。
 */

import type { CategoryId } from './category'
import type { KeyMetric } from './keyMetric'

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
  createdAt: number
  updatedAt: number
  archivedAt?: number
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

/** 按 sortOrder 排序 */
export function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => a.sortOrder - b.sortOrder)
}

/** 同层下一个可用 sortOrder（max + 1） */
export function nextGoalSortOrder(siblings: Goal[]): number {
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((g) => g.sortOrder)) + 1
}

/** 获取主目标（parentId===null && status!=='archived'），已排序 */
export function getMainGoals(goals: Goal[]): Goal[] {
  return sortGoals(goals.filter((g) => g.parentId === null && g.status !== 'archived'))
}

/** 获取直接子节点，已排序 */
export function getChildren(goals: Goal[], parentId: string): Goal[] {
  return sortGoals(goals.filter((g) => g.parentId === parentId && g.status !== 'archived'))
}
