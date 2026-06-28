import { getAdapterSync } from '@/data/adapterFactory'
import type { StorageAdapter, StorageTable, HygieneLogRecord } from '@/data/adapters/StorageAdapter'
import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'
import type { AppSettings } from '@/domain/settings'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { Project } from '@/domain/project'
import type { InspirationLog } from '@/domain/inspiration'
import type { Profile } from '@/domain/profile'
import type { DailyOutfit } from '@/domain/dailyContext'
import type { Todo, TodoList } from '@/domain/todo'

/* ---------- types ---------- */

/**
 * 全量快照：覆盖 StorageAdapter 暴露的**每一张**用户数据表。
 * 历史上只含前 4 张表，导致 todos/goals/projects/profile/灵感/穿搭/卫生
 * 在恢复时被静默丢弃（Bug B）。新增表后 version 升到 2；导入仍兼容 version 1
 * （旧文件缺少新表的键，按"键缺失即不动该表"处理，见 restoreSnapshot）。
 */
export interface CailensSnapshotData {
  events: CalendarEvent[]
  categories: Category[]
  settings: AppSettings[]
  weeklyEstimates: WeeklyEstimate[]
  projects: Project[]
  inspirations: InspirationLog[]
  profile: Profile[]
  outfitLogs: DailyOutfit[]
  hygieneLogs: HygieneLogRecord[]
  todos: Todo[]
  todoLists: TodoList[]
}

export interface CailensSnapshot {
  version: 1 | 2
  exportedAt: string
  data: CailensSnapshotData
}

/** 导入侧容忍旧文件缺键（version 1 只有前 4 张表）。 */
type PartialSnapshotData = Partial<CailensSnapshotData>

/* ---------- collect ---------- */

/**
 * 从**当前活动适配器**读取全量数据（Bug A：旧实现直读 Dexie `db`，
 * 在桌面文件存储模式下 Dexie 是空的/过期的，会导出空备份）。
 *
 * events 用 `getAll()` 读**原始行**——刻意**不过滤** `deletedAt` 软删除墓碑，
 * 这样整盘备份/还原对墓碑是无损的（二期同步需要墓碑，见 DB v28）。
 */
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
    hygieneLogs,
    todos,
    todoLists,
  ] = await Promise.all([
    adapter.events.getAll(),
    adapter.categories.getAll(),
    adapter.settings.getAll(),
    adapter.weeklyEstimates.getAll(),
    adapter.projects.getAll(),
    adapter.inspirations.getAll(),
    adapter.profile.getAll(),
    adapter.outfitLogs.getAll(),
    adapter.hygieneLogs.getAll(),
    adapter.todos.getAll(),
    adapter.todoLists.getAll(),
  ])

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      events,
      categories,
      settings,
      weeklyEstimates,
      projects,
      inspirations,
      profile,
      outfitLogs,
      hygieneLogs,
      todos,
      todoLists,
    },
  }
}

/* ---------- restore ---------- */

export interface CailensImportResult {
  tables: Record<string, number>
}

/**
 * 把快照写回**当前活动适配器**（Bug A：旧实现 `db.X.clear()`+`bulkAdd()` 只写 Dexie，
 * 文件存储模式下界面永远看不到还原结果）。
 *
 * 语义：**整表替换（clean replace）**——还原即让该表状态等于备份。`StorageTable`
 * 没有 `clear()`，这里用「先 upsert 全部新行，再删掉备份里没有的旧行」实现，
 * 好处是过程中表不会出现"瞬时清空"窗口（FS 适配器无事务，清空+写入若中途失败会丢数据）。
 *
 * 向后兼容：备份里**没有的键**（旧 version 1 文件没有 todos/goals/… ）**完全不动**对应表，
 * 不会把它们误清空。
 */
export async function restoreSnapshot(
  snapshot: { version: number; data: PartialSnapshotData },
  adapter: StorageAdapter = getAdapterSync(),
): Promise<CailensImportResult> {
  const { data } = snapshot
  const tables: Record<string, number> = {}

  async function apply<T extends { id: string }>(
    name: string,
    table: StorageTable<T>,
    rows: T[] | undefined,
  ): Promise<void> {
    // 键缺失（旧文件）→ 不动这张表
    if (!Array.isArray(rows)) return

    const existing = await table.getAll()
    const incomingIds = new Set(rows.map((r) => r.id))

    if (rows.length > 0) await table.bulkPut(rows)
    // 删掉备份中不存在的旧行，达成整表替换
    for (const item of existing) {
      if (!incomingIds.has(item.id)) await table.delete(item.id)
    }

    if (rows.length > 0) tables[name] = rows.length
  }

  await apply('events', adapter.events, data.events)
  await apply('categories', adapter.categories, data.categories)
  await apply('settings', adapter.settings, data.settings)
  await apply('weeklyEstimates', adapter.weeklyEstimates, data.weeklyEstimates)
  await apply('projects', adapter.projects, data.projects)
  await apply('inspirations', adapter.inspirations, data.inspirations)
  await apply('profile', adapter.profile, data.profile)
  await apply('outfitLogs', adapter.outfitLogs, data.outfitLogs)
  await apply('hygieneLogs', adapter.hygieneLogs, data.hygieneLogs)
  await apply('todos', adapter.todos, data.todos)
  await apply('todoLists', adapter.todoLists, data.todoLists)

  return { tables }
}

/* ---------- compress / decompress (gzip via CompressionStream) ---------- */

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

/* ---------- encrypt / decrypt (age) ---------- */

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

/* ---------- serialize / deserialize (.cailens payload) ---------- */

/**
 * 序列化为可写入文件的 **ASCII armor 文本**。
 *
 * Bug C：`Encrypter.encrypt()` 产出的是**二进制** age 字节；旧实现把它当二进制下载，
 * 而导入侧用 `file.text()` 按 UTF-8 读回再 `TextEncoder` 重编码——二进制经 UTF-8
 * 往返会损坏（非法字节变成 U+FFFD），解密必然 "invalid tag" 失败，等于**没有任何
 * .cailens 文件能被还原**。改用 age 的 ASCII armor（纯 PEM 文本），文本往返无损。
 */
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
): Promise<{ version: number; data: PartialSnapshotData }> {
  const { armor } = await import('age-encryption')
  const ciphertext = armor.decode(armoredText)
  const decrypted = await decryptWithPassphrase(ciphertext, passphrase)
  const json = await decompressData(decrypted)

  const parsed: unknown = JSON.parse(json)
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid .cailens snapshot')
  }
  const obj = parsed as { version?: unknown; data?: unknown }
  if (obj.version !== 1 && obj.version !== 2) {
    throw new Error(`Unsupported snapshot version: ${String(obj.version)}`)
  }
  const data = (typeof obj.data === 'object' && obj.data !== null ? obj.data : {}) as PartialSnapshotData
  return { version: obj.version, data }
}

/* ---------- full export / import orchestration ---------- */

export async function exportCailens(
  passphrase: string,
  adapter: StorageAdapter = getAdapterSync(),
): Promise<void> {
  const snapshot = await collectSnapshot(adapter)
  const armoredText = await serializeSnapshot(snapshot, passphrase)

  const blob = new Blob([armoredText], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cailens-backup-${new Date().toISOString().slice(0, 10)}.cailens`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importCailens(
  armoredText: string,
  passphrase: string,
  adapter: StorageAdapter = getAdapterSync(),
): Promise<CailensImportResult> {
  const snapshot = await deserializeSnapshot(armoredText, passphrase)
  return restoreSnapshot(snapshot, adapter)
}
