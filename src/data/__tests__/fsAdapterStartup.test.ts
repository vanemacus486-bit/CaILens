/**
 * FileSystemAdapter 启动分阶段加载测试。
 *
 * 桌面文件存储下,启动不再一次性扫描全部事件(记久了可达上万个文件,阻塞首屏 +
 * 内存峰值高)。改为:
 *   阶段1 quickScanInitial —— 只加载单文件表 + 最近两个月事件,让首屏立即可用;
 *   阶段2 loadRemainingEvents —— 后台合并补全全部历史事件,且不清空阶段1已加载的内容。
 *
 * 这里用 mock 的 tauriFs 验证两阶段的数据正确性:首屏不含历史、后台合并不丢数据。
 */
import { describe, it, expect, vi } from 'vitest'

// 注意:工厂内联所有依赖,避免 vi.mock 提升导致的 TDZ 引用错误。
vi.mock('../tauriFs', () => {
  const now = new Date()
  const curY = String(now.getFullYear())
  const curM = String(now.getMonth() + 1).padStart(2, '0')

  const ev = (id: string, startTime: number) => ({
    path: `/data/events/seg/${id}.json`,
    modified: 0,
    content: JSON.stringify({
      schemaVersion: 1,
      type: 'event',
      data: {
        id, title: id, startTime, endTime: startTime + 3_600_000,
        color: 'sage', categoryId: 'sage', goalId: null,
        createdAt: 0, updatedAt: 0, deletedAt: null,
      },
    }),
  })

  return {
    isTauri: () => true,
    readTextFile: async (path: string) => {
      const p = String(path).replace(/\\/g, '/')
      if (p.endsWith('todos.json')) return JSON.stringify({ schemaVersion: 1, type: 'todos', data: [{ id: 't1', title: 'T1' }, { id: 't2', title: 'T2' }] })
      if (p.endsWith('categories.json')) return JSON.stringify({ schemaVersion: 1, type: 'categories', data: [{ id: 'sage', name: 'S', folders: [], weeklyBudget: 0 }] })
      if (p.endsWith('settings.json')) return JSON.stringify({ schemaVersion: 1, type: 'settings', data: { id: 'default', language: 'zh' } })
      throw new Error('ENOENT') // profile/goals/projects 不存在 → 测试 catch 分支
    },
    readDirWithContent: async (dir: string) => {
      const d = String(dir).replace(/\\/g, '/')
      if (d.endsWith('/estimates')) return []
      if (d.endsWith('/events')) return [ev('recent1', Date.now()), ev('old1', 100)] // 全量:最近 + 历史
      if (d.includes(`/events/${curY}/${curM}`)) return [ev('recent1', Date.now())]  // 仅当前月
      return [] // 上月 / 其它月目录为空
    },
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
  }
})

import { FileSystemAdapter } from '../adapters/FileSystemAdapter'
import type { CalendarEvent } from '@/domain/event'

describe('FileSystemAdapter 启动分阶段加载', () => {
  it('阶段1 quickScanInitial: 加载单文件表 + 最近事件,不含历史事件', async () => {
    const a = new FileSystemAdapter()
    a.setRootPath('/data')
    await a.quickScanInitial()

    // 单文件表已就绪
    expect((await a.todos.getAll()).length).toBe(2)
    expect((await a.categories.getAll()).length).toBeGreaterThanOrEqual(1)

    // 最近事件在,历史事件还没加载
    expect(await a.events.get('recent1')).toBeTruthy()
    expect(await a.events.get('old1')).toBeUndefined()
  })

  it('阶段2 loadRemainingEvents: 合并补全历史,保留最近事件,并回调 onReady', async () => {
    const a = new FileSystemAdapter()
    a.setRootPath('/data')
    await a.quickScanInitial()

    let readyCalls = 0
    await a.loadRemainingEvents(() => { readyCalls++ })

    expect(await a.events.get('recent1')).toBeTruthy() // 阶段1的没被清空
    expect(await a.events.get('old1')).toBeTruthy()     // 历史已补全
    expect(readyCalls).toBe(1)
  })

  it('合并是去重的:同一事件不会因「最近 + 全量」都含它而出现两份', async () => {
    const a = new FileSystemAdapter()
    a.setRootPath('/data')
    await a.quickScanInitial()
    await a.loadRemainingEvents()

    const all = await a.events.getAll()
    expect(all.filter((e) => e.id === 'recent1').length).toBe(1)
  })
})

describe('FileSystemAdapter events.bulkPut', () => {
  const mk = (id: string, startTime: number): CalendarEvent => ({
    id, title: id, startTime, endTime: startTime + 1000,
    color: 'sage', categoryId: 'sage', createdAt: 0, updatedAt: 0,
  })

  it('批量写入后 startTime 索引重建正确：query(below) 返回按时间升序的全部事件', async () => {
    const a = new FileSystemAdapter()
    a.setRootPath('/data')

    // 故意乱序传入；批量写入只在最后重建一次索引（而非逐条），索引仍须正确
    await a.events.bulkPut([mk('c', 3000), mk('a', 1000), mk('b', 2000)])

    const res = await a.events.query({ where: { key: 'startTime', op: 'below', value: 10_000 } })
    expect(res.map((e) => e.id)).toEqual(['a', 'b', 'c'])
    expect((await a.events.getAll()).length).toBe(3)
  })

  it('bulkPut 与逐条 put 混用后索引保持有序', async () => {
    const a = new FileSystemAdapter()
    a.setRootPath('/data')

    await a.events.put(mk('m', 5000))
    await a.events.bulkPut([mk('z', 9000), mk('d', 4000)])
    await a.events.put(mk('a', 1000))

    const res = await a.events.query({ where: { key: 'startTime', op: 'below', value: 100_000 } })
    expect(res.map((e) => e.id)).toEqual(['a', 'd', 'm', 'z'])
  })
})
