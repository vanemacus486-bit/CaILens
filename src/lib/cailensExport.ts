import { getAdapterSync } from '@/data/adapterFactory'
import type { StorageAdapter, StorageTable } from '@/data/adapters/StorageAdapter'
import { saveTextFile } from '@/lib/nativeShare'
import type { CalendarEvent } from '@/domain/event'
import type { Category, KeywordFolder } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { Project } from '@/domain/project'
import type { InspirationLog } from '@/domain/inspiration'
import type { Profile } from '@/domain/profile'
import type { DailyOutfit } from '@/domain/dailyContext'
import type { Todo, TodoList } from '@/domain/todo'
import type { ChroniclePhase, ChronicleTask } from '@/domain/chronicle'
import { getProjectRepo } from '@/data/getRepositories'

export const CAILENS_SNAPSHOT_FORMAT_VERSION = 3
export const CAILENS_SCHEMA_VERSION = 32

export interface CailensSnapshotData {
  events: CalendarEvent[]
  categories: Category[]
  settings: AppSettings[]
  weeklyEstimates: WeeklyEstimate[]
  projects: Project[]
  inspirations: InspirationLog[]
  profile: Profile[]
  outfitLogs: DailyOutfit[]
  todos: Todo[]
  todoLists: TodoList[]
  chroniclePhases: ChroniclePhase[]
  chronicleTasks: ChronicleTask[]
}

export interface CailensSnapshot {
  version: 1 | 2 | 3
  formatVersion?: number
  schemaVersion?: number
  exportedAt: string
  data: CailensSnapshotData
}

type PartialSnapshotData = Partial<CailensSnapshotData & {
  hygieneLogs: never[]
}>

type SyncableRow = { id: string; updatedAt?: number; deletedAt?: number | null; createdAt?: number }

export interface CailensImportResult {
  tables: Record<string, number>
}

export interface CailensMergeResult {
  tables: Record<string, { added: number; updated: number; deleted: number; skipped: number }>
}

export async function collectSnapshot(
  adapter: StorageAdapter = getAdapterSync(),
): Promise<CailensSnapshot> {
  const [
    events,
    categories,
    settings,
    weeklyEstimates,
    projects,
    inspirations,
    profile,
    outfitLogs,
    todos,
    todoLists,
    chroniclePhases,
    chronicleTasks,
  ] = await Promise.all([
    adapter.events.getAll(),
    adapter.categories.getAll(),
    adapter.settings.getAll(),
    adapter.weeklyEstimates.getAll(),
    adapter.projects.getAll(),
    adapter.inspirations.getAll(),
    adapter.profile.getAll(),
    adapter.outfitLogs.getAll(),
    adapter.todos.getAll(),
    adapter.todoLists.getAll(),
    adapter.chroniclePhases.getAll(),
    adapter.chronicleTasks.getAll(),
  ])

  return {
    version: 3,
    formatVersion: CAILENS_SNAPSHOT_FORMAT_VERSION,
    schemaVersion: CAILENS_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      events,
      categories,
      settings: settings.map(stripSettingsVolatileCache),
      weeklyEstimates,
      projects,
      inspirations,
      profile,
      outfitLogs,
      todos,
      todoLists,
      chroniclePhases,
      chronicleTasks,
    },
  }
}

