import type { CalendarEvent } from '@/domain/event'
import type { Category, CategoryId } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { Profile } from '@/domain/profile'
import type { Project } from '@/domain/project'
import type { InspirationLog } from '@/domain/inspiration'
import type { DailyOutfit, DailyHygiene } from '@/domain/dailyContext'
import type { Todo } from '@/domain/todo'
import type { Goal } from '@/domain/goal'
import type { StorageAdapter, StorageTable, QueryOptions } from './StorageAdapter'
import {
  isTauri,
  readDirWithContent,
  readTextFile,
  writeTextFile,
  deleteFile as tauriDeleteFile,
  createDirAll,
  getNextSequence,
  watchDir,
  stopWatching as stopTauriWatching,
  onFsChange,
  type FileEntryWithContent,
} from '../tauriFs'

const CURRENT_SCHEMA_VERSION = 1

function joinPath(...parts: string[]): string {
  return parts.map((p) => p.replace(/[\\/]+/g, '/').replace(/\/$/, '')).filter(Boolean).join('/')
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function getEventDateParts(startTime: number): { year: string; month: string; day: string } {
  const d = new Date(startTime)
  return {
    year: String(d.getFullYear()),
    month: pad2(d.getMonth() + 1),
    day: pad2(d.getDate()),
  }
}

function getIsoWeek(ts: number): string {
  const d = new Date(ts)
  const dayNum = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dayNum + 3)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const weekNum = Math.round(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1 - 3) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

// ── Index types ──────────────────────────────────────────────

interface EventIndexEntry {
  event: CalendarEvent
  filePath: string
}

interface MemoryIndex {
  events: Map<string, EventIndexEntry>        // event ID → entry
  eventsByStartTime: { ts: number; id: string }[]
  eventsInitialized: boolean
  categories: Map<CategoryId, Category>
  settings: AppSettings | null
  profile: Profile | null
  estimates: Map<string, WeeklyEstimate>      // estimate ID → estimate
  estimatesByWeek: Map<number, string[]>      // weekStart → estimate IDs

  projects: Map<string, Project>
  inspirations: Map<string, InspirationLog>
  outfitLogs: Map<string, DailyOutfit>
  hygieneLogs: Map<string, DailyHygiene>
  todos: Map<string, Todo>
  goals: Map<string, Goal>
}

function binarySearchLeft(arr: { ts: number }[], value: number): number {
  let lo = 0; let hi = arr.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (arr[mid].ts < value) lo = mid + 1
    else hi = mid
  }
  return lo
}

// ── Events table ─────────────────────────────────────────────

