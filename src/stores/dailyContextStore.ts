/**
 * # DailyContextStore — 每日生活上下文
 *
 * 管理穿搭的录入与查询。
 * 饮食数据不从本 store 读取——由 eventStore 的 MealData 聚合。
 */

import { create } from 'zustand'
import type { DailyOutfit } from '@/domain/dailyContext'
import { getDailyContextRepo } from '@/data/getRepositories'

interface DailyContextState {
  // ── 穿搭 ──
  outfits: DailyOutfit[]
  /** 当前查看的日期范围 */
  outfitRange: { start: string; end: string } | null
  isLoadingOutfits: boolean
  loadOutfits: (startDate: string, endDate: string) => Promise<void>
  saveOutfit: (outfit: Omit<DailyOutfit, 'id'>) => Promise<DailyOutfit>
}

export const useDailyContextStore = create<DailyContextState>()((set, get) => ({
  // ── Outfit ──
  outfits: [],
  outfitRange: null,
  isLoadingOutfits: false,

  loadOutfits: async (startDate, endDate) => {
    set({ isLoadingOutfits: true, outfitRange: { start: startDate, end: endDate } })
    try {
      const outfits = await getDailyContextRepo().getOutfitsByDateRange(startDate, endDate)
      set({ outfits, isLoadingOutfits: false })
    } catch {
      set({ isLoadingOutfits: false })
    }
  },

  saveOutfit: async (outfit) => {
    const saved = await getDailyContextRepo().saveOutfit(outfit)
    const { outfits, outfitRange } = get()
    // Only add to local state if within current range
    if (outfitRange && saved.date >= outfitRange.start && saved.date <= outfitRange.end) {
      set({ outfits: [...outfits.filter((o) => o.date !== saved.date), saved] })
    }
    return saved
  },
}))
