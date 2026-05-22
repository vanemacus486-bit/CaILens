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
  /** 累计时长（分钟，缓存在创建/更新事件时更新） */
  totalMinutes: number
  /** 事件数缓存 */
  eventCount: number
  /** 累计使用次数（每次创建事件时 +1） */
  useCount: number
  /** 最近一次使用时间戳 */
  lastUsedAt: number
  createdAt: number
  updatedAt: number
  archivedAt?: number
}

export type CreateProjectInput = Pick<Project, 'name' | 'categoryId'>

export type UpdateProjectInput = Pick<Project, 'id'> &
  Partial<Omit<Project, 'id' | 'createdAt'>>
