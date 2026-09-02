/**
 * # AiChatRepository × FileSystemAdapter 测试
 *
 * 回归：getByDateKey 必须按 dateKey 主键精确取回。桌面端默认走
 * FileSystemAdapter，早期实现依赖 query(where) 会被 FsTable.query
 * 忽略 where 条件、按插入序返回任意记录导致聊天历史串天。
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('../tauriFs', () => ({
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

import { FileSystemAdapter } from '../adapters/FileSystemAdapter'
import { AiChatRepository } from '../aiChatRepository'
import type { AiChatRecord } from '@/domain/aiChat'

function makeRecord(dateKey: string, content: string): AiChatRecord {
  return {
    id: dateKey,
    dateKey,
    messages: [{ role: 'user', content }],
    providerLabel: 'OpenAI',
    createdAt: 0,
    updatedAt: 0,
  }
}

describe('AiChatRepository on FileSystemAdapter', () => {
  it('getByDateKey returns exactly the record for that date (no cross-day leak)', async () => {
    const adapter = new FileSystemAdapter()
    adapter.setRootPath('/data')
    const repo = new AiChatRepository(adapter, { now: () => 1_000_000 })

    await adapter.aiChats.put(makeRecord('2026-08-01', 'day-1'))
    await adapter.aiChats.put(makeRecord('2026-08-03', 'day-3'))

    const day1 = await repo.getByDateKey('2026-08-01')
    const day3 = await repo.getByDateKey('2026-08-03')

    expect(day1?.id).toBe('2026-08-01')
    expect(day1?.messages[0]?.content).toBe('day-1')
    expect(day3?.id).toBe('2026-08-03')
    expect(day3?.messages[0]?.content).toBe('day-3')
  })

  it('getByDateKey returns undefined for a missing date', async () => {
    const adapter = new FileSystemAdapter()
    adapter.setRootPath('/data')
    const repo = new AiChatRepository(adapter)

    await expect(repo.getByDateKey('2026-08-03')).resolves.toBeUndefined()
  })
})
