import type { InspirationLog, CreateInspirationInput } from '@/domain/inspiration'
import type { StorageAdapter } from './adapters/StorageAdapter'

export class InspirationRepository {
  private adapter: StorageAdapter
  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  async getByProject(projectId: string): Promise<InspirationLog[]> {
    const all = await this.adapter.inspirations.getAll()
    return all
      .filter((i) => i.projectId === projectId)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  async getByEvent(eventId: string): Promise<InspirationLog | null> {
    const all = await this.adapter.inspirations.getAll()
    return all.find((i) => i.eventId === eventId) ?? null
  }

  async create(input: CreateInspirationInput): Promise<InspirationLog> {
    const inspiration: InspirationLog = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      eventId: input.eventId,
      content: input.content,
      createdAt: Date.now(),
    }
    await this.adapter.inspirations.put(inspiration)
    return inspiration
  }

  async delete(id: string): Promise<void> {
    await this.adapter.inspirations.delete(id)
  }

  /** 获取近期灵感（用于 SOP 修订提示） */
  async findRecentForProject(projectId: string, limit = 30): Promise<InspirationLog[]> {
    const all = await this.getByProject(projectId)
    return all.slice(0, limit)
  }
}
