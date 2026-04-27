import Dexie, { type Table } from 'dexie'
import type { CalendarEvent } from '@/domain/event'
import type { Category, CategoryId, CategoryName } from '@/domain/category'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import { migrateEventV1ToV2 } from '@/domain/migration'

// ── v3 upgrade: name-string → bilingual lookup ────────────
//
// Used when upgrading a v2 dev database whose categories table already has
// string-name records. Keys are the known Chinese defaults from old v2.
// Unknown/user-edited names fall back to { zh: name, en: name }.

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

  constructor() {
    super('cailens')

    // v1: events only
    this.version(1).stores({
      events: 'id, startTime',
    })

    // v3: add categories + settings tables
    // Data seeding is split:
    //   - on('populate'): fresh DB — fires outside the versionchange transaction,
    //     using the normal readwrite path which is reliable in all environments.
    //   - upgrade: v1/v2 existing DB — backfills events + migrates category names.
    this.version(3).stores({
      events:     'id, startTime',
      categories: 'id',
      settings:   'id',
    }).upgrade(async (tx) => {
      // Backfill categoryId on v1 events that don't have it yet
      await tx.table('events').toCollection().modify((e) => {
        if (e.categoryId === undefined) {
          const migrated = migrateEventV1ToV2(e)
          e.categoryId = migrated.categoryId
          e.color      = migrated.color
        }
      })

      // For existing v2 dev databases: migrate category.name string → {zh, en}
      // For v1 users and fresh DB: categories table is empty, populate event handles seeding.
      const existing = await tx.table('categories').toArray()
      if (existing.length > 0) {
        await tx.table('categories').toCollection().modify((cat) => {
          if (typeof cat.name === 'string') {
            cat.name = V3_NAME_MAP[cat.name] ?? { zh: cat.name, en: cat.name }
          }
        })
      }

      // Seed settings for all upgrade paths
      await tx.table('settings').put({ ...DEFAULT_SETTINGS })
    })

    // Fires when the database is created for the very first time (version 0 → any).
    // This is the reliable path for seeding initial data in all environments because
    // it runs outside the versionchange transaction as normal readwrite operations.
    this.on('populate', () => {
      void Promise.all([
        this.categories.bulkPut([...DEFAULT_CATEGORIES]),
        this.settings.put({ ...DEFAULT_SETTINGS }),
      ])
    })
  }
}

export const db = new CailensDB()
