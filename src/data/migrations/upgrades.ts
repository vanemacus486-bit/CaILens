/**
 * # Dexie Schema Upgrade Functions
 *
 * 从 db.ts 提取的版本升级回调。每个函数以版本号命名，
 * 由 CailensDB 构造函数在对应 version 声明中引用。
 */

import type { Transaction } from 'dexie'
import { migrateEventV1ToV2 } from '@/domain/migration'

// ── v3: 新增 categories + settings 表；迁移 v1 events ──────

const V3_NAME_MAP: Record<string, { zh: string; en: string }> = {
  '核心工作': { zh: '核心工作', en: 'Core Work'       },
  '辅助工作': { zh: '辅助工作', en: 'Support Work'    },
  '必要事务': { zh: '必要事务', en: 'Essentials'      },
  '阅读学习': { zh: '阅读学习', en: 'Reading & Study' },
  '休息':     { zh: '休息',     en: 'Rest'            },
  '其他':     { zh: '其他',     en: 'Other'           },
  '深度工作': { zh: '深度工作', en: 'Core Work'       },
  '会议沟通': { zh: '会议沟通', en: 'Support Work'    },
  '学习阅读': { zh: '学习阅读', en: 'Essentials'      },
  '日常事务': { zh: '日常事务', en: 'Reading & Study' },
  '休息放松': { zh: '休息放松', en: 'Rest'            },
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
        cat.name = V3_NAME_MAP[cat.name] ?? { zh: cat.name, en: cat.name }
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

// ── v16: 补 projects.useCount / lastUsedAt 默认值 ───────────

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
