import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { AiConversation, AiChatMessage, PinnedAnalysis, MessageFeedback } from '@/domain/aiChat'

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
  conversations: StorageTable<AiConversation>
  chatMessages: StorageTable<AiChatMessage>
  pinnedAnalyses: StorageTable<PinnedAnalysis>
  messageFeedback: StorageTable<MessageFeedback>
  initialize(): Promise<void>
  /** Path to the storage root, or null if not configured (e.g. in-memory / IndexedDB). */
  readonly storagePath: string | null
}
