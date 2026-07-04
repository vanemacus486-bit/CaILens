/**
 * # 位置与天气 Store
 *
 * 管理多城市位置设置、天气数据的状态。通过 Zustand 提供全局访问。
 */

import { create } from 'zustand'
import { getSettingsRepo } from '@/data/getRepositories'
import { geocodeCity, fetchWeather } from '@/data/locationService'
import type { LocationSettings, WeatherData, GeocodingResult, SavedCity, DayLocation } from '@/domain/location'
import { geocodingToCity, cityWeatherKey, activeLocationAt } from '@/domain/location'

interface LocationState {
  /** 当前位置设置（已持久化到 AppSettings）— 兼容旧组件，指向活跃城市 */
  locationSettings: LocationSettings | null
  /** 所有已保存城市 */
  savedCities: SavedCity[]
  /** 当前活跃城市索引 */
  activeCityIndex: number
  /** 各城市天气缓存，key 为 `lat,lng` */
  weatherMap: Record<string, WeatherData>
  /** 天气加载中（按城市 key） */
  weatherLoadingMap: Record<string, boolean>
  /** 天气错误信息（按城市 key） */
  weatherErrorMap: Record<string, string | null>
  /** 城市搜索候选项 */
  searchResults: GeocodingResult[]
  /** 城市搜索中 */
  searching: boolean

  /** 日期位置标记列表 */
  dayLocations: DayLocation[]

  /** 加载日期位置标记 */
  loadDayLocations: () => Promise<void>
  /** 设置某天的位置（date: 本地午夜 UTC ms, locationName: 地点名, cityRef?: 可选城市索引） */
  setDayLocation: (date: number, locationName: string, cityRef?: number) => Promise<void>
  /** 清除某天的位置标记 */
  removeDayLocation: (date: number) => Promise<void>
  /** 获取指定日期所处的活跃位置 */
  getActiveLocation: (dayMs: number) => DayLocation | null

  /** 初始化：从 AppSettings 加载已保存的城市 */
  loadLocation: () => Promise<void>
  /** 添加城市（持久化 + 触发天气刷新） */
  addCity: (result: GeocodingResult) => Promise<void>
  /** 删除城市 */
  removeCity: (index: number) => Promise<void>
  /** 切换活跃城市 */
  setActiveCity: (index: number) => Promise<void>
  /** 刷新指定城市的天气 */
  refreshCityWeather: (cityIndex: number) => Promise<void>
  /** 刷新所有城市的天气 */
  refreshAllWeather: () => Promise<void>
  /** 搜索城市（language 用于控制 Open-Meteo 返回结果的语言，默认 'zh' 向后兼容） */
  searchCity: (query: string, language?: string) => Promise<void>
  /** 清除搜索候选项 */
  clearSearchResults: () => void
}

function buildLocationSettings(city: SavedCity): LocationSettings {
  return {
    cityName: city.cityName,
    timezone: city.timezone,
    latitude: city.latitude,
    longitude: city.longitude,
    lastUpdated: city.lastUpdated,
  }
}

