/**
 * # SOP（标准操作流程）
 *
 * 每个项目可以拥有一份 SOP，内容为结构化或半结构化的步骤描述。
 * SOP 可编辑，每次编辑生成新版本（PlanVersion 模式）。
 */

export type SopSectionType = 'title' | 'step' | 'note' | 'warning'

export interface SopSection {
  id: string
  type: SopSectionType
  title: string
  content: string
  order: number
}

export interface SOP {
  id: string
  projectId: string
  name: string
  sections: SopSection[]
  currentVersionId: string
  createdAt: number
  updatedAt: number
}

export type VersionSource = 'initial' | 'manual' | 'inspiration' | 'review'

export interface SOPVersion {
  id: string
  sopId: string
  projectId: string
  version: number
  sections: SopSection[]
  changelog: string
  source: VersionSource
  inspirationId?: string
  createdAt: number
}
