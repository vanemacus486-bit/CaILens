/**
 * # DailyContextStore — 每日生活上下文
 *
 * 管理穿搭、卫生、娱乐的录入与查询。
 * 饮食数据不从本 store 读取——由 eventStore 的 MealData 聚合。
 */

import { create } from 'zustand'
import type { DailyOutfit, DailyHygiene, HygieneActivity } from '@/domain/dailyContext'
import { getDailyContextRepo } from '@/data/getRepositories'

interface DailyContextState {
  // ── 穿搭 ──
  outfits: DailyOutfit[]
  /** 当前查看的日期范围 */
  outfitRange: { start: string; end: string } | null
  isLoadingOutfits: boolean
  loadOutfits: (startDate: string, endDate: string) => Promise<void>
  saveOutfit: (outfit: Omit<DailyOutfit, 'id'>) => Promise<DailyOutfit>

  // ── 卫生 ──
  hygieneRecords: DailyHygiene[]
  isLoadingHygiene: boolean
  loadHygiene: (startDate: string, endDate: string) => Promise<void>
  saveHygiene: (date: string, activities: HygieneActivity[]) => Promise<DailyHygiene>
  /** 获取最近 N 条卫生记录（用于基线计算） */
  recentHygiene: DailyHygiene[]
  loadRecentHygiene: (limitDays?: number) => Promise<void>
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

  // ── Hygiene ──
  hygieneRecords: [],
  isLoadingHygiene: false,
  recentHygiene: [],

  loadHygiene: async (startDate, endDate) => {
    set({ isLoadingHygiene: true })
    try {
      const records = await getDailyContextRepo().getHygieneByDateRange(startDate, endDate)
      set({ hygieneRecords: records, isLoadingHygiene: false })
    } catch {
      set({ isLoadingHygiene: false })
    }
  },

  saveHygiene: async (date, activities) => {
    const saved = await getDailyContextRepo().saveHygiene({ date, activities })
    const { hygieneRecords } = get()
    set({ hygieneRecords: [...hygieneRecords.filter((h) => h.date !== date), saved] })
    return saved
  },

  loadRecentHygiene: async (limitDays = 30) => {
    try {
      const recent = await getDailyContextRepo().getRecentHygiene(limitDays)
      set({ recentHygiene: recent })
    } catch { /* ignore */ }
  },
}))
