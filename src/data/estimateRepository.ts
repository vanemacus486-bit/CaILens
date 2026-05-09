import type { WeeklyEstimate } from '@/domain/estimate'
import type { CategoryId } from '@/domain/category'
import type { StorageAdapter } from './adapters/StorageAdapter'

export class EstimateRepository {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  async getByWeek(weekStart: number): Promise<WeeklyEstimate[]> {
    return this.adapter.weeklyEstimates.query({
      where: { key: 'weekStart', op: 'equals', value: weekStart },
    })
  }

  async upsert(
    weekStart: number,
    categoryId: CategoryId,
    estimatedHours: number,
  ): Promise<WeeklyEstimate> {
    return this.adapter.weeklyEstimates.transaction('rw', async () => {
      const existing = (await this.adapter.weeklyEstimates.query({
        where: { key: 'weekStart', op: 'equals', value: weekStart },
        filter: (e) => e.categoryId === categoryId,
        limit: 1,
      }))[0]

      if (existing) {
        await this.adapter.weeklyEstimates.update(existing.id, { estimatedHours } as Partial<WeeklyEstimate>)
        return (await this.adapter.weeklyEstimates.get(existing.id))!
      }

      const id = crypto.randomUUID()
      const record: WeeklyEstimate = {
        id,
        weekStart,
        categoryId,
        estimatedHours,
        createdAt: Date.now(),
      }
      await this.adapter.weeklyEstimates.put(record)
      return record
    })
  }

  /** Returns the most recent N weeks of estimate data for bias detection */
  async getRecentHistory(weekStarts: number[]): Promise<WeeklyEstimate[][]> {
    const rows = await this.adapter.weeklyEstimates.query({
      where: { key: 'weekStart', op: 'anyOf', value: weekStarts },
    })
    const map = new Map<number, WeeklyEstimate[]>()
    for (const row of rows) {
      let group = map.get(row.weekStart)
      if (!group) { group = []; map.set(row.weekStart, group) }
      group.push(row)
    }
    return weekStarts.map((ws) => map.get(ws) ?? [])
  }
}
