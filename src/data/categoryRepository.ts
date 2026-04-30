import type { Category, CategoryId, CategoryName, KeywordFolder } from '@/domain/category'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import type { CailensDB } from './db'
import { db as defaultDb } from './db'

export class CategoryRepository {
  private db: CailensDB

  constructor(db: CailensDB) {
    this.db = db
  }

  // Returns all 6 categories in DEFAULT_CATEGORIES order.
  async getAll(): Promise<Category[]> {
    const all   = await this.db.categories.toArray()
    const order = DEFAULT_CATEGORIES.map((c) => c.id)
    return all.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }

  async updateName(id: CategoryId, name: CategoryName): Promise<Category> {
    await this.db.categories.update(id, { name })
    const updated = await this.db.categories.get(id)
    if (updated === undefined) throw new Error(`Category not found: ${id}`)
    return updated
  }

  async updateFolders(id: CategoryId, folders: KeywordFolder[]): Promise<Category> {
    await this.db.categories.update(id, { folders })
    const updated = await this.db.categories.get(id)
    if (updated === undefined) throw new Error(`Category not found: ${id}`)
    return updated
  }
}

export const categoryRepository = new CategoryRepository(defaultDb)
