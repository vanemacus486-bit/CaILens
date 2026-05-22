/**
 * # BodyMetricsStore — 身体指标时序记录
 *
 * 管理体重/BMI/心率等指标的历史记录，支持趋势分析。
 * 与 profileStore 不同（profileStore 只存最新快照），
 * 此 store 保存每次录入的历史时序数据。
 */

import { create } from 'zustand'
import type { BodyMetricsRecord } from '@/domain/dailyContext'
import { getBodyMetricsRepo } from '@/data/getRepositories'

interface BodyMetricsState {
  records: BodyMetricsRecord[]
  isLoading: boolean
  /** 已加载的日期范围 */
  loadedRange: { start: string; end: string } | null

  loadRecords: (startDate: string, endDate: string) => Promise<void>
  loadRecent: (limit?: number) => Promise<void>
  saveRecord: (record: Omit<BodyMetricsRecord, 'id' | 'createdAt'>) => Promise<BodyMetricsRecord>
  deleteRecord: (id: string) => Promise<void>
}

export const useBodyMetricsStore = create<BodyMetricsState>()((set, get) => ({
  records: [],
  isLoading: false,
  loadedRange: null,

  loadRecords: async (startDate, endDate) => {
    set({ isLoading: true, loadedRange: { start: startDate, end: endDate } })
    try {
      const records = await getBodyMetricsRepo().getByDateRange(startDate, endDate)
      set({ records, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  loadRecent: async (limit = 90) => {
    set({ isLoading: true })
    try {
      const records = await getBodyMetricsRepo().getRecent(limit)
      const dates = records.length > 0
        ? { start: records[0].date, end: records[records.length - 1].date }
        : null
      set({ records, isLoading: false, loadedRange: dates })
    } catch {
      set({ isLoading: false })
    }
  },

  saveRecord: async (record) => {
    const saved = await getBodyMetricsRepo().save(record)
    const { records } = get()
    // Replace if same date, append otherwise
    const filtered = records.filter((r) => r.date !== saved.date)
    set({ records: [...filtered, saved].sort((a, b) => a.date.localeCompare(b.date)) })
    return saved
  },

  deleteRecord: async (id) => {
    await getBodyMetricsRepo().delete(id)
    const { records } = get()
    set({ records: records.filter((r) => r.id !== id) })
  },
}))
