/**
 * # 位置与天气 Store
 *
 * 管理位置设置、天气数据的状态。通过 Zustand 提供全局访问。
 */

import { create } from 'zustand'
import { getSettingsRepo } from '@/data/getRepositories'
import { geocodeCity, fetchWeather } from '@/data/locationService'
import type { LocationSettings, WeatherData, GeocodingResult } from '@/domain/location'

interface LocationState {
  /** 当前位置设置（已持久化到 AppSettings） */
  locationSettings: LocationSettings | null
  /** 最近一次天气数据 */
  weather: WeatherData | null
  /** 天气加载中 */
  weatherLoading: boolean
  /** 天气错误信息 */
  weatherError: string | null
  /** 城市搜索候选项 */
  searchResults: GeocodingResult[]
  /** 城市搜索中 */
  searching: boolean

  /** 初始化：从 AppSettings 加载已保存的位置 */
  loadLocation: () => Promise<void>
  /** 设置城市（持久化 + 触发天气刷新） */
  setCity: (result: GeocodingResult) => Promise<void>
  /** 搜索城市 */
  searchCity: (query: string) => Promise<void>
  /** 清除搜索候选项 */
  clearSearchResults: () => void
  /** 刷新天气 */
  refreshWeather: () => Promise<void>
}

export const useLocationStore = create<LocationState>()((set, get) => ({
  locationSettings: null,
  weather: null,
  weatherLoading: false,
  weatherError: null,
  searchResults: [],
  searching: false,

  loadLocation: async () => {
    const settings = await getSettingsRepo().get()
    if (settings.location) {
      set({ locationSettings: settings.location })
    }
  },

  setCity: async (result: GeocodingResult) => {
    const loc: LocationSettings = {
      cityName: result.name,
      timezone: result.timezone,
      latitude: result.latitude,
      longitude: result.longitude,
      lastUpdated: Date.now(),
    }
    await getSettingsRepo().update({ location: loc })
    set({ locationSettings: loc, searchResults: [] })

    // 选完城市自动刷新天气
    const state = get()
    state.refreshWeather()
  },

  searchCity: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], searching: false })
      return
    }
    set({ searching: true })
    try {
      const results = await geocodeCity(query)
      set({ searchResults: results, searching: false })
    } catch {
      set({ searchResults: [], searching: false })
    }
  },

  clearSearchResults: () => {
    set({ searchResults: [] })
  },

  refreshWeather: async () => {
    const loc = get().locationSettings
    if (!loc) return

    set({ weatherLoading: true, weatherError: null })
    try {
      const weather = await fetchWeather(loc.latitude, loc.longitude, loc.timezone)
      set({ weather, weatherLoading: false })
    } catch (e) {
      set({ weatherLoading: false, weatherError: e instanceof Error ? e.message : '获取天气失败' })
    }
  },
}))
