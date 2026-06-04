/**
 * # DailyContextRepository
 *
 * 操作每日穿搭/卫生/娱乐记录。每条记录独立存储，
 * 通过 date 字段索引以支持范围查询。
 *
 * 注意：饮食数据不从本 Repository 读取——饮食信息
 * 通过 MealData (typedData on events) 聚合得到。
 */

import type { StorageAdapter } from './adapters/StorageAdapter'
import type { DailyOutfit, DailyHygiene } from '@/domain/dailyContext'
import { computeHygieneScore } from '@/domain/dailyContext'

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
    return all[0]
  }

  async saveOutfit(outfit: Omit<DailyOutfit, 'id'>): Promise<DailyOutfit> {
    const record: DailyOutfit = { ...outfit, id: this.idGen.generate() }
    await this.adapter.outfitLogs.put(record)
    return record
  }

  async updateOutfit(id: string, changes: Partial<Omit<DailyOutfit, 'id'>>): Promise<void> {
    await this.adapter.outfitLogs.update(id, changes as Partial<DailyOutfit>)
  }

  async deleteOutfit(id: string): Promise<void> {
    await this.adapter.outfitLogs.delete(id)
  }

  async getOutfitsByDateRange(startDate: string, endDate: string): Promise<DailyOutfit[]> {
    return this.adapter.outfitLogs.query({
      filter: (o) => o.date >= startDate && o.date <= endDate,
    })
  }

  // ── Hygiene ─────────────────────────────────────────────

  async getHygiene(date: string): Promise<DailyHygiene | undefined> {
    const all = await this.adapter.hygieneLogs.query({
      where: { key: 'date', op: 'equals', value: date },
      limit: 1,
    })
    return all[0]
  }

  async saveHygiene(data: { date: string; activities: DailyHygiene['activities'] }): Promise<DailyHygiene> {
    const score = computeHygieneScore(data.activities)
    const record: DailyHygiene = {
      id: this.idGen.generate(),
      date: data.date,
      activities: data.activities,
      score,
    }
    await this.adapter.hygieneLogs.put(record)
    return record
  }

  async getHygieneByDateRange(startDate: string, endDate: string): Promise<DailyHygiene[]> {
    return this.adapter.hygieneLogs.query({
      filter: (h) => h.date >= startDate && h.date <= endDate,
    })
  }

  /** 获取最近 N 条卫生记录（用于基准线计算） */
  async getRecentHygiene(limitDays = 30): Promise<DailyHygiene[]> {
    return this.adapter.hygieneLogs.query({
      orderBy: 'date',
      orderDir: 'desc',
      limit: limitDays,
    })
  }
}
