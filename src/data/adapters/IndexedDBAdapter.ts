import Dexie from 'dexie'
import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { Profile } from '@/domain/profile'
import type { Project } from '@/domain/project'
import type { InspirationLog } from '@/domain/inspiration'
import type { DailyOutfit, DailyHygiene, DailyLeisure, BodyMetricsRecord } from '@/domain/dailyContext'
import type { Todo } from '@/domain/todo'
import type { StorageAdapter, StorageTable, QueryOptions } from './StorageAdapter'
import { CailensDB, db as dexieDb } from '../db'

class IndexedDBTable<T extends { id: string }> implements StorageTable<T> {
  private table: Dexie.Table<T, any>

  constructor(table: Dexie.Table<T, any>) {
    this.table = table
  }

  async get(id: string): Promise<T | undefined> {
    return this.table.get(id)
  }

  async getAll(): Promise<T[]> {
    return this.table.toArray()
  }

  async put(item: T): Promise<void> {
    await this.table.put(item)
  }

  async update(id: string, changes: Partial<T>): Promise<void> {
    await (this.table as Dexie.Table<T, string>).update(id, changes as any)
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id)
  }

  async bulkGet(ids: string[]): Promise<(T | undefined)[]> {
    return this.table.bulkGet(ids)
  }

  async bulkPut(items: T[]): Promise<void> {
    await this.table.bulkPut(items)
  }

  async query(opts: QueryOptions<T>): Promise<T[]> {
    let collection: Dexie.Collection<T, string>

    if (opts.where) {
      const { key, op, value } = opts.where
      switch (op) {
        case 'equals':
          collection = this.table.where(key).equals(value as never)
          break
        case 'below':
          collection = this.table.where(key).below(value as never)
          break
        case 'above':
          collection = this.table.where(key).above(value as never)
          break
        case 'anyOf':
          collection = this.table.where(key).anyOf(value as never[])
          break
        default:
          collection = this.table.toCollection() as Dexie.Collection<T, string>
      }
    } else if (opts.orderBy) {
      collection = this.table.orderBy(opts.orderBy) as Dexie.Collection<T, string>
    } else {
      collection = this.table.toCollection() as Dexie.Collection<T, string>
    }

    if (opts.filter) {
      collection = collection.and(opts.filter)
    }

    // For desc ordering with limit (e.g., getLatest): apply limit AFTER in-memory sort
    const needsDescSort = opts.orderBy && opts.orderDir === 'desc'

    if (opts.limit !== undefined && !needsDescSort) {
      collection = collection.limit(opts.limit)
    }

    if (needsDescSort) {
      const results = await collection.toArray()
      results.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[opts.orderBy!]
        const bVal = (b as Record<string, unknown>)[opts.orderBy!]
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return bVal - aVal
        }
        return String(bVal).localeCompare(String(aVal))
      })
      if (opts.limit !== undefined) {
        return results.slice(0, opts.limit)
      }
      return results
    }

    return collection.toArray()
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return this.table.db.transaction('rw', this.table as unknown as Dexie.Table, fn)
  }
}

export class IndexedDBAdapter implements StorageAdapter {
  events: StorageTable<CalendarEvent>
  categories: StorageTable<Category>
  settings: StorageTable<AppSettings>
  weeklyEstimates: StorageTable<WeeklyEstimate>
  profile: StorageTable<Profile>

  projects: StorageTable<Project>
  inspirations: StorageTable<InspirationLog>

  outfitLogs: StorageTable<DailyOutfit>
  hygieneLogs: StorageTable<DailyHygiene>
  leisureLogs: StorageTable<DailyLeisure>
  bodyMetricsRecords: StorageTable<BodyMetricsRecord>
  todos: StorageTable<Todo>

  private db: CailensDB

  constructor(db: CailensDB) {
    this.db = db
    this.events = new IndexedDBTable(db.events)
    this.categories = new IndexedDBTable(db.categories)
    this.settings = new IndexedDBTable(db.settings)
    this.weeklyEstimates = new IndexedDBTable(db.weeklyEstimates)
    this.profile = new IndexedDBTable(db.profiles)

    this.projects = new IndexedDBTable(db.projects)
    this.inspirations = new IndexedDBTable(db.inspirations)

    this.outfitLogs = new IndexedDBTable(db.outfitLogs)
    this.hygieneLogs = new IndexedDBTable(db.hygieneLogs)
    this.leisureLogs = new IndexedDBTable(db.leisureLogs)
    this.bodyMetricsRecords = new IndexedDBTable(db.bodyMetricsRecords)
    this.todos = new IndexedDBTable(db.todos)
  }

  readonly storagePath: string | null = null

  async initialize(): Promise<void> {
    await this.db.open()
  }
}

export const indexedDBAdapter = new IndexedDBAdapter(dexieDb)
