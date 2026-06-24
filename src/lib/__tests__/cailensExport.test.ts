/**
 * .cailens 加密备份/还原 —— 数据安全往返测试。
 *
 * 覆盖三类历史缺陷：
 *   Bug A：collect/restore 直读 Dexie，绕过活动适配器 → 桌面文件存储模式下导出空备份 /
 *          还原后界面看不到数据。修复后两端都走 StorageAdapter，故对 IndexedDB 与
 *          FileSystem 两种适配器都做整盘往返。
 *   Bug B：快照只含 events/categories/settings/weeklyEstimates，丢掉
 *          todos/goals/projects/profile/灵感/穿搭/卫生 → 还原静默清空这些表。
 *   Bug C：encrypt() 产出二进制 age 字节，但导入按 file.text() 文本读回，二进制经
 *          UTF-8 往返被损坏，任何 .cailens 都解密失败。改用 ASCII armor 后文本往返无损。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// FileSystemAdapter 依赖 tauriFs；用无副作用的内存桩替换，使 setRootPath +
// quickScanInitial 后各单文件表 loaded=true、写入为 no-op、读取为空（全新库）。
// 工厂内联所有桩，避免 vi.mock 提升导致的引用错误。
vi.mock('@/data/tauriFs', () => ({
  isTauri: () => true,
  readTextFile: async () => { throw new Error('ENOENT') },
  readDirWithContent: async () => [],
  writeTextFile: async () => {},
  deleteFile: async () => {},
  createDirAll: async () => {},
  getNextSequence: async () => 1,
  watchDir: async () => {},
  stopWatching: async () => {},
  onFsChange: async () => () => {},
  isWithinSelfWriteWindow: () => false,
  getSelfWriteSeq: () => 0,
  markSelfWrite: () => {},
}))

import { CailensDB } from '@/data/db'
import { IndexedDBAdapter } from '@/data/adapters/IndexedDBAdapter'
import { FileSystemAdapter } from '@/data/adapters/FileSystemAdapter'
import type { StorageAdapter } from '@/data/adapters/StorageAdapter'
import {
  collectSnapshot,
  restoreSnapshot,
  serializeSnapshot,
  deserializeSnapshot,
  importCailens,
  type CailensSnapshot,
} from '@/lib/cailensExport'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import { DEFAULT_PROFILE } from '@/domain/profile'
import type { CalendarEvent } from '@/domain/event'
import type { AppSettings } from '@/domain/settings'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { Project } from '@/domain/project'
import type { InspirationLog } from '@/domain/inspiration'
import type { DailyOutfit } from '@/domain/dailyContext'
import type { HygieneLogRecord } from '@/data/adapters/StorageAdapter'
import type { Todo } from '@/domain/todo'
import type { Goal } from '@/domain/goal'

const PASS = 'correct horse battery staple'

/* ---------- fixtures ---------- */

function liveEvent(): CalendarEvent {
  return { id: 'evt-live', title: 'Live', startTime: 1000, endTime: 2000, color: 'accent', categoryId: 'accent', createdAt: 0, updatedAt: 0 }
}
/** 已软删除的事件（墓碑）；整盘备份必须无损保留 deletedAt。 */
function deadEvent(): CalendarEvent {
  return { id: 'evt-dead', title: 'Dead', startTime: 3000, endTime: 4000, color: 'sage', categoryId: 'sage', createdAt: 0, updatedAt: 0, deletedAt: 99999 }
}
function customSettings(): AppSettings {
  return { id: 'default', language: 'en', theme: 'dark', visualStyle: 'graphite', fontScale: 'default' }
}
function estimate(): WeeklyEstimate {
  return { id: 'est-1', weekStart: 0, categoryId: 'accent', estimatedHours: 5, createdAt: 0 }
}
function project(): Project {
  return { id: 'proj-1', name: 'P', categoryId: 'accent', status: 'active', description: '', totalMinutes: 0, eventCount: 0, useCount: 0, lastUsedAt: 0, sortOrder: 0, createdAt: 0, updatedAt: 0, dailyRepeat: false }
}
function inspiration(): InspirationLog {
  return { id: 'insp-1', projectId: 'proj-1', eventId: 'evt-live', content: 'idea', createdAt: 0 }
}
function outfit(): DailyOutfit {
  return { id: 'outfit-1', date: '2026-06-24', items: [] }
}
function hygiene(): HygieneLogRecord {
  return { id: 'hyg-1', date: '2026-06-24' }
}
function todo(id = 'todo-1', title = 'T'): Todo {
  return { id, title, description: '', status: 'todo', priority: null, domain: null, dueDate: null, sortOrder: 0, projectId: null, categoryId: null, createdAt: 0, updatedAt: 0, completedAt: null, repeatPattern: null, goalId: null }
}
function goal(): Goal {
  return { id: 'goal-1', parentId: null, title: 'G', description: '', categoryId: 'accent', status: 'active', sortOrder: 0, targetDate: null, createdAt: 0, updatedAt: 0 }
}

