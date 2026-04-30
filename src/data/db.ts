import Dexie, { type Table } from 'dexie'
import type { CalendarEvent } from '@/domain/event'
import type { Category, CategoryId, CategoryName } from '@/domain/category'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import { migrateEventV1ToV2 } from '@/domain/migration'

// ── v3 upgrade: string name → bilingual lookup ────────────
// 旧 v2 数据库中 categories.name 是 string，v3 需要转为 {zh, en}。
// 未知/用户自定义名称降级为 { zh: name, en: name }。

const V3_NAME_MAP: Record<string, CategoryName> = {
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

// ── Database ──────────────────────────────────────────────

export class CailensDB extends Dexie {
  events!:     Table<CalendarEvent, string>
  categories!: Table<Category, CategoryId>
  settings!:   Table<AppSettings, string>

  constructor(name = 'cailens') {
    super(name)

    // v1：只有 events 表
    this.version(1).stores({
      events: 'id, startTime',
    })

    // v3：新增 categories + settings 表
    this.version(3).stores({
      events:     'id, startTime',
      categories: 'id',
      settings:   'id',
    }).upgrade(async (tx) => {
      // 1. 给 v1 遗留 events 补 categoryId
      await tx.table('events').toCollection().modify((e) => {
        if (e.categoryId === undefined) {
          const migrated = migrateEventV1ToV2(e)
          e.categoryId = migrated.categoryId
          e.color      = migrated.color
        }
      })

      // 2. 迁移 v2 dev 数据库的 categories.name string → {zh, en}
      const existing = await tx.table('categories').toArray()
      if (existing.length > 0) {
        await tx.table('categories').toCollection().modify((cat) => {
          if (typeof cat.name === 'string') {
            cat.name = V3_NAME_MAP[cat.name] ?? { zh: cat.name, en: cat.name }
          }
        })
      }

      // 3. 播种 settings
      await tx.table('settings').put({ ...DEFAULT_SETTINGS })
    })

    // v4：categories.keywords: string[] → folders: KeywordFolder[]
    this.version(4).stores({
      events:     'id, startTime',
      categories: 'id',
      settings:   'id',
    }).upgrade(async (tx) => {
      const cats = await tx.table('categories').toArray()
      for (const cat of cats) {
        if (cat.keywords !== undefined || !cat.folders) {
          const oldKeywords: string[] = cat.keywords ?? []
          await tx.table('categories').update(cat.id, {
            folders: [{ id: 'default', name: '默认', keywords: oldKeywords }],
            keywords: undefined,
          })
        }
      }
    })

    // 全新 DB 首次创建时触发（version 0 → any）。
    // 返回 Promise 让 Dexie 等待操作完成再认为 DB 就绪。
    this.on('populate', () =>
      Promise.all([
        this.categories.bulkPut([...DEFAULT_CATEGORIES]),
        this.settings.put({ ...DEFAULT_SETTINGS }),
      ])
    )

    // DB 每次成功打开后触发。用于处理 v1 用户的升级路径：
    // v1→v3 upgrade 结束后 categories 表是空的（upgrade 内写入不可靠），
    // 在这里用普通 readwrite transaction 补种。
    this.on('ready', async () => {
      const count = await this.categories.count()
      if (count === 0) {
        await this.categories.bulkPut([...DEFAULT_CATEGORIES])
      }
    })
  }
}

export const db = new CailensDB()
