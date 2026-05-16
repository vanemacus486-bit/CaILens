import type { CalendarEvent } from '@/domain/event'
import type { Category, CategoryId } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { AiConversation, AiChatMessage } from '@/domain/aiChat'
import type { PinnedAnalysis, MessageFeedback } from '@/domain/aiChat'
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
  estimates: Map<string, WeeklyEstimate>      // estimate ID → estimate
  estimatesByWeek: Map<number, string[]>      // weekStart → estimate IDs
  conversations: Map<string, AiConversation>   // conversation ID → conversation
  conversationsByWeek: Map<number, string[]>   // weekStart → conversation IDs
  chatMessages: Map<string, AiChatMessage[]>   // conversationId → messages
  pinnedAnalyses: Map<string, PinnedAnalysis>
  messageFeedback: Map<string, MessageFeedback>
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
    let results: CalendarEvent[] = []

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

// ── Conversations table ───────────────────────────────────────

class ConversationsFsTable implements StorageTable<AiConversation> {
  private index: MemoryIndex
  private filePath: string

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.filePath = joinPath(rootPath, 'conversations.json')
  }

  async get(id: string): Promise<AiConversation | undefined> {
    return this.index.conversations.get(id)
  }

  async getAll(): Promise<AiConversation[]> {
    return Array.from(this.index.conversations.values())
  }

  async put(item: AiConversation): Promise<void> {
    this.index.conversations.set(item.id, item)
    const weekIds = this.index.conversationsByWeek.get(item.weekStart) ?? []
    if (!weekIds.includes(item.id)) {
      weekIds.push(item.id)
      this.index.conversationsByWeek.set(item.weekStart, weekIds)
    }
    await this.flush()
  }

  async update(id: string, changes: Partial<AiConversation>): Promise<void> {
    const existing = this.index.conversations.get(id)
    if (!existing) return
    await this.put({ ...existing, ...changes, id: existing.id })
  }

  async delete(id: string): Promise<void> {
    const existing = this.index.conversations.get(id)
    if (existing) {
      this.index.conversations.delete(id)
      const weekIds = this.index.conversationsByWeek.get(existing.weekStart) ?? []
      const idx = weekIds.indexOf(id)
      if (idx >= 0) weekIds.splice(idx, 1)
      if (weekIds.length === 0) this.index.conversationsByWeek.delete(existing.weekStart)
      else this.index.conversationsByWeek.set(existing.weekStart, weekIds)
      this.index.chatMessages.delete(id)
      await this.flush()
    }
  }

  async bulkGet(ids: string[]): Promise<(AiConversation | undefined)[]> {
    return ids.map((id) => this.index.conversations.get(id))
  }

  async bulkPut(items: AiConversation[]): Promise<void> {
    for (const item of items) await this.put(item)
  }

  async query(opts: QueryOptions<AiConversation>): Promise<AiConversation[]> {
    let results: AiConversation[]
    if (opts.where?.key === 'weekStart' && opts.where.op === 'equals') {
      const ids = this.index.conversationsByWeek.get(opts.where.value as number) ?? []
      results = ids.map((id) => this.index.conversations.get(id)!).filter(Boolean)
    } else {
      results = Array.from(this.index.conversations.values())
    }
    if (opts.filter) results = results.filter(opts.filter)
    if (opts.orderBy === 'updatedAt') {
      results.sort((a, b) => b.updatedAt - a.updatedAt)
    }
    if (opts.limit !== undefined) results = results.slice(0, opts.limit)
    return results
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  private async flush(): Promise<void> {
    const data = Array.from(this.index.conversations.values())
    const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'conversations', data }, null, 2)
    await writeTextFile(this.filePath, content)
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    const file = entries.find((e) => e.path.endsWith('conversations.json'))
    if (file) {
      try {
        const parsed = JSON.parse(file.content)
        if (parsed.type === 'conversations' && Array.isArray(parsed.data)) {
          for (const conv of parsed.data as AiConversation[]) {
            this.index.conversations.set(conv.id, conv)
            const weekIds = this.index.conversationsByWeek.get(conv.weekStart) ?? []
            if (!weekIds.includes(conv.id)) weekIds.push(conv.id)
            this.index.conversationsByWeek.set(conv.weekStart, weekIds)
          }
        }
      } catch { /* ignore */ }
    }
  }
}