class EventsFsTable implements StorageTable<CalendarEvent> {
  private index: MemoryIndex
  private rootPath: string

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.rootPath = rootPath
  }

  async get(id: string): Promise<CalendarEvent | undefined> {
    return this.index.events.get(id)?.event
  }

  async getAll(): Promise<CalendarEvent[]> {
    return Array.from(this.index.events.values()).map((e) => e.event)
  }

  async put(event: CalendarEvent): Promise<void> {
    const existing = this.index.events.get(event.id)
    if (existing && existing.filePath) {
      // Update existing file
      const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'event', data: event }, null, 2)
      await writeTextFile(existing.filePath, content)
      this.index.events.set(event.id, { event, filePath: existing.filePath })
      this.rebuildStartTimeIndex()
    } else {
      // Create new file
      const { year, month, day } = getEventDateParts(event.startTime)
      const dir = joinPath(this.rootPath, 'events', year, month)
      const prefix = `${year}-${month}-${day}-`
      const seq = await getNextSequence(dir, prefix)
      const fileName = `${prefix}${String(seq).padStart(3, '0')}.json`
      const filePath = joinPath(dir, fileName)
      await createDirAll(dir)
      const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'event', data: event }, null, 2)
      await writeTextFile(filePath, content)
      this.index.events.set(event.id, { event, filePath })
      this.rebuildStartTimeIndex()
    }
  }

  async update(id: string, changes: Partial<CalendarEvent>): Promise<void> {
    const existing = this.index.events.get(id)
    if (!existing) throw new Error(`Event not found: ${id}`)
    const updated = { ...existing.event, ...changes, id: existing.event.id, createdAt: existing.event.createdAt }
    await this.put(updated)
  }

  async delete(id: string): Promise<void> {
    const existing = this.index.events.get(id)
    if (existing) {
      try { await tauriDeleteFile(existing.filePath) } catch { /* ignore if already deleted */ }
      this.index.events.delete(id)
      this.rebuildStartTimeIndex()
    }
  }

  async bulkGet(ids: string[]): Promise<(CalendarEvent | undefined)[]> {
    return ids.map((id) => this.index.events.get(id)?.event)
  }

  async bulkPut(items: CalendarEvent[]): Promise<void> {
    for (const item of items) await this.put(item)
  }

  async query(opts: QueryOptions<CalendarEvent>): Promise<CalendarEvent[]> {
    let results: CalendarEvent[]

    if (opts.where?.key === 'startTime' && opts.where.op === 'below') {
      const threshold = opts.where.value as number
      const idx = binarySearchLeft(this.index.eventsByStartTime, threshold)
      results = this.index.eventsByStartTime.slice(0, idx).map((e) => this.index.events.get(e.id)!.event)
      if (opts.filter) {
        results = results.filter(opts.filter)
      }
    } else if (opts.filter) {
      results = Array.from(this.index.events.values())
        .map((e) => e.event)
        .filter(opts.filter)
    } else {
      results = Array.from(this.index.events.values()).map((e) => e.event)
    }

    if (opts.orderBy === 'endTime' && opts.orderDir === 'desc') {
      results.sort((a, b) => b.endTime - a.endTime)
    }

    if (opts.orderBy === 'startTime' && opts.orderDir === 'desc') {
      results.sort((a, b) => b.startTime - a.startTime)
    }

    if (opts.limit !== undefined) {
      results = results.slice(0, opts.limit)
    }

    return results
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  private rebuildStartTimeIndex(): void {
    this.index.eventsByStartTime = Array.from(this.index.events.entries())
      .map(([id, entry]) => ({ ts: entry.event.startTime, id }))
      .sort((a, b) => a.ts - b.ts)
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    for (const entry of entries) {
      if (!entry.path.endsWith('.json')) continue
      try {
        const parsed = JSON.parse(entry.content)
        if (parsed.type === 'event' && parsed.data) {
          const event = parsed.data as CalendarEvent
          this.index.events.set(event.id, { event, filePath: entry.path })
        }
      } catch {
        // skip unparseable files
      }
    }
    this.rebuildStartTimeIndex()
    this.index.eventsInitialized = true
  }
}

// ── Categories table (single file) ───────────────────────────

class CategoriesFsTable implements StorageTable<Category> {
  private index: MemoryIndex
  private filePath: string
  private loaded = false

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.filePath = joinPath(rootPath, 'categories.json')
  }

  private ensureLoaded(): void {
    if (!this.loaded) throw new Error('Categories not loaded. Call initialize() first.')
  }

  async get(id: string): Promise<Category | undefined> {
    this.ensureLoaded()
    return this.index.categories.get(id as CategoryId)
  }

  async getAll(): Promise<Category[]> {
    this.ensureLoaded()
    return Array.from(this.index.categories.values())
  }

  async put(item: Category): Promise<void> {
    this.ensureLoaded()
    this.index.categories.set(item.id, item)
    await this.flush()
  }

  async update(id: string, changes: Partial<Category>): Promise<void> {
    this.ensureLoaded()
    const existing = this.index.categories.get(id as CategoryId)
    if (!existing) throw new Error(`Category not found: ${id}`)
    const updated = { ...existing, ...changes, id: existing.id }
    this.index.categories.set(updated.id, updated)
    await this.flush()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_id: string): Promise<void> {
    // Categories cannot be deleted (fixed set of 6)
  }

  async bulkGet(ids: string[]): Promise<(Category | undefined)[]> {
    this.ensureLoaded()
    return ids.map((id) => this.index.categories.get(id as CategoryId))
  }

  async bulkPut(items: Category[]): Promise<void> {
    this.ensureLoaded()
    for (const item of items) {
      this.index.categories.set(item.id, item)
    }
    await this.flush()
  }

  async query(opts: QueryOptions<Category>): Promise<Category[]> {
    this.ensureLoaded()
    let results = Array.from(this.index.categories.values())
    if (opts.filter) results = results.filter(opts.filter)
    return results
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  private async flush(): Promise<void> {
    const data = Array.from(this.index.categories.values())
    const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'categories', data }, null, 2)
    await writeTextFile(this.filePath, content)
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    const catFile = entries.find((e) => e.path.endsWith('categories.json'))
    if (catFile) {
      try {
        const parsed = JSON.parse(catFile.content)
        if (parsed.type === 'categories' && Array.isArray(parsed.data)) {
          for (const cat of parsed.data as Category[]) {
            this.index.categories.set(cat.id, cat)
          }
          this.loaded = true
          return
        }
      } catch { /* fall through to seed */ }
    }
    // If categories don't exist, the migration code in db.ts handles seeding
    // But for file-system mode, the store will call loadCategories which triggers
    // the category store init. The categories are manually created in SettingsPage.
    this.loaded = true
  }
}

