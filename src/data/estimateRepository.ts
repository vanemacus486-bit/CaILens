import type { WeeklyEstimate } from '@/domain/estimate'
import type { CategoryId } from '@/domain/category'
import type { CailensDB } from './db'
import { db as defaultDb } from './db'

export class EstimateRepository {
  private db: CailensDB

  constructor(db: CailensDB) {
    this.db = db
  }

  async getByWeek(weekStart: number): Promise<WeeklyEstimate[]> {
    return this.db.weeklyEstimates.where('weekStart').equals(weekStart).toArray()
  }

  async upsert(
    weekStart: number,
    categoryId: CategoryId,
    estimatedHours: number,
  ): Promise<WeeklyEstimate> {
    const existing = await this.db.weeklyEstimates
      .where({ weekStart, categoryId })
      .first()

    if (existing) {
      await this.db.weeklyEstimates.update(existing.id, {
        estimatedHours,
        createdAt: Date.now(),
      })
      return (await this.db.weeklyEstimates.get(existing.id))!
    }

    const id = crypto.randomUUID()
    const record: WeeklyEstimate = {
      id,
      weekStart,
      categoryId,
      estimatedHours,
      createdAt: Date.now(),
    }
    await this.db.weeklyEstimates.put(record)
    return record
  }

  /** Returns the most recent N weeks of estimate data for bias detection */
  async getRecentHistory(weekStarts: number[]): Promise<WeeklyEstimate[][]> {
    const result: WeeklyEstimate[][] = []
    for (const ws of weekStarts) {
      result.push(await this.getByWeek(ws))
    }
    return result
  }
}

export const estimateRepository = new EstimateRepository(defaultDb)