// ── Chat Messages table ───────────────────────────────────────

class ChatMessagesFsTable implements StorageTable<AiChatMessage> {
  private index: MemoryIndex
  private messagesDir: string

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.messagesDir = joinPath(rootPath, 'chat-messages')
  }

  async get(id: string): Promise<AiChatMessage | undefined> {
    for (const msgs of this.index.chatMessages.values()) {
      const found = msgs.find((m) => m.id === id)
      if (found) return found
    }
    return undefined
  }

  async getAll(): Promise<AiChatMessage[]> {
    const all: AiChatMessage[] = []
    for (const msgs of this.index.chatMessages.values()) {
      all.push(...msgs)
    }
    return all
  }

  async put(item: AiChatMessage): Promise<void> {
    const msgs = this.index.chatMessages.get(item.conversationId) ?? []
    const idx = msgs.findIndex((m) => m.id === item.id)
    if (idx >= 0) msgs[idx] = item
    else msgs.push(item)
    this.index.chatMessages.set(item.conversationId, msgs)
    await this.flushConversation(item.conversationId)
  }

  async update(id: string, changes: Partial<AiChatMessage>): Promise<void> {
    const msg = await this.get(id)
    if (!msg) return
    await this.put({ ...msg, ...changes, id: msg.id })
  }

  async delete(id: string): Promise<void> {
    for (const [convId, msgs] of this.index.chatMessages) {
      const idx = msgs.findIndex((m) => m.id === id)
      if (idx >= 0) {
        msgs.splice(idx, 1)
        this.index.chatMessages.set(convId, msgs)
        await this.flushConversation(convId)
        return
      }
    }
  }

  async bulkGet(ids: string[]): Promise<(AiChatMessage | undefined)[]> {
    return Promise.all(ids.map((id) => this.get(id)))
  }

  async bulkPut(items: AiChatMessage[]): Promise<void> {
    const byConv = new Map<string, AiChatMessage[]>()
    for (const item of items) {
      const msgs = byConv.get(item.conversationId) ?? []
      msgs.push(item)
      byConv.set(item.conversationId, msgs)
    }
    for (const item of items) {
      const msgs = this.index.chatMessages.get(item.conversationId) ?? []
      const idx = msgs.findIndex((m) => m.id === item.id)
      if (idx >= 0) msgs[idx] = item
      else msgs.push(item)
      this.index.chatMessages.set(item.conversationId, msgs)
    }
    for (const convId of byConv.keys()) {
      await this.flushConversation(convId)
    }
  }

  async query(opts: QueryOptions<AiChatMessage>): Promise<AiChatMessage[]> {
    let results: AiChatMessage[]
    if (opts.where?.key === 'conversationId' && opts.where.op === 'equals') {
      results = this.index.chatMessages.get(opts.where.value as string) ?? []
    } else {
      results = await this.getAll()
    }
    if (opts.filter) results = results.filter(opts.filter)
    if (opts.orderBy === 'createdAt') {
      results.sort((a, b) => a.createdAt - b.createdAt)
    }
    if (opts.limit !== undefined) results = results.slice(0, opts.limit)
    return results
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  private async flushConversation(convId: string): Promise<void> {
    const msgs = this.index.chatMessages.get(convId) ?? []
    const filePath = joinPath(this.messagesDir, `${convId}.json`)
    await createDirAll(this.messagesDir)
    const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'chatMessages', conversationId: convId, data: msgs }, null, 2)
    await writeTextFile(filePath, content)
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    for (const entry of entries) {
      if (!entry.path.endsWith('.json') || !entry.path.replace(/\\/g, '/').includes('/chat-messages/')) continue
      try {
        const parsed = JSON.parse(entry.content)
        if (parsed.type === 'chatMessages' && Array.isArray(parsed.data)) {
          const convId = parsed.conversationId as string
          this.index.chatMessages.set(convId, parsed.data as AiChatMessage[])
        }
      } catch { /* ignore */ }
    }
  }
}