// ── Settings table (single file) ─────────────────────────────

class SettingsFsTable implements StorageTable<AppSettings> {
  private index: MemoryIndex
  private filePath: string
  private loaded = false

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.filePath = joinPath(rootPath, 'settings.json')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get(_id: string): Promise<AppSettings | undefined> {
    if (!this.loaded) return undefined
    return this.index.settings ?? undefined
  }

  async getAll(): Promise<AppSettings[]> {
    const s = await this.get('default')
    return s ? [s] : []
  }

  async put(item: AppSettings): Promise<void> {
    this.index.settings = item
    const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'settings', data: item }, null, 2)
    await writeTextFile(this.filePath, content)
    this.loaded = true
  }

  async update(_id: string, changes: Partial<AppSettings>): Promise<void> {
    const current = this.index.settings ?? { id: 'default' as const } as AppSettings
    const updated = { ...current, ...changes } as AppSettings
    await this.put(updated)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_id: string): Promise<void> {
    // Settings cannot be deleted
  }

  async bulkGet(ids: string[]): Promise<(AppSettings | undefined)[]> {
    const s = await this.get('default')
    return ids.map(() => s)
  }

  async bulkPut(items: AppSettings[]): Promise<void> {
    for (const item of items) await this.put(item)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async query(_opts: QueryOptions<AppSettings>): Promise<AppSettings[]> {
    return this.getAll()
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    const sFile = entries.find((e) => e.path.endsWith('settings.json'))
    if (sFile) {
      try {
        const parsed = JSON.parse(sFile.content)
        if (parsed.type === 'settings' && parsed.data) {
          this.index.settings = parsed.data as AppSettings
        }
      } catch { /* ignore */ }
    }
    this.loaded = true
  }
}

// ── Estimates table (grouped by week) ────────────────────────