export async function restoreSnapshot(
  snapshot: { version: number; data: PartialSnapshotData },
  adapter: StorageAdapter = getAdapterSync(),
): Promise<CailensImportResult> {
  assertSupportedSnapshot(snapshot)
  const { data } = snapshot
  const tables: Record<string, number> = {}

  async function apply<T extends { id: string }>(
    name: string,
    table: StorageTable<T>,
    rows: T[] | undefined,
  ): Promise<void> {
    if (!Array.isArray(rows)) return

    const existing = await table.getAll()
    const incomingIds = new Set(rows.map((r) => r.id))

    if (rows.length > 0) await table.bulkPut(rows)
    for (const item of existing) {
      if (!incomingIds.has(item.id)) await table.delete(item.id)
    }

    tables[name] = rows.length
  }

  await apply('events', adapter.events, data.events)
  await apply('categories', adapter.categories, data.categories)
  await apply('settings', adapter.settings, data.settings)
  await apply('weeklyEstimates', adapter.weeklyEstimates, data.weeklyEstimates)
  await apply('projects', adapter.projects, data.projects)
  await apply('inspirations', adapter.inspirations, data.inspirations)
  await apply('profile', adapter.profile, data.profile)
  await apply('outfitLogs', adapter.outfitLogs, data.outfitLogs)
  await apply('todos', adapter.todos, data.todos)
  await apply('todoLists', adapter.todoLists, data.todoLists)
  await apply('chroniclePhases', adapter.chroniclePhases, data.chroniclePhases)
  await apply('chronicleTasks', adapter.chronicleTasks, data.chronicleTasks)

  return { tables }
}

export async function mergeSnapshot(
  snapshot: { version: number; formatVersion?: number; data: PartialSnapshotData },
  adapter: StorageAdapter = getAdapterSync(),
): Promise<CailensMergeResult> {
  assertSupportedSnapshot(snapshot)
  const { data } = snapshot
  const tables: CailensMergeResult['tables'] = {}

  await mergeById('events', adapter.events, data.events, tables)
  await mergeCategories(adapter, data.categories, tables)
  await mergeSettings(adapter, data.settings, tables)
  await mergeNaturalKey(
    'weeklyEstimates',
    adapter.weeklyEstimates,
    data.weeklyEstimates,
    (row) => `${row.weekStart}:${row.categoryId}`,
    tables,
  )
  await mergeById('projects', adapter.projects, data.projects, tables)
  await mergeById('inspirations', adapter.inspirations, data.inspirations, tables)
  await mergeProfile(adapter, data.profile, tables)
  await mergeNaturalKey('outfitLogs', adapter.outfitLogs, data.outfitLogs, (row) => row.date, tables)
  await mergeById('todos', adapter.todos, data.todos, tables)
  await mergeById('todoLists', adapter.todoLists, data.todoLists, tables)
  await mergeById('chroniclePhases', adapter.chroniclePhases, data.chroniclePhases, tables)
  await mergeById('chronicleTasks', adapter.chronicleTasks, data.chronicleTasks, tables)

  await refreshAllProjectStats(adapter)

  return { tables }
}

async function mergeById<T extends SyncableRow>(
  name: string,
  table: StorageTable<T>,
  rows: T[] | undefined,
  tables: CailensMergeResult['tables'],
): Promise<void> {
  if (!Array.isArray(rows)) return
  const stats = makeMergeStats()
  const existing = await table.getAll()
  const byId = new Map(existing.map((row) => [row.id, row]))
  const toPut: T[] = []

  for (const incoming of rows) {
    const local = byId.get(incoming.id)
    if (!local) {
      toPut.push(incoming)
      if (incoming.deletedAt) stats.deleted++
      else stats.added++
      continue
    }
    const choice = chooseWinner(local, incoming)
    if (choice === 'incoming') {
      toPut.push(incoming)
      if (incoming.deletedAt) stats.deleted++
      else stats.updated++
    } else {
      stats.skipped++
    }
  }

  if (toPut.length > 0) await table.bulkPut(toPut)
  tables[name] = stats
}

