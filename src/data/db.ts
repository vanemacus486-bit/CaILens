import Dexie, { type Table } from 'dexie'
import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import { migrateEventV1ToV2 } from '@/domain/migration'

export class CailensDB extends Dexie {
  events!: Table<CalendarEvent, string>
  categories!: Table<Category, string>

  constructor() {
    super('cailens')

    // V1 schema 保留以支持升级路径
    this.version(1).stores({
      events: 'id, startTime',
    })

    // V2：新增 categories 表，给所有 event 补 categoryId
    this.version(2).stores({
      events:     'id, startTime',
      categories: 'id',
    }).upgrade(async (tx) => {
      // 1. 给所有现存事件补 categoryId
      await tx.table('events').toCollection().modify((event) => {
        const migrated = migrateEventV1ToV2(event)
        event.categoryId = migrated.categoryId
        event.color = migrated.color
      })

      // 2. 播种 6 个默认分类
      await tx.table('categories').bulkAdd([...DEFAULT_CATEGORIES])
    })
  }
}

export const db = new CailensDB()
