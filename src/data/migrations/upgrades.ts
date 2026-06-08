/**
 * # Dexie Schema Upgrade Functions
 *
 * 从 db.ts 提取的版本升级回调。每个函数以版本号命名，
 * 由 CailensDB 构造函数在对应 version 声明中引用。
 */

import type { Transaction } from 'dexie'
import { migrateEventV1ToV2 } from '@/domain/migration'

// ── v3: 新增 categories + settings 表；迁移 v1 events ──────

const V3_NAME_MAP: Record<string, string> = {
  '核心工作': '核心工作',
  '辅助工作': '辅助工作',
  '必要事务': '必要事务',
  '阅读学习': '阅读学习',
  '休息':     '休息',
  '其他':     '其他',
  '深度工作': '深度工作',
  '会议沟通': '会议沟通',
  '学习阅读': '学习阅读',
  '日常事务': '日常事务',
  '休息放松': '休息放松',
}

import { DEFAULT_SETTINGS } from '@/domain/settings'

export async function upgradeV3(tx: Transaction): Promise<void> {
  // 1. 给 v1 遗留 events 补 categoryId
  await tx.table('events').toCollection().modify((e: any) => {
    if (e.categoryId === undefined) {
      const migrated = migrateEventV1ToV2(e)
      e.categoryId = migrated.categoryId
      e.color      = migrated.color
    }
  })

  // 2. 迁移 v2 dev 数据库的 categories.name string → {zh, en}
  const existing = await tx.table('categories').toArray()
  if (existing.length > 0) {
    await tx.table('categories').toCollection().modify((cat: any) => {
      if (typeof cat.name === 'string') {
        cat.name = V3_NAME_MAP[cat.name] ?? cat.name
      }
    })
  }

  // 3. 播种 settings
  await tx.table('settings').put({ ...DEFAULT_SETTINGS })
}

// ── v4: categories.keywords: string[] → folders: KeywordFolder[] ──

export async function upgradeV4(tx: Transaction): Promise<void> {
  const cats = await tx.table('categories').toArray()
  for (const cat of cats as any[]) {
    if (cat.keywords !== undefined || !cat.folders) {
      const oldKeywords: string[] = cat.keywords ?? []
      await tx.table('categories').update(cat.id, {
        folders: [{ id: 'default', name: '默认', keywords: oldKeywords }],
        keywords: undefined,
      })
    }
  }
}

// ── v5: 补 categories.weeklyBudget 默认值 ──────────────────

export async function upgradeV5(tx: Transaction): Promise<void> {
  const DEFAULT_BUDGETS: Record<string, number> = {
    accent: 20, sage: 10, sand: 5, sky: 5, rose: 5, stone: 3,
  }
  const cats = await tx.table('categories').toArray()
  for (const cat of cats as any[]) {
    if (cat.weeklyBudget === undefined) {
      await tx.table('categories').update(cat.id, {
        weeklyBudget: DEFAULT_BUDGETS[cat.id] ?? 5,
      })
    }
  }
}

// ── v21: 合并项目概念 — taskGroups → projects, taskGroupItems → todos ──

export async function upgradeV21(tx: Transaction): Promise<void> {
  // 1. 将 taskGroups 迁移为 projects
  const oldTaskGroups: any[] = await tx.table('taskGroups').toArray()
  const existingProjects: any[] = await tx.table('projects').toArray()
  const existingProjectIds = new Set(existingProjects.map((p: any) => p.id))

  for (const tg of oldTaskGroups) {
    if (!existingProjectIds.has(tg.id)) {
      await tx.table('projects').put({
        id: tg.id,
        name: tg.name,
        categoryId: 'accent',
        status: 'active',
        description: '',
        totalMinutes: 0,
        eventCount: 0,
        useCount: 0,
        lastUsedAt: tg.createdAt,
        sortOrder: tg.sortOrder ?? 0,
        createdAt: tg.createdAt,
        updatedAt: tg.updatedAt,
      })
    }
  }

  // 2. 将 taskGroupItems 迁移为 todos
  const oldItems: any[] = await tx.table('taskGroupItems').toArray()
  for (const item of oldItems) {
    await tx.table('todos').put({
      id: item.id,
      title: item.title,
      description: '',
      status: item.done ? 'done' : 'todo',
      priority: 'medium',
      dueDate: null,
      sortOrder: item.sortOrder ?? 0,
      projectId: item.taskGroupId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      completedAt: item.done ? item.updatedAt : null,
    })
  }

  // 3. 为缺少 sortOrder/description 的现有 projects 补默认值
  const maxTgOrder = Math.max(0, ...oldTaskGroups.map((g: any) => g.sortOrder ?? 0))
  let cursor = maxTgOrder + 1
  for (const p of existingProjects) {
    const patches: Record<string, unknown> = {}
    if (p.sortOrder === undefined) patches.sortOrder = cursor++
    if (p.description === undefined) patches.description = p.description ?? ''
    if (Object.keys(patches).length > 0) {
      await tx.table('projects').update(p.id, patches)
    }
  }
}

// ── v24: projects 新增 dailyRepeat 字段 ─────────────────

export async function upgradeV24(tx: Transaction): Promise<void> {
  const projects = await tx.table('projects').toArray()
  for (const p of projects as any[]) {
    if (p.dailyRepeat === undefined) {
      await tx.table('projects').update(p.id, { dailyRepeat: false })
    }
  }
}

export async function upgradeV16(tx: Transaction): Promise<void> {
  const oldProjects = await tx.table('projects').toArray()
  for (const p of oldProjects as any[]) {
    if (p.useCount === undefined || p.lastUsedAt === undefined) {
      await tx.table('projects').update(p.id, {
        useCount: 0,
        lastUsedAt: p.createdAt,
      })
    }
  }
}
