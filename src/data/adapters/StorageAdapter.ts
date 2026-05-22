import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { Project } from '@/domain/project'
import type { SOP, SOPVersion } from '@/domain/sop'
import type { InspirationLog } from '@/domain/inspiration'
import type { Profile } from '@/domain/profile'
import type { DailyOutfit, DailyHygiene, DailyLeisure, BodyMetricsRecord } from '@/domain/dailyContext'
import type { Todo } from '@/domain/todo'

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
  sops: StorageTable<SOP>
  sopVersions: StorageTable<SOPVersion>
  inspirations: StorageTable<InspirationLog>
  profile: StorageTable<Profile>
  outfitLogs: StorageTable<DailyOutfit>
  hygieneLogs: StorageTable<DailyHygiene>
  leisureLogs: StorageTable<DailyLeisure>
  bodyMetricsRecords: StorageTable<BodyMetricsRecord>
  todos: StorageTable<Todo>
  initialize(): Promise<void>
  /** Path to the storage root, or null if not configured (e.g. in-memory / IndexedDB). */
  readonly storagePath: string | null
}