class EstimatesFsTable implements StorageTable<WeeklyEstimate> {
  private index: MemoryIndex
  private estimatesDir: string

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.estimatesDir = joinPath(rootPath, 'estimates')
  }

  async get(id: string): Promise<WeeklyEstimate | undefined> {
    return this.index.estimates.get(id)
  }

  async getAll(): Promise<WeeklyEstimate[]> {
    return Array.from(this.index.estimates.values())
  }

  async put(item: WeeklyEstimate): Promise<void> {
    this.index.estimates.set(item.id, item)
    this.addToWeekIndex(item)
    await this.flushWeek(item.weekStart)
  }

  async update(id: string, changes: Partial<WeeklyEstimate>): Promise<void> {
    const existing = this.index.estimates.get(id)
    if (!existing) throw new Error(`Estimate not found: ${id}`)
    const updated = { ...existing, ...changes, id: existing.id }
    await this.put(updated)
  }

  async delete(id: string): Promise<void> {
    const existing = this.index.estimates.get(id)
    if (existing) {
      this.index.estimates.delete(id)
      const set = this.index.estimatesByWeek.get(existing.weekStart)
      if (set) {
        const idx2 = set.indexOf(id)
        if (idx2 >= 0) set.splice(idx2, 1)
        if (set.length === 0) this.index.estimatesByWeek.delete(existing.weekStart)
      }
      await this.flushWeek(existing.weekStart)
    }
  }

  async bulkGet(ids: string[]): Promise<(WeeklyEstimate | undefined)[]> {
    return ids.map((id) => this.index.estimates.get(id))
  }

  async bulkPut(items: WeeklyEstimate[]): Promise<void> {
    for (const item of items) await this.put(item)
  }

  async query(opts: QueryOptions<WeeklyEstimate>): Promise<WeeklyEstimate[]> {
    let results: WeeklyEstimate[]

    if (opts.where?.key === 'weekStart' && opts.where.op === 'equals') {
      const weekStart = opts.where.value as number
      const ids = this.index.estimatesByWeek.get(weekStart) ?? []
      results = ids.map((id) => this.index.estimates.get(id)!).filter(Boolean)
    } else if (opts.where?.key === 'weekStart' && opts.where.op === 'anyOf') {
      const weekStarts = opts.where.value as number[]
      results = weekStarts.flatMap((ws) => {
        const ids = this.index.estimatesByWeek.get(ws) ?? []
        return ids.map((id) => this.index.estimates.get(id)!).filter(Boolean)
      })
    } else {
      results = Array.from(this.index.estimates.values())
    }

    if (opts.filter) results = results.filter(opts.filter)
    if (opts.limit !== undefined) results = results.slice(0, opts.limit)

    return results
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  private addToWeekIndex(item: WeeklyEstimate): void {
    let ids = this.index.estimatesByWeek.get(item.weekStart)
    if (!ids) {
      ids = []
      this.index.estimatesByWeek.set(item.weekStart, ids)
    }
    if (!ids.includes(item.id)) {
      ids.push(item.id)
    }
  }

  private async flushWeek(weekStart: number): Promise<void> {
    const ids = this.index.estimatesByWeek.get(weekStart) ?? []
    const data = ids.map((id) => this.index.estimates.get(id)!).filter(Boolean)
    const weekKey = getIsoWeek(weekStart)
    const filePath = joinPath(this.estimatesDir, `${weekKey}.json`)
    await createDirAll(this.estimatesDir)
    const content = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      type: 'estimates',
      weekStart,
      data,
    }, null, 2)
    await writeTextFile(filePath, content)
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    for (const entry of entries) {
      if (!entry.path.endsWith('.json') || !entry.path.replace(/\\/g, '/').includes('/estimates/')) continue
      try {
        const parsed = JSON.parse(entry.content)
        if (parsed.type === 'estimates' && Array.isArray(parsed.data)) {
          for (const est of parsed.data as WeeklyEstimate[]) {
            this.index.estimates.set(est.id, est)
            this.addToWeekIndex(est)
          }
        }
      } catch { /* skip */ }
    }
  }
}








class ProjectsFsTable implements StorageTable<Project> {
  private index: MemoryIndex
  private filePath: string

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.filePath = joinPath(rootPath, 'projects.json')
  }

  async get(id: string): Promise<Project | undefined> {
    return this.index.projects.get(id)
  }

  async getAll(): Promise<Project[]> {
    return Array.from(this.index.projects.values())
  }

  async put(item: Project): Promise<void> {
    this.index.projects.set(item.id, item)
    await this.flush()
  }

  async update(id: string, changes: Partial<Project>): Promise<void> {
    const existing = this.index.projects.get(id)
    if (!existing) return
    await this.put({ ...existing, ...changes, id: existing.id })
  }

  async delete(id: string): Promise<void> {
    this.index.projects.delete(id)
    await this.flush()
  }

  async bulkGet(ids: string[]): Promise<(Project | undefined)[]> {
    return ids.map((id) => this.index.projects.get(id))
  }

  async bulkPut(items: Project[]): Promise<void> {
    for (const item of items) {
      this.index.projects.set(item.id, item)
    }
    await this.flush()
  }

  async query(opts: QueryOptions<Project>): Promise<Project[]> {
    let results = Array.from(this.index.projects.values())
    if (opts.where?.key === 'categoryId' && opts.where.op === 'equals') {
      const target = opts.where.value as string
      results = results.filter((p) => p.categoryId === target)
    }
    if (opts.filter) results = results.filter(opts.filter)
    if (opts.limit !== undefined) results = results.slice(0, opts.limit)
    return results
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  private async flush(): Promise<void> {
    const data = Array.from(this.index.projects.values())
    const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'projects', data }, null, 2)
    await writeTextFile(this.filePath, content)
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    const file = entries.find((e) => e.path.endsWith('projects.json'))
    if (file) {
      try {
        const parsed = JSON.parse(file.content)
        if (parsed.type === 'projects' && Array.isArray(parsed.data)) {
          for (const item of parsed.data as Project[]) {
            this.index.projects.set(item.id, item)
          }
        }
      } catch { /* ignore */ }
    }
  }
}

