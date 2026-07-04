/**
 * locationService 网络层测试：超时自动重试、HTTP 错误不重试、每日预报会话缓存。
 * mock 全局 fetch；fake timers 推进重试间隔。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWeather, fetchDailyWeather, geocodeCity } from '@/data/locationService'

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

function okCurrentWeatherResponse() {
  return {
    ok: true,
    json: async () => ({
      current: {
        time: '2026-07-04T15:00',
        temperature_2m: 25,
        relative_humidity_2m: 60,
        apparent_temperature: 26,
        weather_code: 1,
        wind_speed_10m: 10,
      },
    }),
  }
}

describe('locationService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('fetchWeather 首次超时后自动重试成功', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(abortError())
      .mockResolvedValueOnce(okCurrentWeatherResponse())
    vi.stubGlobal('fetch', fetchMock)

    const promise = fetchWeather(46.6, 131.1, 'Asia/Shanghai')
    await vi.advanceTimersByTimeAsync(500) // 越过 400ms 重试间隔
    const weather = await promise

    expect(weather.temperature).toBe(25)
    expect(weather.weatherCode).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fetchWeather 两次都超时 → 抛「网络请求超时」', async () => {
    const fetchMock = vi.fn().mockRejectedValue(abortError())
    vi.stubGlobal('fetch', fetchMock)

    const promise = fetchWeather(46.6, 131.1, 'Asia/Shanghai')
    const assertion = expect(promise).rejects.toThrow(/网络请求超时/)
    await vi.advanceTimersByTimeAsync(500)
    await assertion

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fetchWeather HTTP 错误是明确应答，不重试', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchWeather(46.6, 131.1, 'Asia/Shanghai')).rejects.toThrow('500')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fetchDailyWeather 同城同日会话内只请求一次（缓存命中）', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        daily: {
          time: ['2026-07-03'],
          temperature_2m_max: [30],
          temperature_2m_min: [20],
          weather_code: [2],
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const date = new Date(2026, 6, 3)
    const first = await fetchDailyWeather(35.68, 139.69, 'Asia/Tokyo', date)
    const second = await fetchDailyWeather(35.68, 139.69, 'Asia/Tokyo', date)

    expect(first).not.toBeNull()
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('geocodeCity 超时不重试（交互式搜索快速失败）', async () => {
    const fetchMock = vi.fn().mockRejectedValue(abortError())
    vi.stubGlobal('fetch', fetchMock)

    await expect(geocodeCity('Tokyo')).rejects.toThrow(/网络请求超时/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