async function mergeNaturalKey<T extends SyncableRow>(
  name: string,
  table: StorageTable<T>,
  rows: T[] | undefined,
  keyOf: (row: T) => string,
  tables: CailensMergeResult['tables'],
): Promise<void> {
  if (!Array.isArray(rows)) return
  const stats = makeMergeStats()
  const candidates = [...await table.getAll(), ...rows]
  const winners = new Map<string, T>()

  for (const row of candidates) {
    const key = keyOf(row)
    const current = winners.get(key)
    if (!current || chooseWinner(current, row) === 'incoming') {
      winners.set(key, row)
    }
  }

  const localIds = new Set((await table.getAll()).map((row) => row.id))
  const winnerIds = new Set(Array.from(winners.values()).map((row) => row.id))
  const toPut: T[] = []

  for (const row of winners.values()) {
    if (!localIds.has(row.id)) {
      toPut.push(row)
      if (row.deletedAt) stats.deleted++
      else stats.added++
    } else {
      const local = await table.get(row.id)
      if (local && chooseWinner(local, row) === 'incoming') {
        toPut.push(row)
        if (row.deletedAt) stats.deleted++
        else stats.updated++
      } else {
        stats.skipped++
      }
    }
  }

  for (const localId of localIds) {
    if (!winnerIds.has(localId)) {
      await table.delete(localId)
    }
  }
  if (toPut.length > 0) await table.bulkPut(toPut)
  tables[name] = stats
}

async function mergeCategories(
  adapter: StorageAdapter,
  rows: Category[] | undefined,
  tables: CailensMergeResult['tables'],
): Promise<void> {
  if (!Array.isArray(rows)) return
  const stats = makeMergeStats()
  const local = await adapter.categories.getAll()
  const localMap = new Map(local.map((row) => [row.id, row]))
  const merged: Category[] = []

  for (const incoming of rows) {
    const current = localMap.get(incoming.id)
    if (!current) {
      merged.push(incoming)
      stats.added++
      continue
    }
    const base = chooseWinner(current, incoming) === 'incoming' ? incoming : current
    merged.push({
      ...base,
      folders: mergeFolders(current.folders, incoming.folders),
      updatedAt: Math.max(current.updatedAt ?? 0, incoming.updatedAt ?? 0) || undefined,
    })
    stats.updated++
  }

  if (merged.length > 0) await adapter.categories.bulkPut(merged)
  tables.categories = stats
}

async function mergeSettings(
  adapter: StorageAdapter,
  rows: AppSettings[] | undefined,
  tables: CailensMergeResult['tables'],
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return
  const stats = makeMergeStats()
  const incoming = stripSettingsVolatileCache(rows[0])
  const rawLocal = (await adapter.settings.get('default')) ?? { id: 'default' as const, language: 'zh' as const }
  const local = stripSettingsVolatileCache(rawLocal)
  const scalarBase = chooseSettingsWinner(local, incoming) === 'incoming' ? incoming : local
  const merged: AppSettings = {
    ...scalarBase,
    id: 'default',
    weatherCache: rawLocal.weatherCache,
    habitPlans: mergeNestedById(local.habitPlans, incoming.habitPlans),
    dayMarks: mergeNestedById(local.dayMarks, incoming.dayMarks),
    dayLocations: mergeNestedByKey(local.dayLocations, incoming.dayLocations, (row) => String(row.date)),
    hygieneActivities: mergeHygieneActivities(local.hygieneActivities, incoming.hygieneActivities),
    updatedAt: Math.max(local.updatedAt ?? 0, incoming.updatedAt ?? 0) || undefined,
  }
  await adapter.settings.put(merged)
  stats.updated++
  tables.settings = stats
}

async function mergeProfile(
  adapter: StorageAdapter,
  rows: Profile[] | undefined,
  tables: CailensMergeResult['tables'],
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return
  const stats = makeMergeStats()
  const incoming = rows[0]
  const local = await adapter.profile.get('default')
  if (!local || profileTime(incoming) > profileTime(local)) {
    await adapter.profile.put(incoming)
    if (local) stats.updated++
    else stats.added++
  } else {
    stats.skipped++
  }
  tables.profile = stats
}

