import type { DailyContext, CreateDailyContextInput, UpdateDailyContextInput } from '@/domain/dailyContext'
import type { StorageAdapter } from './adapters/StorageAdapter'

export interface Clock {
  now(): number
}

export interface IdGenerator {
  generate(): string
}

export class ContextRepository {
  private adapter: StorageAdapter
  private clock: Clock
  constructor(
    adapter: StorageAdapter,
    clock: Clock = { now: () => Date.now() },
    _idGen: IdGenerator = { generate: () => crypto.randomUUID() },
  ) {
    this.adapter = adapter
    this.clock   = clock
  }

  /**
   * 获取指定日期的 DailyContext。id 格式为 `daily-{date}`。
   */
  async getByDate(date: number): Promise<DailyContext | undefined> {
    const id = this.makeId(date)
    return this.adapter.dailyContexts.get(id)
  }

  /**
   * 获取日期范围内的 DailyContext，两端包含。
   */
  async getByDateRange(startDate: number, endDate: number): Promise<DailyContext[]> {
    return this.adapter.dailyContexts.query({
      filter: (ctx) => ctx.date >= startDate && ctx.date <= endDate,
    })
  }

  /**
   * 创建或更新（upsert）当天的 DailyContext。
   * 如果当天已有记录，合并更新。
   */
  async upsert(input: CreateDailyContextInput): Promise<DailyContext> {
    const id = this.makeId(input.date)
    const existing = await this.adapter.dailyContexts.get(id)
    const now = this.clock.now()

    const context: DailyContext = existing
      ? { ...existing, ...input, id, updatedAt: now }
      : { ...input, id, createdAt: now, updatedAt: now }

    await this.adapter.dailyContexts.put(context)
    return context
  }

  /**
   * 部分更新指定日期的 DailyContext。
   */
  async update(input: UpdateDailyContextInput): Promise<DailyContext> {
    const existing = await this.adapter.dailyContexts.get(input.id)
    if (!existing) {
      throw new Error(`DailyContext not found: ${input.id}`)
    }
    const updated: DailyContext = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: this.clock.now(),
    }
    await this.adapter.dailyContexts.put(updated)
    return updated
  }

  /**
   * 删除指定日期的 DailyContext。
   */
  async delete(date: number): Promise<void> {
    const id = this.makeId(date)
    await this.adapter.dailyContexts.delete(id)
  }

  /**
   * 获取所有 DailyContext 记录。
   */
  async getAll(): Promise<DailyContext[]> {
    return this.adapter.dailyContexts.getAll()
  }

  private makeId(date: number): string {
    return `daily-${date}`
  }
}