// ── Todos table (single file: todos.json) ────────────────────

class TodosFsTable implements StorageTable<Todo> {
  private index: MemoryIndex
  private filePath: string

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.filePath = joinPath(rootPath, 'todos.json')
  }

  async get(id: string): Promise<Todo | undefined> {
    return this.index.todos.get(id)
  }

  async getAll(): Promise<Todo[]> {
    return Array.from(this.index.todos.values())
  }

  async put(item: Todo): Promise<void> {
    this.index.todos.set(item.id, item)
    await this.flush()
  }

  async update(id: string, changes: Partial<Todo>): Promise<void> {
    const existing = this.index.todos.get(id)
    if (!existing) return
    await this.put({ ...existing, ...changes, id: existing.id })
  }

  async delete(id: string): Promise<void> {
    this.index.todos.delete(id)
    await this.flush()
  }

  async bulkGet(ids: string[]): Promise<(Todo | undefined)[]> {
    return ids.map((id) => this.index.todos.get(id))
  }

  async bulkPut(items: Todo[]): Promise<void> {
    for (const item of items) {
      this.index.todos.set(item.id, item)
    }
    await this.flush()
  }

  async query(opts: QueryOptions<Todo>): Promise<Todo[]> {
    let results = Array.from(this.index.todos.values())
    if (opts.filter) results = results.filter(opts.filter)
    if (opts.limit !== undefined) results = results.slice(0, opts.limit)
    return results
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  private async flush(): Promise<void> {
    const data = Array.from(this.index.todos.values())
    const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'todos', data }, null, 2)
    await writeTextFile(this.filePath, content)
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    const file = entries.find((e) => e.path.endsWith('todos.json'))
    if (file) {
      try {
        const parsed = JSON.parse(file.content)
        if (parsed.type === 'todos' && Array.isArray(parsed.data)) {
          for (const item of parsed.data as Todo[]) {
            this.index.todos.set(item.id, item)
          }
        }
      } catch { /* ignore */ }
    }
  }
}

// ── Goals table (single file: goals.json) ───────────────────

class GoalsFsTable implements StorageTable<Goal> {
  private index: MemoryIndex
  private filePath: string

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.filePath = joinPath(rootPath, 'goals.json')
  }

  async get(id: string): Promise<Goal | undefined> {
    return this.index.goals.get(id)
  }

  async getAll(): Promise<Goal[]> {
    return Array.from(this.index.goals.values())
  }

  async put(item: Goal): Promise<void> {
    this.index.goals.set(item.id, item)
    await this.flush()
  }

  async update(id: string, changes: Partial<Goal>): Promise<void> {
    const existing = this.index.goals.get(id)
    if (!existing) return
    await this.put({ ...existing, ...changes, id: existing.id })
  }

  async delete(id: string): Promise<void> {
    this.index.goals.delete(id)
    await this.flush()
  }

  async bulkGet(ids: string[]): Promise<(Goal | undefined)[]> {
    return ids.map((id) => this.index.goals.get(id))
  }

  async bulkPut(items: Goal[]): Promise<void> {
    for (const item of items) {
      this.index.goals.set(item.id, item)
    }
    await this.flush()
  }

  async query(opts: QueryOptions<Goal>): Promise<Goal[]> {
    let results = Array.from(this.index.goals.values())
    if (opts.filter) results = results.filter(opts.filter)
    if (opts.limit !== undefined) results = results.slice(0, opts.limit)
    return results
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  private async flush(): Promise<void> {
    const data = Array.from(this.index.goals.values())
    const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'goals', data }, null, 2)
    await writeTextFile(this.filePath, content)
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    const file = entries.find((e) => e.path.endsWith('goals.json'))
    if (file) {
      try {
        const parsed = JSON.parse(file.content)
        if (parsed.type === 'goals' && Array.isArray(parsed.data)) {
          for (const item of parsed.data as Goal[]) {
            this.index.goals.set(item.id, item)
          }
        }
      } catch { /* ignore */ }
    }
  }
}

