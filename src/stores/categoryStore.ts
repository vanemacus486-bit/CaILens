import { create } from 'zustand'
import { categoryRepository } from '@/data/categoryRepository'
import type { Category, CategoryId, CategoryName } from '@/domain/category'

interface CategoryState {
  categories: Category[]
  isLoaded: boolean
  loadCategories: () => Promise<void>
  updateCategoryName: (id: CategoryId, name: CategoryName) => Promise<void>
}

export const useCategoryStore = create<CategoryState>()((set) => ({
  categories: [],
  isLoaded:   false,

  loadCategories: async () => {
    const categories = await categoryRepository.getAll()
    set({ categories, isLoaded: true })
  },

  updateCategoryName: async (id, name) => {
    const updated = await categoryRepository.updateName(id, name)
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? updated : c)),
    }))
  },
}))
