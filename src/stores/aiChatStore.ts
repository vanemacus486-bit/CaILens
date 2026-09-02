/**
 * # AiChatStore
 *
 * 管理 AI 对话记录的读取与保存。组件只通过本 store 访问 aiChatRepository。
 * 记录按本地日期（dateKey）一条，缓存最近访问过的记录。
 */

import { create } from 'zustand'
import type { AiChatRecord, ChatMessage } from '@/domain/aiChat'
import { getAiChatRepo } from '@/data/getRepositories'

interface AiChatState {
  /** dateKey → 已加载的记录 */
  records: Record<string, AiChatRecord>
  /** 加载某天的对话记录（不存在时返回 undefined） */
  loadDay: (dateKey: string) => Promise<AiChatRecord | undefined>
  /** 追加一条消息并落库（读-改-写；调用方保证同一日期串行调用避免竞态） */
  appendMessage: (dateKey: string, message: ChatMessage, providerLabel: string) => Promise<AiChatRecord>
  /** 清空某天的对话记录 */
  clearDay: (dateKey: string) => Promise<void>
}

export const useAiChatStore = create<AiChatState>()((set, get) => ({
  records: {},

  loadDay: async (dateKey) => {
    const cached = get().records[dateKey]
    if (cached) return cached
    const record = await getAiChatRepo().getByDateKey(dateKey)
    if (record) {
      set((s) => ({ records: { ...s.records, [dateKey]: record } }))
    }
    return record
  },

  appendMessage: async (dateKey, message, providerLabel) => {
    const record = await getAiChatRepo().appendMessage(dateKey, message, providerLabel)
    set((s) => ({ records: { ...s.records, [dateKey]: record } }))
    return record
  },

  clearDay: async (dateKey) => {
    await getAiChatRepo().deleteByDateKey(dateKey)
    set((s) => {
      const records = { ...s.records }
      delete records[dateKey]
      return { records }
    })
  },
}))
