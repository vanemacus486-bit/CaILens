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
import type { TodoList } from '@/domain/todo'
import type { ChroniclePhase, ChronicleTask } from '@/domain/chronicle'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import { upgradeV3, upgradeV4, upgradeV5, upgradeV16, upgradeV21, upgradeV24 } from './migrations/upgrades'

// 鈹€鈹€ Database 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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
  hygieneLogs!:     Table<import('./adapters/StorageAdapter').HygieneLogRecord, string>
  todos!: Table<Todo, string>
  todoLists!: Table<TodoList, string>
  chroniclePhases!: Table<ChroniclePhase, string>
  chronicleTasks!: Table<ChronicleTask, string>

  constructor(name = 'cailens') {
    super(name)

    // v1锛氬彧鏈?events 琛?
    this.version(1).stores({ events: 'id, startTime' })

    // v3锛氭柊澧?categories + settings 琛?
    this.version(3)
      .stores({ events: 'id, startTime', categories: 'id', settings: 'id' })
      .upgrade(upgradeV3)

    // v4锛歬eywords 鈫?folders
    this.version(4)
      .stores({ events: 'id, startTime', categories: 'id', settings: 'id' })
      .upgrade(upgradeV4)

    // v5锛氳ˉ weeklyBudget 榛樿鍊?
    this.version(5)
      .stores({ events: 'id, startTime', categories: 'id', settings: 'id' })
      .upgrade(upgradeV5)

    // v6锛氭柊澧?weeklyEstimates 琛?
    this.version(6).stores({
      events: 'id, startTime', categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
    })

    // v7锛歟vents 琛ㄦ柊澧?endTime 绱㈠紩
    this.version(7).stores({
      events: 'id, startTime, endTime', categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
    })

    // v13锛氭柊澧?projects 琛?+ events 鏂板 projectId 绱㈠紩
    this.version(13).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status',
    })

    // v14锛氭柊澧?inspirations
    this.version(14).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status',
      inspirations: 'id, projectId, eventId',
    })

    // v16锛歱rojects 鏂板 useCount/lastUsedAt锛涙柊澧?mealRecords + sleepRecords
    this.version(16).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, useCount, lastUsedAt',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
    }).upgrade(upgradeV16)

    // v17锛氭柊澧?profiles 琛?
    this.version(17).stores({
      events: 'id, startTime, endTime, projectId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, useCount, lastUsedAt',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
      profiles: 'id',
    })

    // v18锛氭柊澧炵┛鎼?鍗敓/濞变箰/韬綋鎸囨爣鏃跺簭琛?
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

    // v19锛氭柊澧?todos 琛?
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

    // v21锛氬悎骞堕」鐩蹇?鈥?taskGroups/taskGroupItems 鈫?projects/todos
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

    // v22锛歵odos 鏂板 categoryId 绱㈠紩锛堢嫭绔嬪緟鍔炲垎绫诲綊灞烇級
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

    // v23锛歵odos 鏂板 repeatPattern 瀛楁锛堟瘡鏃ラ噸澶嶅緟鍔烇級
    this.version(23).stores({
      todos: 'id, status, dueDate, sortOrder, projectId, categoryId, repeatPattern',
    })

    // v25锛歵odos 鏂板 priority锛堝彲绌猴級鍜?domain 瀛楁锛堟敹浠剁浠诲姟鏀寔锛?
    this.version(25).stores({
      todos: 'id, status, dueDate, sortOrder, projectId, categoryId, repeatPattern, priority, domain',
    }).upgrade((tx) => tx.table('todos').toCollection().modify(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (todo: any) => {
      if (todo.priority === undefined) todo.priority = null
      if (todo.domain === undefined) todo.domain = null
    }))

    // v24锛歱rojects 鏂板 dailyRepeat 瀛楁锛堥」鐩骇姣忔棩閲嶅锛?
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

    // v26锛氭柊澧?goals 琛紱todos/events 澧?goalId 绱㈠紩
    this.version(26).stores({
      events: 'id, startTime, endTime, projectId, goalId',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, sortOrder, useCount, lastUsedAt, dailyRepeat',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
      profiles: 'id',
      outfitLogs: 'id, date', hygieneLogs: 'id, date',
      todos: 'id, status, dueDate, sortOrder, projectId, categoryId, repeatPattern, priority, domain, goalId',
      goals: 'id, parentId, status, sortOrder',
    }).upgrade(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.table('todos').toCollection().modify((t: any) => { if (t.goalId === undefined) t.goalId = null })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.table('events').toCollection().modify((e: any) => { if (e.goalId === undefined) e.goalId = null })
    })

    // v27锛氬崼鐢熸敼涓虹被鍨嬪寲浜嬩欢 鈥?鏃?hygieneLogs 鍕鹃€夎褰曡縼绉讳负 hygiene 浜嬩欢
    this.version(27).stores({
      events: 'id, startTime, endTime, projectId, goalId',
    }).upgrade(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logs = (await tx.table('hygieneLogs').toArray()) as any[]
      if (logs.length === 0) return
      const now = Date.now()
      // 鏃?HygieneActivity 鈫?涓枃鏍囬锛堝唴鑱旓紝閬垮厤渚濊禆宸插垹闄ょ殑 domain 甯搁噺锛?
      const HYGIENE_LABELS: Record<string, string> = {
        shower: '洗澡', brush_teeth: '刷牙', skincare: '护肤',
        shave: '刮胡子', hair_wash: '洗头', nail_care: '修剪指甲',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newEvents: any[] = []
      for (const log of logs) {
        if (!log || typeof log.date !== 'string' || !Array.isArray(log.activities)) continue
        const [y, m, d] = log.date.split('-').map(Number)
        if (!y || !m || !d) continue
        let i = 0
        for (const activity of log.activities) {
          const label = HYGIENE_LABELS[activity as string]
          if (!label) continue
          // 鏃ц褰曟棤鏃跺埢锛岄粯璁よ惤鍦ㄥ綋鏃?08:00 璧枫€佹瘡椤归棿闅?10 鍒嗛挓
          const start = new Date(y, m - 1, d, 8, i * 10).getTime()
          newEvents.push({
            id: crypto.randomUUID(),
            title: label,
            startTime: start,
            endTime: start + 5 * 60_000,
            color: 'sand',
            categoryId: 'sand',
            typedKey: 'hygiene',
            typedData: { type: 'hygiene', activity },
            goalId: null,
            createdAt: now,
            updatedAt: now,
          })
          i++
        }
      }
      if (newEvents.length > 0) await tx.table('events').bulkAdd(newEvents)
      await tx.table('hygieneLogs').clear()
    })

    // v28锛歟vents 鏂板 deletedAt 绱㈠紩锛堣蒋鍒犻櫎 tombstone锛屼负浜屾湡鍚屾棰勭暀锛?
    this.version(28).stores({
      events: 'id, startTime, endTime, projectId, goalId, deletedAt',
    }).upgrade((tx) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx.table('events').toCollection().modify((e: any) => {
        if (e.deletedAt === undefined) e.deletedAt = null
      })
    )

    // v29锛氭柊澧?todoLists 琛紱todos 鍔?listId 绱㈠紩
    this.version(29).stores({
      events: 'id, startTime, endTime, projectId, goalId, deletedAt',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, sortOrder, useCount, lastUsedAt, dailyRepeat',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
      profiles: 'id',
      outfitLogs: 'id, date', hygieneLogs: 'id, date',
      todos: 'id, status, dueDate, sortOrder, projectId, categoryId, repeatPattern, priority, domain, goalId, listId',
      goals: 'id, parentId, status, sortOrder',
      todoLists: 'id, sortOrder',
    }).upgrade(async (tx) => {
      // 鍒涘缓榛樿娓呭崟
      const now = Date.now()
      const defaultListId = 'default'
      await tx.table('todoLists').put({
        id: defaultListId, name: '榛樿', sortOrder: 0,
        createdAt: now, updatedAt: now,
      })
      // 涓虹幇鏈?todos 鍥炲～ listId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.table('todos').toCollection().modify((t: any) => {
        if (t.listId === undefined) t.listId = defaultListId
      })
    })

    // v30：新增 chroniclePhases / chronicleTasks 表（编年时间轴）
    this.version(30).stores({
      events: 'id, startTime, endTime, projectId, goalId, deletedAt',
      categories: 'id', settings: 'id',
      weeklyEstimates: 'id, weekStart, categoryId',
      projects: 'id, categoryId, name, status, sortOrder, useCount, lastUsedAt, dailyRepeat',
      inspirations: 'id, projectId, eventId',
      mealRecords: 'id, eventId', sleepRecords: 'id, eventId',
      profiles: 'id',
      outfitLogs: 'id, date', hygieneLogs: 'id, date',
      todos: 'id, status, dueDate, sortOrder, projectId, categoryId, repeatPattern, priority, domain, goalId, listId',
      goals: 'id, parentId, status, sortOrder',
      todoLists: 'id, sortOrder',
      chroniclePhases: 'id, startDate, endDate',
      chronicleTasks: 'id, date',
    })

    // 鍏ㄦ柊 DB 棣栨鍒涘缓鏃惰Е鍙戯紙version 0 鈫?any锛?
    this.on('populate', () =>
      Promise.all([
        this.categories.bulkPut([...DEFAULT_CATEGORIES]),
        this.settings.put({ ...DEFAULT_SETTINGS }),
      ])
    )

    // v1鈫抳3 upgrade 鍚?categories 鍙兘涓虹┖锛屽湪姝よˉ绉?
    this.on('ready', async () => {
      const catCount = await this.categories.count()
      if (catCount === 0) {
        await this.categories.bulkPut([...DEFAULT_CATEGORIES])
      }
    })
  }
}

export const db = new CailensDB()



