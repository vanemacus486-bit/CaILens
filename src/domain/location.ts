/**
 * # 位置与时区、天气领域类型
 *
 * 纯类型 + 纯函数，零副作用。
 */

// ── 日期位置标记 ────────────────────────────────────────────

/**
 * 日期位置标记：某天起所处地点。
 * 语义：「从这天开始，我在这个地点」— 查询某天的位置时取 date ≤ 当天的最新一条。
 * 数据存 AppSettings.dayLocations 数组，与 DayMark 同策略。
 */
export interface DayLocation {
  /** 本地午夜 UTC ms（与 DayMark.date 一致） */
  date: number
  /** 地点名称（如「上海」「家」「办公室」） */
  locationName: string
  /** 可选关联已保存城市索引，可用于后续查询天气等 */
  cityRef?: number
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
}

/**
 * 给定 DayLocation 列表，返回指定日期当天应处的位置。
 * 取 date ≤ dayMs 的最新一条；无匹配返回 null。
 */
export function activeLocationAt(locations: DayLocation[], dayMs: number): DayLocation | null {
  if (locations.length === 0) return null
  let best: DayLocation | null = null
  for (const loc of locations) {
    if (loc.date <= dayMs) {
      if (!best || loc.date > best.date || (loc.date === best.date && loc.createdAt > best.createdAt)) {
        best = loc
      }
    }
  }
  return best
}

/** 用户配置的位置信息 */
export interface LocationSettings {
  /** 城市名称（显示用） */
  cityName: string
  /** IANA 时区名，如 Asia/Shanghai */
  timezone: string
  /** 纬度（用于天气查询） */
  latitude: number
  /** 经度（用于天气查询） */
  longitude: number
  /** 最后更新时间的 UTC 毫秒时间戳 */
  lastUpdated: number
}

/** 用户保存的城市（多城市支持） */
export interface SavedCity {
  /** 城市显示名称 */
  cityName: string
  /** 国家名称 */
  country: string
  /** IANA 时区名 */
  timezone: string
  /** 纬度 */
  latitude: number
  /** 经度 */
  longitude: number
  /** 最后更新时间的 UTC 毫秒时间戳 */
  lastUpdated: number
}

/** 基于经纬度生成 weatherMap 键 */
export function cityWeatherKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

/** 从 GeocodingResult 创建 SavedCity */
export function geocodingToCity(result: GeocodingResult): SavedCity {
  return {
    cityName: result.name,
    country: result.country,
    timezone: result.timezone,
    latitude: result.latitude,
    longitude: result.longitude,
    lastUpdated: Date.now(),
  }
}

/** Open-Meteo 天气 API 返回的当前天气数据（精简） */
export interface WeatherData {
  /** WMO 天气代码 */
  weatherCode: number
  /** 当前温度（摄氏度） */
  temperature: number
  /** 体感温度（摄氏度） */
  feelsLike: number
  /** 相对湿度（%） */
  humidity: number
  /** 风速（km/h） */
  windSpeed: number
  /** 数据获取时刻的 UTC 毫秒时间戳（供「更新于」显示与缓存新鲜度判断） */
  timestamp: number
}

/** Open-Meteo 每日预报数据 */
export interface DailyWeatherData {
  /** WMO 天气代码（白天） */
  weatherCode: number
  /** 最高温度（摄氏度） */
  temperatureMax: number
  /** 最低温度（摄氏度） */
  temperatureMin: number
  /** 日期（UTC 毫秒时间戳，当天 00:00） */
  date: number
}

/** Open-Meteo Geocoding API 的候选结果 */
export interface GeocodingResult {
  name: string
  country: string
  latitude: number
  longitude: number
  timezone: string
  countryCode: string
}

/**
 * WMO 天气代码 → 中文标签映射
 * 参考：https://open-meteo.com/en/docs#weathervariables
 */
export function wmoCodeToLabelZh(code: number): string {
  if (code === 0) return '晴天'
  if (code === 1) return '少云'
  if (code === 2) return '多云'
  if (code === 3) return '阴天'
  if (code >= 45 && code <= 48) return '雾'
  if (code >= 51 && code <= 55) return '毛毛雨'
  if (code >= 56 && code <= 57) return '冻雨'
  if (code >= 61 && code <= 65) return '雨'
  if (code >= 66 && code <= 67) return '冻雨'
  if (code >= 71 && code <= 77) return '雪'
  if (code >= 80 && code <= 82) return '阵雨'
  if (code >= 85 && code <= 86) return '阵雪'
  if (code >= 95 && code <= 99) return '雷暴'
  return '未知'
}

/**
 * WMO 天气代码 → 英文标签映射
 */
export function wmoCodeToLabelEn(code: number): string {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly clear'
  if (code === 2) return 'Cloudy'
  if (code === 3) return 'Overcast'
  if (code >= 45 && code <= 48) return 'Fog'
  if (code >= 51 && code <= 55) return 'Drizzle'
  if (code >= 56 && code <= 57) return 'Freezing drizzle'
  if (code >= 61 && code <= 65) return 'Rain'
  if (code >= 66 && code <= 67) return 'Freezing rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain showers'
  if (code >= 85 && code <= 86) return 'Snow showers'
  if (code >= 95 && code <= 99) return 'Thunderstorm'
  return 'Unknown'
}

/**
 * 获取浏览器当前 IANA 时区（纯函数，不涉及异步）
 */
export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * 格式化时区名 + UTC 偏移，如 "Asia/Shanghai · UTC+8"
 * 纯函数，不涉及异步。
 */
export function formatTimezoneWithOffset(tz: string): string {
  try {
    const offset = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts().find((p) => p.type === 'timeZoneName')?.value ?? ''
    return `${tz} · ${offset}`
  } catch {
    return tz
  }
}