// ── Pinned Analyses table (single file) ───────────────────────

class PinnedAnalysesFsTable implements StorageTable<PinnedAnalysis> {
  private index: MemoryIndex
  private filePath: string

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.filePath = joinPath(rootPath, 'pinned-analyses.json')
  }

  async get(id: string): Promise<PinnedAnalysis | undefined> {
    return this.index.pinnedAnalyses.get(id)
  }

  async getAll(): Promise<PinnedAnalysis[]> {
    return Array.from(this.index.pinnedAnalyses.values())
  }

  async put(item: PinnedAnalysis): Promise<void> {
    this.index.pinnedAnalyses.set(item.id, item)
    await this.flush()
  }

  async update(id: string, changes: Partial<PinnedAnalysis>): Promise<void> {
    const existing = this.index.pinnedAnalyses.get(id)
    if (!existing) return
    await this.put({ ...existing, ...changes, id: existing.id })
  }

  async delete(id: string): Promise<void> {
    this.index.pinnedAnalyses.delete(id)
    await this.flush()
  }

  async bulkGet(ids: string[]): Promise<(PinnedAnalysis | undefined)[]> {
    return ids.map((id) => this.index.pinnedAnalyses.get(id))
  }

  async bulkPut(items: PinnedAnalysis[]): Promise<void> {
    for (const item of items) {
      this.index.pinnedAnalyses.set(item.id, item)
    }
    await this.flush()
  }

  async query(opts: QueryOptions<PinnedAnalysis>): Promise<PinnedAnalysis[]> {
    let results = Array.from(this.index.pinnedAnalyses.values())
    if (opts.where?.key === 'date' && opts.where.op === 'equals') {
      const target = opts.where.value as number
      results = results.filter((p) => {
        const d1 = new Date(p.date).toDateString()
        const d2 = new Date(target).toDateString()
        return d1 === d2
      })
    }
    if (opts.filter) results = results.filter(opts.filter)
    if (opts.orderBy === 'date' && opts.orderDir === 'desc') {
      results.sort((a, b) => b.date - a.date)
    }
    if (opts.limit !== undefined) results = results.slice(0, opts.limit)
    return results
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  private async flush(): Promise<void> {
    const data = Array.from(this.index.pinnedAnalyses.values())
    const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'pinnedAnalyses', data }, null, 2)
    await writeTextFile(this.filePath, content)
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    const file = entries.find((e) => e.path.endsWith('pinned-analyses.json'))
    if (file) {
      try {
        const parsed = JSON.parse(file.content)
        if (parsed.type === 'pinnedAnalyses' && Array.isArray(parsed.data)) {
          for (const item of parsed.data as PinnedAnalysis[]) {
            this.index.pinnedAnalyses.set(item.id, item)
          }
        }
      } catch { /* ignore */ }
    }
  }
}

// ── Message Feedback table (single file) ─────────────────────

class MessageFeedbackFsTable implements StorageTable<MessageFeedback> {
  private index: MemoryIndex
  private filePath: string

  constructor(index: MemoryIndex, rootPath: string) {
    this.index = index
    this.filePath = joinPath(rootPath, 'message-feedback.json')
  }

  async get(id: string): Promise<MessageFeedback | undefined> {
    return this.index.messageFeedback.get(id)
  }

  async getAll(): Promise<MessageFeedback[]> {
    return Array.from(this.index.messageFeedback.values())
  }

  async put(item: MessageFeedback): Promise<void> {
    this.index.messageFeedback.set(item.id, item)
    await this.flush()
  }

  async update(id: string, changes: Partial<MessageFeedback>): Promise<void> {
    const existing = this.index.messageFeedback.get(id)
    if (!existing) return
    await this.put({ ...existing, ...changes, id: existing.id })
  }