function mergeFolders(local: KeywordFolder[], incoming: KeywordFolder[]): KeywordFolder[] {
  const map = new Map<string, KeywordFolder>()
  for (const folder of local) map.set(folder.id, { ...folder, keywords: [...folder.keywords] })
  for (const folder of incoming) {
    const current = map.get(folder.id)
    if (!current) {
      map.set(folder.id, { ...folder, keywords: [...new Set(folder.keywords)] })
      continue
    }
    map.set(folder.id, {
      ...folder,
      keywords: [...new Set([...current.keywords, ...folder.keywords])],
    })
  }
  return Array.from(map.values())
}

function mergeNestedById<T extends SyncableRow>(local: T[] | undefined, incoming: T[] | undefined): T[] | undefined {
  return mergeNestedByKey(local, incoming, (row) => row.id)
}

function mergeNestedByKey<T extends { updatedAt?: number; deletedAt?: number | null }>(
  local: T[] | undefined,
  incoming: T[] | undefined,
  keyOf: (row: T) => string,
): T[] | undefined {
  if (!local && !incoming) return undefined
  const map = new Map<string, T>()
  for (const row of local ?? []) map.set(keyOf(row), row)
  for (const row of incoming ?? []) {
    const key = keyOf(row)
    const current = map.get(key)
    if (!current || chooseWinner(current, row) === 'incoming') map.set(key, row)
  }
  return Array.from(map.values()).filter((row) => !row.deletedAt)
}

function mergeHygieneActivities<T extends { id: string }>(local: T[] | undefined, incoming: T[] | undefined): T[] | undefined {
  if (!local && !incoming) return undefined
  const map = new Map<string, T>()
  for (const row of local ?? []) map.set(row.id, row)
  for (const row of incoming ?? []) map.set(row.id, row)
  return Array.from(map.values())
}

function chooseWinner<T extends { updatedAt?: number; deletedAt?: number | null; createdAt?: number }>(
  local: T,
  incoming: T,
): 'local' | 'incoming' {
  const localTime = logicalTime(local)
  const incomingTime = logicalTime(incoming)
  if (incomingTime > localTime) return 'incoming'
  if (incomingTime < localTime) return 'local'
  if (incoming.deletedAt && !local.deletedAt) return 'incoming'
  return 'local'
}

function chooseSettingsWinner(local: AppSettings, incoming: AppSettings): 'local' | 'incoming' {
  return (incoming.updatedAt ?? 0) > (local.updatedAt ?? 0) ? 'incoming' : 'local'
}

function logicalTime(row: { updatedAt?: number; deletedAt?: number | null; createdAt?: number }): number {
  return Math.max(row.updatedAt ?? row.createdAt ?? 0, row.deletedAt ?? 0)
}

function profileTime(profile: Profile): number {
  if (typeof profile.updatedAtMs === 'number') return profile.updatedAtMs
  if (profile.updatedAt) return Date.parse(profile.updatedAt) || 0
  return 0
}

function stripSettingsVolatileCache(settings: AppSettings): AppSettings {
  const rest = { ...settings }
  delete rest.weatherCache
  return rest
}

function makeMergeStats() {
  return { added: 0, updated: 0, deleted: 0, skipped: 0 }
}

async function refreshAllProjectStats(adapter: StorageAdapter): Promise<void> {
  try {
    const projects = await adapter.projects.getAll()
    await Promise.all(projects.filter((p) => !p.deletedAt).map((p) => getProjectRepo().refreshStats(p.id)))
  } catch {
    const projects = await adapter.projects.getAll()
    const events = await adapter.events.getAll()
    const updates = projects.filter((p) => !p.deletedAt).map((project) => {
      const projectEvents = events.filter((e) => !e.deletedAt && e.projectId === project.id)
      const totalMinutes = projectEvents.reduce((sum, e) => sum + (e.endTime - e.startTime) / 60_000, 0)
      return { ...project, totalMinutes: Math.round(totalMinutes), eventCount: projectEvents.length }
    })
    if (updates.length > 0) await adapter.projects.bulkPut(updates)
  }
}

