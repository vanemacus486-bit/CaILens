/**
 * # DailyContextRepository
 *
 * 操作每日穿搭记录。每条记录独立存储，
 * 通过 date 字段索引以支持范围查询。
 *
 * 注意：饮食数据不从本 Repository 读取——饮食信息
 * 通过 MealData (typedData on events) 聚合得到。
 */

import type { StorageAdapter } from './adapters/StorageAdapter'
import type { DailyOutfit } from '@/domain/dailyContext'

export interface Clock {
  now(): number
}

export interface IdGenerator {
  generate(): string
}

export class DailyContextRepository {
  private adapter: StorageAdapter
  private idGen: IdGenerator

  constructor(
    adapter: StorageAdapter,
    idGen: IdGenerator = { generate: () => crypto.randomUUID() },
  ) {
    this.adapter = adapter
    this.idGen = idGen
  }

  // ── Outfit ──────────────────────────────────────────────

  async getOutfit(date: string): Promise<DailyOutfit | undefined> {
    const all = await this.adapter.outfitLogs.query({
      where: { key: 'date', op: 'equals', value: date },
      limit: 1,
    })
    return all.find((o) => !o.deletedAt)
  }

  async saveOutfit(outfit: Omit<DailyOutfit, 'id'>): Promise<DailyOutfit> {
    const now = Date.now()
    const record: DailyOutfit = { ...outfit, id: this.idGen.generate(), createdAt: now, updatedAt: now, deletedAt: null }
    await this.adapter.outfitLogs.put(record)
    return record
  }

  async updateOutfit(id: string, changes: Partial<Omit<DailyOutfit, 'id'>>): Promise<void> {
    await this.adapter.outfitLogs.update(id, { ...changes, updatedAt: Date.now(), deletedAt: null } as Partial<DailyOutfit>)
  }

  async deleteOutfit(id: string): Promise<void> {
    const existing = await this.adapter.outfitLogs.get(id)
    if (!existing) return
    const now = Date.now()
    await this.adapter.outfitLogs.put({ ...existing, deletedAt: now, updatedAt: now })
  }

  async getOutfitsByDateRange(startDate: string, endDate: string): Promise<DailyOutfit[]> {
    return this.adapter.outfitLogs.query({
      filter: (o) => !o.deletedAt && o.date >= startDate && o.date <= endDate,
    })
  }
}
