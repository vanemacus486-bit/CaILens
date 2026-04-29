import { create } from 'zustand'
import { categoryRepository } from '@/data/categoryRepository'
import type { Category, CategoryId, CategoryName } from '@/domain/category'

interface CategoryState {
  categories: Category[]
  isLoaded: boolean
  loadCategories: () => Promise<void>
  updateCategoryName: (id: CategoryId, name: CategoryName) => Promise<void>
  updateCategoryKeywords: (id: CategoryId, keywords: string[]) => Promise<void>
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

  updateCategoryKeywords: async (id, keywords) => {
    const updated = await categoryRepository.updateKeywords(id, keywords)
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? updated : c)),
    }))
  },
}))
