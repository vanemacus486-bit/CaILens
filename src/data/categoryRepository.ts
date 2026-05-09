import type { Category, CategoryId, CategoryName, KeywordFolder } from '@/domain/category'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import type { StorageAdapter } from './adapters/StorageAdapter'

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
    return all.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }

  async updateName(id: CategoryId, name: CategoryName): Promise<Category> {
    await this.adapter.categories.update(id, { name } as Partial<Category>)
    const updated = await this.adapter.categories.get(id)
    if (updated === undefined) throw new Error(`Category not found: ${id}`)
    return updated
  }

  async updateFolders(id: CategoryId, folders: KeywordFolder[]): Promise<Category> {
    await this.adapter.categories.update(id, { folders } as Partial<Category>)
    const updated = await this.adapter.categories.get(id)
    if (updated === undefined) throw new Error(`Category not found: ${id}`)
    return updated
  }

  async updateBudget(id: CategoryId, weeklyBudget: number): Promise<Category> {
    await this.adapter.categories.update(id, { weeklyBudget } as Partial<Category>)
    const updated = await this.adapter.categories.get(id)
    if (updated === undefined) throw new Error(`Category not found: ${id}`)
    return updated
  }
}
