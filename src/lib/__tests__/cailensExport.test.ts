/**
 * .cailens 鍔犲瘑澶囦唤/杩樺師 鈥斺€?鏁版嵁瀹夊叏寰€杩旀祴璇曘€? *
 * 瑕嗙洊涓夌被鍘嗗彶缂洪櫡锛? *   Bug A锛歝ollect/restore 鐩磋 Dexie锛岀粫杩囨椿鍔ㄩ€傞厤鍣?鈫?妗岄潰鏂囦欢瀛樺偍妯″紡涓嬪鍑虹┖澶囦唤 /
 *          杩樺師鍚庣晫闈㈢湅涓嶅埌鏁版嵁銆備慨澶嶅悗涓ょ閮借蛋 StorageAdapter锛屾晠瀵?IndexedDB 涓? *          FileSystem 涓ょ閫傞厤鍣ㄩ兘鍋氭暣鐩樺線杩斻€? *   Bug B锛氬揩鐓у彧鍚?events/categories/settings/weeklyEstimates锛屼涪鎺? *          todos/goals/projects/profile/鐏垫劅/绌挎惌/鍗敓 鈫?杩樺師闈欓粯娓呯┖杩欎簺琛ㄣ€? *   Bug C锛歟ncrypt() 浜у嚭浜岃繘鍒?age 瀛楄妭锛屼絾瀵煎叆鎸?file.text() 鏂囨湰璇诲洖锛屼簩杩涘埗缁? *          UTF-8 寰€杩旇鎹熷潖锛屼换浣?.cailens 閮借В瀵嗗け璐ャ€傛敼鐢?ASCII armor 鍚庢枃鏈線杩旀棤鎹熴€? */
import { describe, it, expect, beforeEach, vi } from 'vitest'

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

const PASS = 'correct horse battery staple'

/* ---------- fixtures ---------- */

function liveEvent(): CalendarEvent {
  return { id: 'evt-live', title: 'Live', startTime: 1000, endTime: 2000, color: 'accent', categoryId: 'accent', createdAt: 0, updatedAt: 0 }
}
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
  return { id, title, description: '', status: 'todo', priority: null, domain: null, listId: 'default', dueDate: null, sortOrder: 0, projectId: null, categoryId: null, createdAt: 0, updatedAt: 0, completedAt: null, repeatPattern: null, goalId: null, isStarred: false }
}

/** 寰€姣忓紶鐢ㄦ埛鏁版嵁琛ㄥ啓鍏ヤ竴琛屼唬琛ㄦ暟鎹紙浜嬩欢鍚竴鏉″纰戯級銆?*/
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
}

function freshIndexedDB(): IndexedDBAdapter {
  return new IndexedDBAdapter(new CailensDB(`cailens-test-${Math.random()}`))
}

async function freshFileSystem(): Promise<FileSystemAdapter> {
  const a = new FileSystemAdapter()
  a.setRootPath('/data')
  await a.quickScanInitial() // 旧 v1 快照只含 events（无 todos 等键）→ 这些表必须原样保留?loaded 鏍囧織锛涘叏鏂板簱涓虹┖
  return a
}

/** 鏂█閫傞厤鍣ㄦ寔鏈?seedAllTables 鍐欏叆鐨勫叏閮?11 寮犺〃鏁版嵁锛堝惈澧撶锛夈€?*/
async function expectAllTablesRestored(adapter: StorageAdapter): Promise<void> {
  const events = await adapter.events.getAll()
  expect(events.map((e) => e.id).sort()).toEqual(['evt-dead', 'evt-live'])

  expect((await adapter.categories.getAll())).toHaveLength(6)
  expect((await adapter.settings.getAll())[0]?.language).toBe('en')
  expect((await adapter.profile.getAll())[0]?.id).toBe('default')
  expect((await adapter.weeklyEstimates.getAll()).map((x) => x.id)).toEqual(['est-1'])
  expect((await adapter.projects.getAll()).map((x) => x.id)).toEqual(['proj-1'])
  expect((await adapter.inspirations.getAll()).map((x) => x.id)).toEqual(['insp-1'])
  expect((await adapter.outfitLogs.getAll()).map((x) => x.id)).toEqual(['outfit-1'])
  expect((await adapter.hygieneLogs.getAll()).map((x) => x.id)).toEqual(['hyg-1'])
  expect((await adapter.todos.getAll()).map((x) => x.id)).toEqual(['todo-1'])
}

/** 妯℃嫙钀界洏鍐嶈鍥烇細瀵煎叆绔寜 file.text() 璇绘枃鏈紝蹇呴』 ASCII 瀹夊叏銆?*/
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
      ['categories', 'events', 'hygieneLogs', 'inspirations', 'outfitLogs', 'profile', 'projects', 'settings', 'todoLists', 'todos', 'weeklyEstimates'].sort(),
    )
    expect(snap.data.todos.map((t) => t.id)).toEqual(['todo-1'])
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

describe('round-trip: collect 鈫?serialize 鈫?text 鈫?import (IndexedDBAdapter)', () => {
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
  })
})

describe('round-trip: collect 鈫?serialize 鈫?text 鈫?import (FileSystemAdapter)', () => {
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
    // 构造 version 1 序列化（数据仍全，重点验证版本被接受）
    const full = await collectSnapshot(await seeded(freshIndexedDB()))
    const v1: CailensSnapshot = { ...full, version: 1 }
    const armored = await serializeSnapshot(v1, PASS)
    const back = await deserializeSnapshot(armored, PASS)
    expect(back.version).toBe(1)
  })

  it('does not wipe tables absent from an old snapshot', async () => {
    const target = freshIndexedDB()
    await target.todos.bulkPut([todo('keep-me', 'Keep')])

    // 旧 v1 快照只含 events（无 todos 等键）→ 这些表必须原样保留
    await restoreSnapshot({ version: 1, data: { events: [{ id: 'evt-live', title: 'Live', startTime: 0, endTime: 3600000, color: 'accent', categoryId: 'accent', createdAt: 0, updatedAt: 0 }] } }, target)

    expect((await target.todos.getAll()).map((t) => t.id)).toEqual(['keep-me'])
    expect((await target.events.getAll()).map((e) => e.id)).toEqual(['evt-live'])
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





