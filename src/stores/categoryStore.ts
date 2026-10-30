import { create } from 'zustand'
import { getCategoryRepo } from '@/data/getRepositories'
import type { Category, CategoryId } from '@/domain/category'

interface CategoryState {
  categories: Category[]
  isLoaded: boolean
  /** 加载/更新失败信息。分类加载失败会让所有事件变成无色 + 回退名，必须让用户看见 */
  error: string | null
  loadCategories: () => Promise<void>
  updateCategory: (id: CategoryId, changes: Partial<Pick<Category, 'name' | 'folders' | 'weeklyBudget'>>) => Promise<void>
}

export const useCategoryStore = create<CategoryState>()((set) => ({
  categories: [],
  isLoaded:   false,
  error:      null,

  loadCategories: async () => {
    try {
      const categories = await getCategoryRepo().getAll()
      set({ categories, isLoaded: true, error: null })
    } catch (e) {
      set({ isLoaded: true, error: (e as Error).message })
    }
  },

  updateCategory: async (id, changes) => {
    try {
      const updated = await getCategoryRepo().update(id, changes)
      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? updated : c)),
        error: null,
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },
}))
