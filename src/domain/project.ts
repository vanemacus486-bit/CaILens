/**
 * # 项目（Project）
 *
 * 第 2 层核心实体。事件不再直接归属于分类，而是归属于项目；
 * 项目归属于分类。
 *
 * 项目是长期存在的承载物，可以聚合多次事件、承载 SOP、
 * 累积灵感、统计趋势。
 */

import type { CategoryId } from './category'

export type ProjectStatus = 'active' | 'archived'

export interface Project {
  id: string
  name: string
  categoryId: CategoryId
  status: ProjectStatus
  description: string
  /** 累计时长（分钟，缓存在创建/更新事件时更新） */
  totalMinutes: number
  /** 事件数缓存 */
  eventCount: number
  /** 累计使用次数（每次创建事件时 +1） */
  useCount: number
  /** 最近一次使用时间戳 */
  lastUsedAt: number
  /** 排序序号，越小越靠前 */
  sortOrder: number
  createdAt: number
  updatedAt: number
  archivedAt?: number
  /** 项目级每日重复开关：开启后该项目下所有 done 的 todo 在过零点自动重置为 todo */
  dailyRepeat: boolean
}

export type CreateProjectInput = Pick<Project, 'name' | 'categoryId'> & {
  description?: string
  sortOrder?: number
  dailyRepeat?: boolean
}

export type UpdateProjectInput = Pick<Project, 'id'> &
  Partial<Omit<Project, 'id' | 'createdAt'>>

// ── 工具函数 ───────────────────────────────────────────

/** 按 sortOrder 排序 */
export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => a.sortOrder - b.sortOrder)
}

/** 获取下一个可用的 sortOrder */
export function nextProjectSortOrder(projects: Project[]): number {
  if (projects.length === 0) return 0
  return Math.max(...projects.map((p) => p.sortOrder)) + 1
}
