import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { Project } from '@/domain/project'
import type { InspirationLog } from '@/domain/inspiration'
import type { Profile } from '@/domain/profile'
import type { DailyOutfit } from '@/domain/dailyContext'
import type { Todo, TodoList } from '@/domain/todo'

/**
 * 旧卫生勾选记录类型。hygieneLogs 表已于 schema v27 清空并停用
 * （卫生改为类型化事件，见 domain/hygieneActivity.ts），此处仅保留
 * 最小结构以维持表的类型签名。
 */
export interface HygieneLogRecord {
  id: string
  date: string
}

export interface WhereCondition {
  key: string
  op: 'equals' | 'below' | 'above' | 'anyOf'
  value: unknown
}

export interface QueryOptions<T> {
  where?: WhereCondition
  filter?: (item: T) => boolean
  orderBy?: string
  orderDir?: 'asc' | 'desc'
  limit?: number
}

export interface StorageTable<T extends { id: string }> {
  get(id: string): Promise<T | undefined>
  getAll(): Promise<T[]>
  put(item: T): Promise<void>
  update(id: string, changes: Partial<T>): Promise<void>
  delete(id: string): Promise<void>
  bulkGet(ids: string[]): Promise<(T | undefined)[]>
  bulkPut(items: T[]): Promise<void>
  query(opts: QueryOptions<T>): Promise<T[]>
  transaction<R>(mode: 'rw', fn: () => Promise<R>): Promise<R>
}

export interface StorageAdapter {
  events: StorageTable<CalendarEvent>
  categories: StorageTable<Category>
  settings: StorageTable<AppSettings>
  weeklyEstimates: StorageTable<WeeklyEstimate>
  projects: StorageTable<Project>
  inspirations: StorageTable<InspirationLog>
  profile: StorageTable<Profile>
  outfitLogs: StorageTable<DailyOutfit>
  hygieneLogs: StorageTable<HygieneLogRecord>
  todos: StorageTable<Todo>
  todoLists: StorageTable<TodoList>
  initialize(): Promise<void>
  /** Path to the storage root, or null if not configured (e.g. in-memory / IndexedDB). */
  readonly storagePath: string | null
}