/**
 * 简化的内存表（无文件持久化），用于 SOP、灵感等次要实体。
 * 后续可改为文件持久化模式。
 */
class GenericFsTable<T extends { id: string }> implements StorageTable<T> {
  private map: Map<string, T>
  constructor(index: MemoryIndex, key: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.map = (index as any)[key] as Map<string, T>
  }
  async get(id: string) { return this.map.get(id) }
  async getAll() { return Array.from(this.map.values()) }
  async put(item: T) { this.map.set(item.id, item) }
  async update(id: string, changes: Partial<T>) {
    const existing = this.map.get(id)
    if (existing) this.map.set(id, { ...existing, ...changes, id: existing.id })
  }
  async delete(id: string) { this.map.delete(id) }
  async bulkGet(ids: string[]) { return ids.map((id) => this.map.get(id)) }
  async bulkPut(items: T[]) { for (const item of items) this.map.set(item.id, item) }
  async query(opts: QueryOptions<T>) {
    let results = Array.from(this.map.values())
    if (opts.filter) results = results.filter(opts.filter)
    if (opts.limit !== undefined) results = results.slice(0, opts.limit)
    return results
  }
  async transaction<R>(_mode: 'rw', fn: () => Promise<R>) { return fn() }
}

// ── Profile table (single file: profile.json) ─────────────

class ProfileFsTable implements StorageTable<Profile> {
  private index: MemoryIndex
  private filePath: string

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.filePath = joinPath(rootPath, 'profile.json')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get(_id: string): Promise<Profile | undefined> {
    return this.index.profile ?? undefined
  }

  async getAll(): Promise<Profile[]> {
    const p = await this.get('default')
    return p ? [p] : []
  }

  async put(item: Profile): Promise<void> {
    this.index.profile = item
    const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'profile', data: item }, null, 2)
    await writeTextFile(this.filePath, content)
  }

  async update(_id: string, changes: Partial<Profile>): Promise<void> {
    const current = this.index.profile ?? { id: 'default' as const, body: {} as Profile['body'], updatedAt: null } as Profile
    const updated = { ...current, ...changes } as Profile
    await this.put(updated)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_id: string): Promise<void> {
    // Profile cannot be deleted
  }

  async bulkGet(ids: string[]): Promise<(Profile | undefined)[]> {
    const p = await this.get('default')
    return ids.map(() => p)
  }

  async bulkPut(items: Profile[]): Promise<void> {
    for (const item of items) await this.put(item)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async query(_opts: QueryOptions<Profile>): Promise<Profile[]> {
    return this.getAll()
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    const file = entries.find((e) => e.path.endsWith('profile.json'))
    if (file) {
      try {
        const parsed = JSON.parse(file.content)
        if (parsed.type === 'profile' && parsed.data) {
          this.index.profile = parsed.data as Profile
        }
      } catch { /* ignore */ }
    }
  }
}

// ── FileSystemAdapter ────────────────────────────────────────

export class FileSystemAdapter implements StorageAdapter {
  events: StorageTable<CalendarEvent>
  categories: StorageTable<Category>
  settings: StorageTable<AppSettings>
  weeklyEstimates: StorageTable<WeeklyEstimate>
  profile: StorageTable<Profile>

  projects: StorageTable<Project>
  inspirations: StorageTable<InspirationLog>
  outfitLogs: StorageTable<DailyOutfit>
  hygieneLogs: StorageTable<DailyHygiene>
  todos: StorageTable<Todo>
  goals: StorageTable<Goal>

  private index: MemoryIndex = {
    events: new Map(),
    eventsByStartTime: [],
    eventsInitialized: false,
    categories: new Map(),
    settings: null,
    profile: null,
    estimates: new Map(),
    estimatesByWeek: new Map(),

    projects: new Map(),
    inspirations: new Map(),
    outfitLogs: new Map(),
    hygieneLogs: new Map(),
    todos: new Map(),
    goals: new Map(),
  }

  private rootPath: string | null = null
  private _initialized = false
  private unlistenFs: (() => void) | null = null