/** 往每张用户数据表写入一行代表数据（事件含一条墓碑）。 */
async function seedAllTables(adapter: StorageAdapter): Promise<void> {
  await adapter.categories.bulkPut([...DEFAULT_CATEGORIES])
  await adapter.settings.put(customSettings())
  await adapter.profile.put({ ...DEFAULT_PROFILE })
  await adapter.events.bulkPut([liveEvent(), deadEvent()])
  await adapter.weeklyEstimates.bulkPut([estimate()])
  await adapter.projects.bulkPut([project()])
  await adapter.inspirations.bulkPut([inspiration()])
  await adapter.outfitLogs.bulkPut([outfit()])
  await adapter.hygieneLogs.bulkPut([hygiene()])
  await adapter.todos.bulkPut([todo()])
  await adapter.goals.bulkPut([goal()])
}

function freshIndexedDB(): IndexedDBAdapter {
  return new IndexedDBAdapter(new CailensDB(`cailens-test-${Math.random()}`))
}

async function freshFileSystem(): Promise<FileSystemAdapter> {
  const a = new FileSystemAdapter()
  a.setRootPath('/data')
  await a.quickScanInitial() // 置 loaded 标志；全新库为空
  return a
}

/** 断言适配器持有 seedAllTables 写入的全部 11 张表数据（含墓碑）。 */
async function expectAllTablesRestored(adapter: StorageAdapter): Promise<void> {
  const events = await adapter.events.getAll()
  expect(events.map((e) => e.id).sort()).toEqual(['evt-dead', 'evt-live'])
  const dead = events.find((e) => e.id === 'evt-dead')
  expect(dead?.deletedAt).toBe(99999) // 墓碑无损

  expect((await adapter.categories.getAll())).toHaveLength(6)
  expect((await adapter.settings.getAll())[0]?.language).toBe('en')
  expect((await adapter.profile.getAll())[0]?.id).toBe('default')
  expect((await adapter.weeklyEstimates.getAll()).map((x) => x.id)).toEqual(['est-1'])
  expect((await adapter.projects.getAll()).map((x) => x.id)).toEqual(['proj-1'])
  expect((await adapter.inspirations.getAll()).map((x) => x.id)).toEqual(['insp-1'])
  expect((await adapter.outfitLogs.getAll()).map((x) => x.id)).toEqual(['outfit-1'])
  expect((await adapter.hygieneLogs.getAll()).map((x) => x.id)).toEqual(['hyg-1'])
  expect((await adapter.todos.getAll()).map((x) => x.id)).toEqual(['todo-1'])
  expect((await adapter.goals.getAll()).map((x) => x.id)).toEqual(['goal-1'])
}

/** 模拟落盘再读回：导入端按 file.text() 读文本，必须 ASCII 安全。 */
function fileTextRoundTrip(armored: string): string {
  return new TextDecoder().decode(new TextEncoder().encode(armored))
}

/* ---------- collectSnapshot ---------- */

describe('collectSnapshot', () => {
  let adapter: IndexedDBAdapter
  beforeEach(async () => { adapter = freshIndexedDB(); await seedAllTables(adapter) })

  it('produces a version-2 snapshot covering every user-data table (Bug B)', async () => {
    const snap = await collectSnapshot(adapter)
    expect(snap.version).toBe(2)
    expect(Object.keys(snap.data).sort()).toEqual(
      ['categories', 'events', 'goals', 'hygieneLogs', 'inspirations', 'outfitLogs', 'profile', 'projects', 'settings', 'todos', 'weeklyEstimates'].sort(),
    )
    expect(snap.data.todos.map((t) => t.id)).toEqual(['todo-1'])
    expect(snap.data.goals.map((g) => g.id)).toEqual(['goal-1'])
    expect(snap.data.projects.map((p) => p.id)).toEqual(['proj-1'])
    expect(snap.data.profile.map((p) => p.id)).toEqual(['default'])
  })

  it('reads raw event rows including soft-delete tombstones (lossless)', async () => {
    const snap = await collectSnapshot(adapter)
    expect(snap.data.events.map((e) => e.id).sort()).toEqual(['evt-dead', 'evt-live'])
    expect(snap.data.events.find((e) => e.id === 'evt-dead')?.deletedAt).toBe(99999)
  })
})

/* ---------- full round-trip per adapter ---------- */

