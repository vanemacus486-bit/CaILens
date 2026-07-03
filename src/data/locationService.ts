/**
 * # 位置与天气数据服务
 *
 * 通过 Open-Meteo API 获取城市坐标和天气数据。
 * Open-Meteo 是开源免费 API，无需 API Key。
 *
 * API 文档：https://open-meteo.com/en/docs
 */

import type { GeocodingResult, WeatherData, DailyWeatherData } from '@/domain/location'

const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1/search'
const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast'

/** 单次请求超时上限：国内访问 Open-Meteo 域名有时会挂起很久，需要快速失败而不是无限等待 */
const FETCH_TIMEOUT_MS = 10_000

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('网络请求超时，请检查网络连接后重试', { cause: e })
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

/** 搜索城市名称，返回候选项列表 */
export async function geocodeCity(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return []

  const url = new URL(GEOCODING_BASE)
  url.searchParams.set('name', query.trim())
  url.searchParams.set('count', '5')
  url.searchParams.set('language', 'zh')
  url.searchParams.set('format', 'json')

  const res = await fetchWithTimeout(url.toString())
  if (!res.ok) throw new Error(`Geocoding API 返回错误: ${res.status}`)

  const data: { results?: Array<{ name: string; country: string; latitude: number; longitude: number; timezone: string; country_code: string }> } = await res.json()

  if (!data.results || data.results.length === 0) return []

  return data.results.map((r) => ({
    name: r.name,
    country: r.country ?? '',
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone ?? 'UTC',
    countryCode: r.country_code ?? '',
  }))
}

/** 获取指定坐标的当前天气 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  timezone: string,
): Promise<WeatherData> {
  const url = new URL(WEATHER_BASE)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m')
  url.searchParams.set('timezone', timezone)
  url.searchParams.set('forecast_days', '1')

  const res = await fetchWithTimeout(url.toString())
  if (!res.ok) throw new Error(`Weather API 返回错误: ${res.status}`)

  const data: {
    current: {
      time: string
      temperature_2m: number
      relative_humidity_2m: number
      apparent_temperature: number
      weather_code: number
      wind_speed_10m: number
    }
  } = await res.json()

  return {
    weatherCode: data.current.weather_code,
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    timestamp: new Date(data.current.time).getTime(),
  }
}

/** 获取指定坐标某一天的每日预报（最高/最低温 + 天气代码） */
export async function fetchDailyWeather(
  latitude: number,
  longitude: number,
  timezone: string,
  targetDate: Date,
): Promise<DailyWeatherData | null> {
  const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`

  const url = new URL(WEATHER_BASE)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code')
  url.searchParams.set('timezone', timezone)
  // start_date/end_date 与 past_days/forecast_days 互斥，同时传会被 API 拒绝（400）
  url.searchParams.set('start_date', targetDateStr)
  url.searchParams.set('end_date', targetDateStr)

  const res = await fetchWithTimeout(url.toString())
  if (!res.ok) throw new Error(`Daily weather API 返回错误: ${res.status}`)

  const data: {
    daily?: {
      time: string[]
      temperature_2m_max: number[]
      temperature_2m_min: number[]
      weather_code: number[]
    }
  } = await res.json()

  if (!data.daily || data.daily.time.length === 0) return null

  return {
    weatherCode: data.daily.weather_code[0],
    temperatureMax: data.daily.temperature_2m_max[0],
    temperatureMin: data.daily.temperature_2m_min[0],
    date: new Date(data.daily.time[0]).getTime(),
  }
}