function assertSupportedSnapshot(snapshot: { version?: number; formatVersion?: number }): void {
  const version = snapshot.formatVersion ?? snapshot.version
  if (version !== 1 && version !== 2 && version !== 3) {
    throw new Error(`Unsupported snapshot version: ${String(version)}`)
  }
  if ((snapshot.formatVersion ?? snapshot.version ?? 0) > CAILENS_SNAPSHOT_FORMAT_VERSION) {
    throw new Error(`Unsupported snapshot format: ${String(snapshot.formatVersion)}`)
  }
}

export async function compressData(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input)
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(bytes as unknown as BufferSource)
  writer.close()
  const reader = cs.readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value as Uint8Array)
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export async function decompressData(compressed: Uint8Array): Promise<string> {
  const cs = new DecompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(compressed as unknown as BufferSource)
  writer.close()
  const reader = cs.readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value as Uint8Array)
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(result)
}

export async function encryptWithPassphrase(data: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const { Encrypter } = await import('age-encryption')
  const enc = new Encrypter()
  enc.setPassphrase(passphrase)
  return enc.encrypt(data)
}

export async function decryptWithPassphrase(ciphertext: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const { Decrypter } = await import('age-encryption')
  const dec = new Decrypter()
  dec.addPassphrase(passphrase)
  return dec.decrypt(ciphertext)
}

export async function serializeSnapshot(snapshot: CailensSnapshot, passphrase: string): Promise<string> {
  const json = JSON.stringify(snapshot)
  const compressed = await compressData(json)
  const encrypted = await encryptWithPassphrase(compressed, passphrase)
  const { armor } = await import('age-encryption')
  return armor.encode(encrypted)
}

export async function deserializeSnapshot(
  armoredText: string,
  passphrase: string,
): Promise<{ version: number; formatVersion?: number; schemaVersion?: number; data: PartialSnapshotData }> {
  const { armor } = await import('age-encryption')
  const ciphertext = armor.decode(armoredText)
  const decrypted = await decryptWithPassphrase(ciphertext, passphrase)
  const json = await decompressData(decrypted)

  const parsed: unknown = JSON.parse(json)
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid .cailens snapshot')
  }
  const obj = parsed as { version?: unknown; formatVersion?: unknown; schemaVersion?: unknown; data?: unknown }
  if (obj.version !== 1 && obj.version !== 2 && obj.version !== 3) {
    throw new Error(`Unsupported snapshot version: ${String(obj.version)}`)
  }
  if (typeof obj.formatVersion === 'number' && obj.formatVersion > CAILENS_SNAPSHOT_FORMAT_VERSION) {
    throw new Error(`Unsupported snapshot format: ${String(obj.formatVersion)}`)
  }
  const data = (typeof obj.data === 'object' && obj.data !== null ? obj.data : {}) as PartialSnapshotData
  return {
    version: obj.version,
    formatVersion: typeof obj.formatVersion === 'number' ? obj.formatVersion : undefined,
    schemaVersion: typeof obj.schemaVersion === 'number' ? obj.schemaVersion : undefined,
    data,
  }
}

export async function exportCailens(
  passphrase: string,
  adapter: StorageAdapter = getAdapterSync(),
): Promise<void> {
  const snapshot = await collectSnapshot(adapter)
  const armoredText = await serializeSnapshot(snapshot, passphrase)

  await saveTextFile(
    armoredText,
    `cailens-backup-${new Date().toISOString().slice(0, 10)}.cailens`,
    'application/octet-stream',
  )
}

export async function importCailens(
  armoredText: string,
  passphrase: string,
  adapter: StorageAdapter = getAdapterSync(),
): Promise<CailensImportResult> {
  const snapshot = await deserializeSnapshot(armoredText, passphrase)
  return restoreSnapshot(snapshot, adapter)
}

export async function mergeCailens(
  armoredText: string,
  passphrase: string,
  adapter: StorageAdapter = getAdapterSync(),
): Promise<CailensMergeResult> {
  const snapshot = await deserializeSnapshot(armoredText, passphrase)
  return mergeSnapshot(snapshot, adapter)
}