describe('round-trip: collect → serialize → text → import (IndexedDBAdapter)', () => {
  it('restores all tables into a fresh adapter', async () => {
    const source = freshIndexedDB()
    await seedAllTables(source)

    const snap = await collectSnapshot(source)
    const armored = await serializeSnapshot(snap, PASS)
    const fileText = fileTextRoundTrip(armored)

    const target = freshIndexedDB()
    const result = await importCailens(fileText, PASS, target)

    await expectAllTablesRestored(target)
    expect(result.tables.events).toBe(2)
    expect(result.tables.todos).toBe(1)
    expect(result.tables.goals).toBe(1)
  })
})

describe('round-trip: collect → serialize → text → import (FileSystemAdapter)', () => {
  it('restores all tables into a fresh adapter (proves adapter-awareness on desktop)', async () => {
    const source = await freshFileSystem()
    await seedAllTables(source)

    // 关键：source 是 FS 适配器；若 collect 仍直读 Dexie，这里会拿到空快照
    const snap = await collectSnapshot(source)
    expect(snap.data.todos.map((t) => t.id)).toEqual(['todo-1'])

    const armored = await serializeSnapshot(snap, PASS)
    const fileText = fileTextRoundTrip(armored)

    const target = await freshFileSystem()
    await importCailens(fileText, PASS, target)

    await expectAllTablesRestored(target)
  })
})

/* ---------- encoding (Bug C) ---------- */

describe('encoding', () => {
  it('serialized payload is ASCII age armor (survives a UTF-8 text round-trip)', async () => {
    const snap = await collectSnapshot(await seeded(freshIndexedDB()))
    const armored = await serializeSnapshot(snap, PASS)
    expect(armored.startsWith('-----BEGIN AGE ENCRYPTED FILE-----')).toBe(true)
    // 文本往返不得改变内容（旧二进制实现在此处会被 UTF-8 破坏）
    expect(fileTextRoundTrip(armored)).toBe(armored)
  })

  it('deserialize of a text-round-tripped payload decrypts correctly', async () => {
    const snap = await collectSnapshot(await seeded(freshIndexedDB()))
    const fileText = fileTextRoundTrip(await serializeSnapshot(snap, PASS))
    const back = await deserializeSnapshot(fileText, PASS)
    expect(back.data.events?.map((e) => e.id).sort()).toEqual(['evt-dead', 'evt-live'])
  })

  it('rejects a wrong passphrase', async () => {
    const snap = await collectSnapshot(await seeded(freshIndexedDB()))
    const armored = await serializeSnapshot(snap, PASS)
    await expect(deserializeSnapshot(armored, 'wrong-passphrase')).rejects.toThrow()
  })
})

/* ---------- backward compatibility & restore semantics ---------- */

describe('backward compatibility (version 1, missing tables)', () => {
  it('accepts version 1 in deserialize', async () => {
    // 用 version:1 序列化（数据仍全，重点验证版本被接受）
    const full = await collectSnapshot(await seeded(freshIndexedDB()))
    const v1: CailensSnapshot = { ...full, version: 1 }
    const armored = await serializeSnapshot(v1, PASS)
    const back = await deserializeSnapshot(armored, PASS)
    expect(back.version).toBe(1)
  })

  it('does not wipe tables absent from an old snapshot', async () => {
    const target = freshIndexedDB()
    await target.todos.bulkPut([todo('keep-me', 'Keep')])
    await target.goals.bulkPut([goal()])

    // 旧 v1 快照只含 events（无 todos/goals 键）→ 这些表必须原样保留
    await restoreSnapshot({ version: 1, data: { events: [liveEvent()] } }, target)

    expect((await target.todos.getAll()).map((t) => t.id)).toEqual(['keep-me'])
    expect((await target.goals.getAll()).map((g) => g.id)).toEqual(['goal-1'])
    expect((await target.events.getAll()).map((e) => e.id)).toEqual(['evt-live'])
  })
})

describe('restore semantics: clean replace', () => {
  it('prunes rows present locally but absent from the backup', async () => {
    const target = freshIndexedDB()
    await target.todos.bulkPut([todo('old', 'Old'), todo('also-old', 'Also')])

    await restoreSnapshot({ version: 2, data: { todos: [todo('new', 'New')] } }, target)

    expect((await target.todos.getAll()).map((t) => t.id)).toEqual(['new'])
  })

  it('an empty (present) table key clears that table', async () => {
    const target = freshIndexedDB()
    await target.todos.bulkPut([todo('doomed', 'Doomed')])

    await restoreSnapshot({ version: 2, data: { todos: [] } }, target)

    expect(await target.todos.getAll()).toHaveLength(0)
  })
})

/* small helper to seed + return the adapter inline */
async function seeded<T extends StorageAdapter>(adapter: T): Promise<T> {
  await seedAllTables(adapter)
  return adapter
}
