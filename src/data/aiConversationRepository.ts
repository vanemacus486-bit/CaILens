import type { StorageAdapter } from './adapters/StorageAdapter'
import type { AiConversation, AiChatMessage } from '@/domain/aiChat'
import type { PinnedAnalysis, MessageFeedback } from '@/domain/aiChat'

export class AiConversationRepository {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  async getByWeek(weekStart: number): Promise<AiConversation | undefined> {
    const results = await this.adapter.conversations.query({
      where: { key: 'weekStart', op: 'equals', value: weekStart },
      limit: 1,
    })
    return results[0]
  }

  async getById(id: string): Promise<AiConversation | undefined> {
    return this.adapter.conversations.get(id)
  }

  async listAll(): Promise<AiConversation[]> {
    return this.adapter.conversations.query({
      orderBy: 'updatedAt',
      orderDir: 'desc',
    })
  }

  async upsert(conversation: AiConversation): Promise<void> {
    await this.adapter.conversations.put(conversation)
  }

  async update(id: string, changes: Partial<AiConversation>): Promise<void> {
    await this.adapter.conversations.update(id, changes)
  }

  async delete(id: string): Promise<void> {
    // Delete all messages for this conversation first
    const messages = await this.getMessages(id)
    for (const msg of messages) {
      await this.adapter.chatMessages.delete(msg.id)
    }
    await this.adapter.conversations.delete(id)
  }

  async getMessages(conversationId: string): Promise<AiChatMessage[]> {
    return this.adapter.chatMessages.query({
      where: { key: 'conversationId', op: 'equals', value: conversationId },
      orderBy: 'createdAt',
      orderDir: 'asc',
    })
  }

  async addMessage(message: AiChatMessage): Promise<void> {
    await this.adapter.chatMessages.put(message)
  }

  async updateMessage(id: string, changes: Partial<AiChatMessage>): Promise<void> {
    await this.adapter.chatMessages.update(id, changes)
  }

  async getOldestConversationDate(): Promise<number | null> {
    const all = await this.listAll()
    if (all.length === 0) return null
    return all[all.length - 1].updatedAt
  }

  /** Delete conversations older than the given timestamp. Returns count deleted. */
  async deleteOlderThan(before: number): Promise<number> {
    const all = await this.listAll()
    let count = 0
    for (const conv of all) {
      if (conv.updatedAt < before) {
        await this.delete(conv.id)
        count++
      }
    }
    return count
  }

  // ── Pinned Analyses ──────────────────────────────────────────

  async getPinsByDate(date: number): Promise<PinnedAnalysis[]> {
    return this.adapter.pinnedAnalyses.query({
      where: { key: 'date', op: 'equals', value: date },
    })
  }

  async upsertPin(pin: PinnedAnalysis): Promise<void> {
    await this.adapter.pinnedAnalyses.put(pin)
  }

  async deletePin(id: string): Promise<void> {
    await this.adapter.pinnedAnalyses.delete(id)
  }

  async getAllPins(): Promise<PinnedAnalysis[]> {
    return this.adapter.pinnedAnalyses.query({
      orderBy: 'date',
      orderDir: 'desc',
    })
  }

  // ── Message Feedback ─────────────────────────────────────────

  async addFeedback(feedback: MessageFeedback): Promise<void> {
    await this.adapter.messageFeedback.put(feedback)
  }

  async getFeedbackForMessage(messageId: string): Promise<MessageFeedback | null> {
    const results = await this.adapter.messageFeedback.query({
      where: { key: 'messageId', op: 'equals', value: messageId },
      limit: 1,
    })
    return results[0] ?? null
  }

  async getAllFeedback(): Promise<MessageFeedback[]> {
    return this.adapter.messageFeedback.getAll()
  }
}
