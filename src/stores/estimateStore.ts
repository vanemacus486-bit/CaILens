import { create } from 'zustand'
import { getEstimateRepo } from '@/data/getRepositories'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { CategoryId } from '@/domain/category'

interface EstimateState {
  estimates: WeeklyEstimate[]
  isLoaded: boolean
  loadEstimates: (weekStart: number) => Promise<void>
  saveEstimate: (weekStart: number, categoryId: CategoryId, estimatedHours: number) => Promise<void>
}

export const useEstimateStore = create<EstimateState>()((set) => ({
  estimates: [],
  isLoaded: false,

  loadEstimates: async (weekStart) => {
    const estimates = await getEstimateRepo().getByWeek(weekStart)
    set({ estimates, isLoaded: true })
  },

  saveEstimate: async (weekStart, categoryId, estimatedHours) => {
    const updated = await getEstimateRepo().upsert(weekStart, categoryId, estimatedHours)
    set((state) => {
      const idx = state.estimates.findIndex((e) => e.id === updated.id)
      if (idx >= 0) {
        const next = [...state.estimates]
        next[idx] = updated
        return { estimates: next }
      }
      return { estimates: [...state.estimates, updated] }
    })
  },
}))
