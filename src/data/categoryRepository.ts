import type { Category, CategoryId } from '@/domain/category'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import type { StorageAdapter } from './adapters/StorageAdapter'

/** 允许从外部更新的字段集合 */
type CategoryUpdatable = Pick<Category, 'name' | 'folders' | 'weeklyBudget'>

/** 兼容旧版 {zh,en} → 新版 string */
function normalizeName(name: unknown): string {
  if (typeof name === 'string') return name
  if (typeof name === 'object' && name !== null) {
    const obj = name as Record<string, unknown>
    if (typeof obj.zh === 'string') return obj.zh
  }
  return String(name ?? '')
}

export class CategoryRepository {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  // Returns all 6 categories in DEFAULT_CATEGORIES order.
  // Auto-seeds default categories if the table is empty (defense-in-depth).
  async getAll(): Promise<Category[]> {
    let all = await this.adapter.categories.getAll()
    if (all.length === 0) {
      await this.adapter.categories.bulkPut([...DEFAULT_CATEGORIES])
      all = await this.adapter.categories.getAll()
    }
    const order = DEFAULT_CATEGORIES.map((c) => c.id)
    return all
      .map((c) => ({ ...c, name: normalizeName(c.name) }))
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }

  async update(id: CategoryId, changes: CategoryUpdatable): Promise<Category> {
    await this.adapter.categories.update(id, changes)
    const updated = await this.adapter.categories.get(id)
    if (updated === undefined) throw new Error(`Category not found: ${id}`)
    return updated
  }
}
