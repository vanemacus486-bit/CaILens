import { create } from 'zustand'
import { getCategoryRepo } from '@/data/getRepositories'
import type { Category, CategoryId } from '@/domain/category'

interface CategoryState {
  categories: Category[]
  isLoaded: boolean
  loadCategories: () => Promise<void>
  updateCategory: (id: CategoryId, changes: Partial<Pick<Category, 'name' | 'folders' | 'weeklyBudget'>>) => Promise<void>
}

export const useCategoryStore = create<CategoryState>()((set) => ({
  categories: [],
  isLoaded:   false,

  loadCategories: async () => {
    const categories = await getCategoryRepo().getAll()
    set({ categories, isLoaded: true })
  },

  updateCategory: async (id, changes) => {
    const updated = await getCategoryRepo().update(id, changes)
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? updated : c)),
    }))
  },
}))
