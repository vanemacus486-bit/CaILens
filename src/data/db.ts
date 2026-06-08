import Dexie, { type Table } from 'dexie'
import type { CalendarEvent } from '@/domain/event'
import type { Category, CategoryId } from '@/domain/category'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { Project } from '@/domain/project'
import type { InspirationLog } from '@/domain/inspiration'
import type { Profile } from '@/domain/profile'
import type { Todo } from '@/domain/todo'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import { upgradeV3, upgradeV4, upgradeV5, upgradeV16, upgradeV21, upgradeV24 } from './migrations/upgrades'

// ── Database ──────────────────────────────────────────────

export class CailensDB extends Dexie {
  events!:          Table<CalendarEvent, string>
  categories!:      Table<Category, CategoryId>
  settings!:        Table<AppSettings, string>
  weeklyEstimates!: Table<WeeklyEstimate, string>
  projects!:        Table<Project, string>
  inspirations!:    Table<InspirationLog, string>
  profiles!:        Table<Profile, 'default'>
  mealRecords!:     Table<import('@/domain/event').MealRecord, string>
  sleepRecords!:    Table<import('@/domain/event').SleepRecord, string>
  outfitLogs!:      Table<import('@/domain/dailyContext').DailyOutfit, string>
  hygieneLogs!:     Table<import('@/domain/dailyContext').DailyHygiene, string>
  todos!: Table<Todo, string>

  constructor(name = 'cailens') {
    super(name)

    // v1：只有 events 表
    this.version(1).stores({ events: 'id, startTime' })

    // v3：新增 categories + settings 表
    this.version(3)
      .stores({ events: 'id, startTime', categories: 'id', settings: 'id' })
      .upgrade(upgradeV3)

    // v4：keywords → folders
    this.version(4)
      .stores({ events: 'id, startTime', categories: 'id', settings: 'id' })
      .upgrade(upgradeV4)

    // v5：补 weeklyBudget 默认值
    this.version(5)
      .stores({ events: 'id, startTime', categories: 'id', settings: 'id' })
      .upgrade(upgradeV5)

    // v6：新增 weeklyEstimates 表
    this.version(6).stores({
      events: 'id, startTime', categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
    })

    // v7：events 表新增 endTime 索引
    this.version(7).stores({
      events: 'id, startTime, endTime', categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
    })

    // v13：新增 projects 表 + events 新增 projectId 索引
    this.version(13).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status',
    })

    // v14：新增 inspirations
    this.version(14).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status',
      inspirations: 'id, projectId, eventId',
    })

    // v16：projects 新增 useCount/lastUsedAt；新增 mealRecords + sleepRecords
    this.version(16).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, useCount, lastUsedAt',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
    }).upgrade(upgradeV16)

    // v17：新增 profiles 表
    this.version(17).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, useCount, lastUsedAt',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
      profiles: 'id',
    })

    // v18：新增穿搭/卫生/娱乐/身体指标时序表
    this.version(18).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, useCount, lastUsedAt',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
      profiles: 'id',
      outfitLogs: 'id, date',
      hygieneLogs: 'id, date',
    })

    // v19：新增 todos 表
    this.version(19).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, useCount, lastUsedAt',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
      profiles: 'id',
      outfitLogs: 'id, date',
      hygieneLogs: 'id, date',
      todos: 'id, status, dueDate, sortOrder',
    })

    // v21：合并项目概念 — taskGroups/taskGroupItems → projects/todos
    this.version(21).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, sortOrder, useCount, lastUsedAt',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
      profiles: 'id',
      outfitLogs: 'id, date',
      hygieneLogs: 'id, date',
      todos: 'id, status, dueDate, sortOrder, projectId',
    }).upgrade(upgradeV21)

    // v22：todos 新增 categoryId 索引（独立待办分类归属）
    this.version(22).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, sortOrder, useCount, lastUsedAt',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
      profiles: 'id',
      outfitLogs: 'id, date',
      hygieneLogs: 'id, date',
      todos: 'id, status, dueDate, sortOrder, projectId, categoryId',
    })

    // v23：todos 新增 repeatPattern 字段（每日重复待办）
    this.version(23).stores({
      todos: 'id, status, dueDate, sortOrder, projectId, categoryId, repeatPattern',
    })

    // v24：projects 新增 dailyRepeat 字段（项目级每日重复）
    this.version(24).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, sortOrder, useCount, lastUsedAt, dailyRepeat',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
      profiles: 'id',
      outfitLogs: 'id, date',
      hygieneLogs: 'id, date',
      todos: 'id, status, dueDate, sortOrder, projectId, categoryId, repeatPattern',
    }).upgrade(upgradeV24)

    // 全新 DB 首次创建时触发（version 0 → any）
    this.on('populate', () =>
      Promise.all([
        this.categories.bulkPut([...DEFAULT_CATEGORIES]),
        this.settings.put({ ...DEFAULT_SETTINGS }),
      ])
    )

    // v1→v3 upgrade 后 categories 可能为空，在此补种
    this.on('ready', async () => {
      const catCount = await this.categories.count()
      if (catCount === 0) {
        await this.categories.bulkPut([...DEFAULT_CATEGORIES])
      }
    })
  }
}

export const db = new CailensDB()
