import { create } from 'zustand'
import { getCategoryRepo } from '@/data/getRepositories'
import type { Category, CategoryId, CategoryName, KeywordFolder } from '@/domain/category'

interface CategoryState {
  categories: Category[]
  isLoaded: boolean
  loadCategories: () => Promise<void>
  updateCategoryName: (id: CategoryId, name: CategoryName) => Promise<void>
  updateCategoryFolders: (id: CategoryId, folders: KeywordFolder[]) => Promise<void>
  updateCategoryBudget: (id: CategoryId, weeklyBudget: number) => Promise<void>
}

export const useCategoryStore = create<CategoryState>()((set) => ({
  categories: [],
  isLoaded:   false,

  loadCategories: async () => {
    const categories = await getCategoryRepo().getAll()
    set({ categories, isLoaded: true })
  },

  updateCategoryName: async (id, name) => {
    const updated = await getCategoryRepo().updateName(id, name)
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? updated : c)),
    }))
  },

  updateCategoryFolders: async (id, folders) => {
    const updated = await getCategoryRepo().updateFolders(id, folders)
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? updated : c)),
    }))
  },

  updateCategoryBudget: async (id, weeklyBudget) => {
    const updated = await getCategoryRepo().updateBudget(id, weeklyBudget)
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? updated : c)),
    }))
  },
}))
