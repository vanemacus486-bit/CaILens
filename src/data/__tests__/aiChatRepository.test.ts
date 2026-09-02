/**
 * # AiChatRepository 测试
 *
 * 覆盖按本地日期主键读写：getByDateKey 必须按 dateKey 精确取回
 * （回归：早期实现用 query(where) 在 FileSystemAdapter 下会串天）。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CailensDB } from '../db'
import { AiChatRepository } from '../aiChatRepository'
import { IndexedDBAdapter } from '../adapters/IndexedDBAdapter'
import type { ChatMessage } from '@/domain/aiChat'

let db: CailensDB
let adapter: IndexedDBAdapter
let repo: AiChatRepository

beforeEach(async () => {
  db = new CailensDB(`cailens-test-${Math.random()}`)
  adapter = new IndexedDBAdapter(db)
  repo = new AiChatRepository(adapter, { now: () => 1_000_000 })
})

describe('getByDateKey', () => {
  it('returns undefined when no record exists', async () => {
    await expect(repo.getByDateKey('2026-08-03')).resolves.toBeUndefined()
  })

  it('returns exactly the record for that date (no cross-day leak)', async () => {
    const msg: ChatMessage = { role: 'user', content: 'hi' }
    await repo.appendMessage('2026-08-01', msg, 'OpenAI')
    await repo.appendMessage('2026-08-03', msg, 'OpenAI')

    const day1 = await repo.getByDateKey('2026-08-01')
    const day3 = await repo.getByDateKey('2026-08-03')

    expect(day1?.id).toBe('2026-08-01')
    expect(day1?.messages).toEqual([msg])
    expect(day3?.id).toBe('2026-08-03')
    expect(day3?.messages).toEqual([msg])
  })
})

describe('appendMessage', () => {
  it('creates a record with id = dateKey on first message', async () => {
    const rec = await repo.appendMessage('2026-08-03', { role: 'user', content: 'q' }, 'OpenAI')
    expect(rec.id).toBe('2026-08-03')
    expect(rec.dateKey).toBe('2026-08-03')
    expect(rec.providerLabel).toBe('OpenAI')
    expect(rec.messages).toHaveLength(1)
  })

  it('appends to the existing record and bumps updatedAt', async () => {
    await repo.appendMessage('2026-08-03', { role: 'user', content: 'q' }, 'OpenAI')
    const rec = await repo.appendMessage('2026-08-03', { role: 'assistant', content: 'a' }, 'OpenAI')
    expect(rec.messages).toEqual([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'a' },
    ])
    expect(rec.updatedAt).toBe(1_000_000)
  })
})

describe('deleteByDateKey', () => {
  it('removes the day record', async () => {
    await repo.appendMessage('2026-08-03', { role: 'user', content: 'q' }, 'OpenAI')
    await repo.deleteByDateKey('2026-08-03')
    await expect(repo.getByDateKey('2026-08-03')).resolves.toBeUndefined()
  })
})