  async delete(id: string): Promise<void> {
    this.index.messageFeedback.delete(id)
    await this.flush()
  }

  async bulkGet(ids: string[]): Promise<(MessageFeedback | undefined)[]> {
    return ids.map((id) => this.index.messageFeedback.get(id))
  }

  async bulkPut(items: MessageFeedback[]): Promise<void> {
    for (const item of items) {
      this.index.messageFeedback.set(item.id, item)
    }
    await this.flush()
  }

  async query(opts: QueryOptions<MessageFeedback>): Promise<MessageFeedback[]> {
    let results = Array.from(this.index.messageFeedback.values())
    if (opts.where?.key === 'messageId' && opts.where.op === 'equals') {
      results = results.filter((f) => f.messageId === opts.where!.value)
    }
    if (opts.filter) results = results.filter(opts.filter)
    return results
  }

  async transaction<R>(_mode: 'rw', fn: () => Promise<R>): Promise<R> {
    return fn()
  }

  private async flush(): Promise<void> {
    const data = Array.from(this.index.messageFeedback.values())
    const content = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, type: 'messageFeedback', data }, null, 2)
    await writeTextFile(this.filePath, content)
  }

  async loadFromScan(entries: FileEntryWithContent[]): Promise<void> {
    const file = entries.find((e) => e.path.endsWith('message-feedback.json'))
    if (file) {
      try {
        const parsed = JSON.parse(file.content)
        if (parsed.type === 'messageFeedback' && Array.isArray(parsed.data)) {
          for (const item of parsed.data as MessageFeedback[]) {
            this.index.messageFeedback.set(item.id, item)
          }
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
  conversations: StorageTable<AiConversation>
  chatMessages: StorageTable<AiChatMessage>
  pinnedAnalyses: StorageTable<PinnedAnalysis>
  messageFeedback: StorageTable<MessageFeedback>

  private index: MemoryIndex = {
    events: new Map(),
    eventsByStartTime: [],
    eventsInitialized: false,
    categories: new Map(),
    settings: null,
    estimates: new Map(),
    estimatesByWeek: new Map(),
    conversations: new Map(),
    conversationsByWeek: new Map(),
    chatMessages: new Map(),
    pinnedAnalyses: new Map(),
    messageFeedback: new Map(),
  }

  private rootPath: string | null = null
  private _initialized = false
  private unlistenFs: (() => void) | null = null

  constructor() {
    this.events = new EventsFsTable(this.index, '')
    this.categories = new CategoriesFsTable(this.index, '')
    this.settings = new SettingsFsTable(this.index, '')
    this.weeklyEstimates = new EstimatesFsTable(this.index, '')
    this.conversations = new ConversationsFsTable(this.index, '')
    this.chatMessages = new ChatMessagesFsTable(this.index, '')
    this.pinnedAnalyses = new PinnedAnalysesFsTable(this.index, '')
    this.messageFeedback = new MessageFeedbackFsTable(this.index, '')
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
    this.conversations = new ConversationsFsTable(this.index, this.rootPath)
    this.chatMessages = new ChatMessagesFsTable(this.index, this.rootPath)
    this.pinnedAnalyses = new PinnedAnalysesFsTable(this.index, this.rootPath)
    this.messageFeedback = new MessageFeedbackFsTable(this.index, this.rootPath)
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
      // No config yet — folder selector will set it
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
    await (this.weeklyEstimates as EstimatesFsTable).loadFromScan(entries)
    await (this.conversations as ConversationsFsTable).loadFromScan(entries)
    await (this.chatMessages as ChatMessagesFsTable).loadFromScan(entries)
    await (this.pinnedAnalyses as PinnedAnalysesFsTable).loadFromScan(entries)
    await (this.messageFeedback as MessageFeedbackFsTable).loadFromScan(entries)
    await (this.events as EventsFsTable).loadFromScan(entries)
  }

  async startWatching(onChange: () => void): Promise<void> {
    if (!this.rootPath) return
    await watchDir(this.rootPath)
    this.unlistenFs = await onFsChange(() => {
      // Debounce — re-scan on any change
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
