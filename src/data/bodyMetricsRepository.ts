/**
 * # BodyMetricsRepository
 *
 * 操作身体指标时序记录。与 Profile 不同（Profile 只存最新快照），
 * 此 Repository 保存每次录入的历史记录，支持趋势分析。
 */

import type { StorageAdapter } from './adapters/StorageAdapter'
import type { BodyMetricsRecord } from '@/domain/dailyContext'

export interface IdGenerator {
  generate(): string
}

export class BodyMetricsRepository {
  private adapter: StorageAdapter
  private idGen: IdGenerator

  constructor(
    adapter: StorageAdapter,
    idGen: IdGenerator = { generate: () => crypto.randomUUID() },
  ) {
    this.adapter = adapter
    this.idGen = idGen
  }

  /** 获取指定日期范围的记录（按日期升序） */
  async getByDateRange(startDate: string, endDate: string): Promise<BodyMetricsRecord[]> {
    const all = await this.adapter.bodyMetricsRecords.query({
      filter: (r) => r.date >= startDate && r.date <= endDate,
    })
    return all.sort((a, b) => a.date.localeCompare(b.date))
  }

  /** 获取最近 N 条记录 */
  async getRecent(limit = 90): Promise<BodyMetricsRecord[]> {
    const all = await this.adapter.bodyMetricsRecords.query({
      orderBy: 'date',
      orderDir: 'desc',
      limit,
    })
    return all.sort((a, b) => a.date.localeCompare(b.date))
  }

  /** 获取指定日期的记录 */
  async getByDate(date: string): Promise<BodyMetricsRecord | undefined> {
    const all = await this.adapter.bodyMetricsRecords.query({
      where: { key: 'date', op: 'equals', value: date },
      limit: 1,
    })
    return all[0]
  }

  /** 保存一条记录（若有同日记录则覆盖） */
  async save(record: Omit<BodyMetricsRecord, 'id' | 'createdAt'>): Promise<BodyMetricsRecord> {
    const existing = await this.getByDate(record.date)
    const now = Date.now()
    const saved: BodyMetricsRecord = existing
      ? { ...existing, ...record, createdAt: existing.createdAt }
      : { ...record, id: this.idGen.generate(), createdAt: now }
    await this.adapter.bodyMetricsRecords.put(saved)
    return saved
  }

  /** 删除记录 */
  async delete(id: string): Promise<void> {
    await this.adapter.bodyMetricsRecords.delete(id)
  }

  /** 获取全部记录（按日期升序） */
  async getAll(): Promise<BodyMetricsRecord[]> {
    const all = await this.adapter.bodyMetricsRecords.getAll()
    return all.sort((a, b) => a.date.localeCompare(b.date))
  }
}