  constructor() {
    this.events = new EventsFsTable(this.index, '')
    this.categories = new CategoriesFsTable(this.index, '')
    this.settings = new SettingsFsTable(this.index, '')
    this.weeklyEstimates = new EstimatesFsTable(this.index, '')
    this.profile = new ProfileFsTable(this.index, '')

    this.projects = new ProjectsFsTable(this.index, '')
    this.inspirations = new GenericFsTable(this.index, 'inspirations')
    this.outfitLogs = new GenericFsTable(this.index, 'outfitLogs')
    this.hygieneLogs = new GenericFsTable(this.index, 'hygieneLogs')
    this.todos = new TodosFsTable(this.index, '')
    this.goals = new GoalsFsTable(this.index, '')
  }

  get initialized(): boolean {
    return this._initialized
  }

  get storagePath(): string | null {
    return this.rootPath
  }

  setRootPath(path: string): void {
    this.rootPath = path.replace(/[\\/]+/g, '/').replace(/\/+$/, '')
    // Re-create tables with the updated root path
    this.events = new EventsFsTable(this.index, this.rootPath)
    this.categories = new CategoriesFsTable(this.index, this.rootPath)
    this.settings = new SettingsFsTable(this.index, this.rootPath)
    this.weeklyEstimates = new EstimatesFsTable(this.index, this.rootPath)
    this.profile = new ProfileFsTable(this.index, this.rootPath)

    this.projects = new ProjectsFsTable(this.index, this.rootPath)
    this.inspirations = new GenericFsTable(this.index, 'inspirations')
    this.outfitLogs = new GenericFsTable(this.index, 'outfitLogs')
    this.hygieneLogs = new GenericFsTable(this.index, 'hygieneLogs')
    this.todos = new TodosFsTable(this.index, this.rootPath)
    this.goals = new GoalsFsTable(this.index, this.rootPath)
  }

  async initialize(): Promise<void> {
    if (!isTauri()) {
      throw new Error('FileSystemAdapter requires Tauri environment')
    }

    // Read root path from app config
    try {
      const { appDataDir } = await import('@tauri-apps/api/path')
      const appDir = await appDataDir()
      const configPath = joinPath(appDir, 'cailens-config.json')
      const configContent = await readTextFile(configPath)
      const config = JSON.parse(configContent)
      if (config.storagePath) {
        this.setRootPath(config.storagePath)
      }
    } catch {
      // No config yet �?folder selector will set it
    }

    if (this.rootPath) {
      await this.fullScan()
    }

    this._initialized = true
  }

  async fullScan(): Promise<void> {
    if (!this.rootPath) return
    const entries = await readDirWithContent(this.rootPath)

    // Load each table from the in-memory entries (no per-file IPC)
    await (this.categories as CategoriesFsTable).loadFromScan(entries)
    await (this.settings as SettingsFsTable).loadFromScan(entries)
    await (this.profile as ProfileFsTable).loadFromScan(entries)
    await (this.weeklyEstimates as EstimatesFsTable).loadFromScan(entries)
    await (this.projects as ProjectsFsTable).loadFromScan(entries)
    await (this.todos as TodosFsTable).loadFromScan(entries)
    await (this.goals as GoalsFsTable).loadFromScan(entries)

    await (this.events as EventsFsTable).loadFromScan(entries)
  }

  async startWatching(onChange: () => void): Promise<void> {
    if (!this.rootPath) return
    await watchDir(this.rootPath)
    this.unlistenFs = await onFsChange(() => {
      // Debounce �?re-scan on any change
      this.fullScan().then(onChange).catch(() => {})
    })
  }

  async stopWatching(): Promise<void> {
    if (this.unlistenFs) {
      this.unlistenFs()
      this.unlistenFs = null
    }
    try { await stopTauriWatching() } catch { /* ignore */ }
  }

  /** Save the storage root path to Tauri app config */
  async persistConfig(): Promise<void> {
    if (!this.rootPath) return
    const { appDataDir } = await import('@tauri-apps/api/path')
    const appDir = await appDataDir()
    const configPath = joinPath(appDir, 'cailens-config.json')
    await createDirAll(appDir)
    const content = JSON.stringify({ storagePath: this.rootPath, schemaVersion: CURRENT_SCHEMA_VERSION }, null, 2)
    await writeTextFile(configPath, content)
  }
}