export const useLocationStore = create<LocationState>()((set, get) => ({
  locationSettings: null,
  savedCities: [],
  activeCityIndex: 0,
  dayLocations: [],
  weatherMap: {},
  weatherLoadingMap: {},
  weatherErrorMap: {},
  searchResults: [],
  searching: false,

  loadLocation: async () => {
    const settings = await getSettingsRepo().get()
    let savedCities: SavedCity[] = settings.savedCities ?? []
    let activeCityIndex = settings.activeCityIndex ?? 0

    // 迁移旧版单城市数据
    if (savedCities.length === 0 && settings.location) {
      const old = settings.location
      savedCities = [{
        cityName: old.cityName,
        country: '',
        timezone: old.timezone,
        latitude: old.latitude,
        longitude: old.longitude,
        lastUpdated: old.lastUpdated,
      }]
      activeCityIndex = 0
      // 写回新格式
      await getSettingsRepo().update({ savedCities, activeCityIndex })
    }

    // 安全 clamp
    if (activeCityIndex >= savedCities.length) activeCityIndex = 0

    set({
      savedCities,
      activeCityIndex,
      locationSettings: savedCities.length > 0
        ? buildLocationSettings(savedCities[activeCityIndex])
        : null,
      // 水合持久化的天气缓存：断网/请求失败时兜底显示上次数据。
      // 内存优先——loadLocation 可能被二次调用（如设置页挂载），不能让旧缓存覆盖刚刷新的结果
      weatherMap: { ...(settings.weatherCache ?? {}), ...get().weatherMap },
    })
  },

  loadDayLocations: async () => {
    const settings = await getSettingsRepo().get()
    set({ dayLocations: settings.dayLocations ?? [] })
  },

  setDayLocation: async (date: number, locationName: string, cityRef?: number) => {
    const state = get()
    const now = Date.now()
    const existing = state.dayLocations.find((l) => l.date === date)
    let updated: DayLocation[]
    if (existing) {
      updated = state.dayLocations.map((l) =>
        l.date === date
          ? { ...l, locationName, cityRef, updatedAt: now }
          : l,
      )
    } else {
      updated = [
        ...state.dayLocations,
        { date, locationName, cityRef, createdAt: now, updatedAt: now },
      ]
    }
    await getSettingsRepo().update({ dayLocations: updated })
    set({ dayLocations: updated })
  },

  removeDayLocation: async (date: number) => {
    const state = get()
    const updated = state.dayLocations.filter((l) => l.date !== date)
    await getSettingsRepo().update({ dayLocations: updated })
    set({ dayLocations: updated })
  },

  getActiveLocation: (dayMs: number): DayLocation | null => {
    return activeLocationAt(get().dayLocations, dayMs)
  },

  addCity: async (result: GeocodingResult) => {
    const state = get()
    const newCity = geocodingToCity(result)
    const updatedCities = [...state.savedCities, newCity]
    const newIndex = updatedCities.length - 1

    await getSettingsRepo().update({ savedCities: updatedCities, activeCityIndex: newIndex })

    set({
      savedCities: updatedCities,
      activeCityIndex: newIndex,
      locationSettings: buildLocationSettings(newCity),
      searchResults: [],
    })

    // 自动刷新新城市的天气
    get().refreshCityWeather(newIndex)
  },

  removeCity: async (index: number) => {
    const state = get()
    if (index < 0 || index >= state.savedCities.length) return
    if (state.savedCities.length <= 1) return // 至少保留一个城市

    const updatedCities = state.savedCities.filter((_, i) => i !== index)
    let newActiveIndex = state.activeCityIndex
    if (index === state.activeCityIndex) {
      newActiveIndex = 0
    } else if (index < state.activeCityIndex) {
      newActiveIndex--
    }
    if (newActiveIndex >= updatedCities.length) newActiveIndex = 0

    // 清理 weatherMap 中被删除城市的记录
    const removed = state.savedCities[index]
    const removedKey = cityWeatherKey(removed.latitude, removed.longitude)
    const restWeatherMap: Record<string, WeatherData> = {}
    const restLoadingMap: Record<string, boolean> = {}
    const restErrorMap: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(state.weatherMap)) {
      if (k !== removedKey) restWeatherMap[k] = v
    }
    for (const [k, v] of Object.entries(state.weatherLoadingMap)) {
      if (k !== removedKey) restLoadingMap[k] = v
    }
    for (const [k, v] of Object.entries(state.weatherErrorMap)) {
      if (k !== removedKey) restErrorMap[k] = v
    }

    await getSettingsRepo().update({
      savedCities: updatedCities,
      activeCityIndex: newActiveIndex,
      weatherCache: restWeatherMap,
    })

    set({
      savedCities: updatedCities,
      activeCityIndex: newActiveIndex,
      locationSettings: buildLocationSettings(updatedCities[newActiveIndex]),
      weatherMap: restWeatherMap,
      weatherLoadingMap: restLoadingMap,
      weatherErrorMap: restErrorMap,
    })
  },

  setActiveCity: async (index: number) => {
    const state = get()
    if (index < 0 || index >= state.savedCities.length) return
    if (index === state.activeCityIndex) return

    await getSettingsRepo().update({ activeCityIndex: index })

    set({
      activeCityIndex: index,
      locationSettings: buildLocationSettings(state.savedCities[index]),
    })

    // 切换到新城市时自动刷新天气
    const city = state.savedCities[index]
    const key = cityWeatherKey(city.latitude, city.longitude)
    if (!state.weatherMap[key]) {
      get().refreshCityWeather(index)
    }
  },

  refreshCityWeather: async (cityIndex: number) => {
    const state = get()
    if (cityIndex < 0 || cityIndex >= state.savedCities.length) return
    const city = state.savedCities[cityIndex]
    const key = cityWeatherKey(city.latitude, city.longitude)

    set({
      weatherLoadingMap: { ...state.weatherLoadingMap, [key]: true },
      weatherErrorMap: { ...state.weatherErrorMap, [key]: null },
    })

    try {
      const weather = await fetchWeather(city.latitude, city.longitude, city.timezone)
      const current = get()
      set({
        weatherMap: { ...current.weatherMap, [key]: weather },
        weatherLoadingMap: { ...current.weatherLoadingMap, [key]: false },
      })
      // 持久化最近成功结果（set 同步生效，get() 拿到的是并发刷新合并后的最全量 map）
      await getSettingsRepo().update({ weatherCache: get().weatherMap })
    } catch (e) {
      const current = get()
      set({
        weatherLoadingMap: { ...current.weatherLoadingMap, [key]: false },
        weatherErrorMap: {
          ...current.weatherErrorMap,
          [key]: e instanceof Error ? e.message : '获取天气失败',
        },
      })
    }
  },

  refreshAllWeather: async () => {
    const state = get()
    const promises = state.savedCities.map((_, i) => get().refreshCityWeather(i))
    await Promise.allSettled(promises)
  },

  searchCity: async (query: string, language?: string) => {
    if (!query.trim()) {
      set({ searchResults: [], searching: false })
      return
    }
    set({ searching: true })
    try {
      const results = await geocodeCity(query, language)
      set({ searchResults: results, searching: false })
    } catch {
      set({ searchResults: [], searching: false })
    }
  },

  clearSearchResults: () => {
    set({ searchResults: [] })
  },
}))
