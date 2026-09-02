/**
 * # AiChatRepository
 *
 * 操作 AI 对话记录（按本地日期一条）。数据存 aiChats 表，
 * 每天一条记录，id = dateKey（YYYY-MM-DD）。
 */

import type { StorageAdapter } from './adapters/StorageAdapter'
import type { AiChatRecord, ChatMessage } from '@/domain/aiChat'
import { createAiChatRecord, appendChatMessage } from '@/domain/aiChat'

export interface Clock {
  now(): number
}

export class AiChatRepository {
  private adapter: StorageAdapter
  private clock: Clock

  constructor(adapter: StorageAdapter, clock: Clock = { now: () => Date.now() }) {
    this.adapter = adapter
    this.clock = clock
  }

  /** 读取某天的对话记录；不存在时返回 undefined */
  async getByDateKey(dateKey: string): Promise<AiChatRecord | undefined> {
    // id = dateKey，直接主键读取；不依赖 query(where)（FileSystemAdapter 的
    // FsTable.query 不支持 where 条件，会按插入序返回任意记录导致串天）
    return this.adapter.aiChats.get(dateKey)
  }

  /** 追加一条消息；记录不存在时自动创建 */
  async appendMessage(dateKey: string, message: ChatMessage, providerLabel: string): Promise<AiChatRecord> {
    const existing = await this.getByDateKey(dateKey)
    const now = this.clock.now()
    const record = existing ?? createAiChatRecord(dateKey, providerLabel, now)
    const next = appendChatMessage({ ...record, providerLabel }, message, now)
    await this.adapter.aiChats.put(next)
    return next
  }

  /** 清空某天的对话记录 */
  async deleteByDateKey(dateKey: string): Promise<void> {
    await this.adapter.aiChats.delete(dateKey)
  }
}
