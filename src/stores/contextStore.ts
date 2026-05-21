import { create } from 'zustand'
import { getContextRepo } from '@/data/getRepositories'
import type { DailyContext, CreateDailyContextInput, UpdateDailyContextInput } from '@/domain/dailyContext'
import { startOfDay } from 'date-fns'

interface ContextState {
  /** 当前已加载的所有 DailyContext（按需缓存） */
  contexts: DailyContext[]

  /** 当天是否已填写过 DailyContext */
  isTodayRecorded: boolean

  isLoading: boolean
  loadError: string | null

  /** 加载日期范围内的上下文 */
  loadRange: (startDate: number, endDate: number) => Promise<void>

  /** 检查当天是否有记录 */
  checkToday: () => Promise<void>

  /** 创建或更新当天的 DailyContext（upsert） */
  upsertToday: (input: Omit<CreateDailyContextInput, 'date'>) => Promise<DailyContext>

  /** 更新指定日期的一条记录 */
  update: (input: UpdateDailyContextInput) => Promise<DailyContext>

  /** 删除某天的记录 */
  delete: (date: number) => Promise<void>
}

function getTodayStart(): number {
  return startOfDay(new Date()).getTime()
}

export const useContextStore = create<ContextState>()((set, _get) => ({
  contexts: [],
  isTodayRecorded: false,
  isLoading: true,
  loadError: null,

  loadRange: async (startDate, endDate) => {
    set({ isLoading: true, loadError: null })
    try {
      const contexts = await getContextRepo().getByDateRange(startDate, endDate)
      set({ contexts, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load contexts'
      set({ isLoading: false, loadError: message })
    }
  },

  checkToday: async () => {
    const today = getTodayStart()
    const existing = await getContextRepo().getByDate(today)
    set({ isTodayRecorded: existing !== undefined })
  },

  upsertToday: async (input) => {
    const date = getTodayStart()
    const payload: CreateDailyContextInput = { ...input, date }
    const result = await getContextRepo().upsert(payload)
    set((state) => {
      const filtered = state.contexts.filter((c) => c.id !== result.id)
      return { contexts: [...filtered, result], isTodayRecorded: true }
    })
    return result
  },

  update: async (input) => {
    const result = await getContextRepo().update(input)
    set((state) => ({
      contexts: state.contexts.map((c) => (c.id === result.id ? result : c)),
    }))
    return result
  },

  delete: async (date) => {
    await getContextRepo().delete(date)
    const today = getTodayStart()
    set((state) => ({
      contexts: state.contexts.filter((c) => c.date !== date),
      isTodayRecorded: date !== today ? undefined : false,
    }))
  },
}))
