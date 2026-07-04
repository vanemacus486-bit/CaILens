/**
 * # DrawerWeatherContent — DayDrawer 天气内容
 *
 * 从旧 DayWeatherDrawer 的内容区抽出，city 切换 + 今天实时/非今天预报分支。
 */

import { useEffect, useState, useCallback } from 'react'
import { Thermometer, Droplets, Wind, ChevronUp, ChevronDown } from 'lucide-react'
import { useLocationStore } from '@/stores/locationStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { fireAndForget } from '@/lib/fireAndForget'
import { wmoCodeToLabelZh, wmoCodeToLabelEn, cityWeatherKey } from '@/domain/location'
import { fetchDailyWeather } from '@/data/locationService'
import type { DailyWeatherData } from '@/domain/location'
import { useT } from '@/i18n/useT'
import { formatISODate } from '@/domain/time'
import { WeatherIcon } from '@/components/ui/WeatherIcon'
import { cn } from '@/lib/utils'

interface DrawerWeatherContentProps {
  selectedDateMs: number
}

/** 「更新于」时间标签：当天只显示时分，跨天带上月日 */
function formatUpdatedAt(ts: number, language: string): string {
  const d = new Date(ts)
  const time = d.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: language !== 'zh',
  })
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return time
  return language === 'zh'
    ? `${d.getMonth() + 1}月${d.getDate()}日 ${time}`
    : `${d.getMonth() + 1}/${d.getDate()} ${time}`
}

export function DrawerWeatherContent({ selectedDateMs }: DrawerWeatherContentProps) {
  const locationSettings = useLocationStore((s) => s.locationSettings)
  const savedCities = useLocationStore((s) => s.savedCities)
  const activeCityIndex = useLocationStore((s) => s.activeCityIndex)
  const weatherMap = useLocationStore((s) => s.weatherMap)
  const weatherLoadingMap = useLocationStore((s) => s.weatherLoadingMap)
  const weatherErrorMap = useLocationStore((s) => s.weatherErrorMap)
  const setActiveCity = useLocationStore((s) => s.setActiveCity)
  const refreshCityWeather = useLocationStore((s) => s.refreshCityWeather)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = useT()
  const tl = (zh: string, en: string) => language === 'zh' ? zh : en

  const [dailyData, setDailyData] = useState<DailyWeatherData | null>(null)
  const [dailyLoading, setDailyLoading] = useState(false)
  const [dailyError, setDailyError] = useState<string | null>(null)

  const selectedDate = new Date(selectedDateMs)
  const dateStr = formatISODate(selectedDate)
  const isTodaySelected = dateStr === formatISODate(new Date())

  const activeCity = savedCities[activeCityIndex]
  const activeKey = activeCity ? cityWeatherKey(activeCity.latitude, activeCity.longitude) : ''
  const weather = weatherMap[activeKey] ?? null
  const weatherLoading = weatherLoadingMap[activeKey] ?? false
  const weatherError = weatherErrorMap[activeKey] ?? null

  const loadDailyWeather = useCallback(() => {
    if (!locationSettings || isTodaySelected) return
    setDailyLoading(true)
    setDailyError(null)
    fireAndForget(
      (async () => {
        try {
          const data = await fetchDailyWeather(
            locationSettings.latitude,
            locationSettings.longitude,
            locationSettings.timezone,
            new Date(selectedDateMs),
          )
          setDailyData(data)
        } catch (e) {
          setDailyError(e instanceof Error ? e.message : (language === 'zh' ? '获取每日预报失败' : 'Failed to load forecast'))
        } finally {
          setDailyLoading(false)
        }
      })(),
      'fetch daily weather',
    )
  }, [locationSettings, selectedDateMs, language, isTodaySelected])

  useEffect(() => {
    loadDailyWeather()
  }, [loadDailyWeather])

  useEffect(() => {
    if (isTodaySelected && activeCity) {
      fireAndForget(refreshCityWeather(activeCityIndex), 'refresh weather on drawer open')
    }
  }, [isTodaySelected, activeCityIndex, refreshCityWeather, activeCity])

  const handleSwitchCity = useCallback((index: number) => {
    fireAndForget(setActiveCity(index), 'switch city')
  }, [setActiveCity])

  const weatherLabel = weather
    ? (language === 'zh' ? wmoCodeToLabelZh(weather.weatherCode) : wmoCodeToLabelEn(weather.weatherCode))
    : ''
  const dailyLabel = dailyData
    ? (language === 'zh' ? wmoCodeToLabelZh(dailyData.weatherCode) : wmoCodeToLabelEn(dailyData.weatherCode))
    : ''
  const updatedAtLabel = weather ? formatUpdatedAt(weather.timestamp, language) : ''

  if (!locationSettings) {
    return (
      <div className="px-5 py-8 text-sm text-text-tertiary font-sans text-center">
        {t('settings.locationNoCity')}
      </div>
    )
  }

  return (
    <div className="px-5 pb-5">
      {savedCities.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {savedCities.map((city, i) => (
            <button
              key={cityWeatherKey(city.latitude, city.longitude)}
              onClick={() => handleSwitchCity(i)}
              className={cn(
                'text-[10px] font-sans px-2 py-0.5 rounded-full border-none cursor-pointer transition-colors duration-150',
                i === activeCityIndex
                  ? 'bg-accent/15 text-accent font-medium'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-surface-sunken bg-surface-base',
              )}
            >
              {city.cityName}
            </button>
          ))}
        </div>
      )}

      <div className="text-[11px] font-sans font-medium text-text-secondary mb-1.5 tracking-wide">
        {tl('天气', 'Weather')}
      </div>

      {isTodaySelected ? (
        // ── 今天：实时当前天气 ──
        weatherLoading && !weather ? (
          <div className="flex items-center gap-2 text-sm text-text-tertiary font-sans py-2 justify-center">
            <div className="w-3 h-3 rounded-full border border-text-tertiary border-t-transparent animate-spin" />
            {t('common.loading')}
          </div>
        ) : weatherError && !weather ? (
          <div className="text-sm text-danger font-sans text-center py-2">
            {weatherError}
            <button
              onClick={() => fireAndForget(refreshCityWeather(activeCityIndex), 'refresh weather retry')}
              className="block mx-auto mt-1.5 underline text-text-tertiary hover:text-text-primary cursor-pointer border-none bg-transparent"
            >
              {t('settings.locationRetry')}
            </button>
          </div>
        ) : weather ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <WeatherIcon code={weather.weatherCode} size={36} />
              <div>
                <div className="text-xl font-sans font-medium text-text-primary tracking-tight">
                  {Math.round(weather.temperature)}°C
                </div>
                <div className="text-xs text-text-tertiary font-sans">{weatherLabel}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-sans text-text-secondary">
              <div className="flex items-center gap-1.5">
                <Thermometer size={12} className="text-text-tertiary" />
                <span>{Math.round(weather.feelsLike)}°C</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets size={12} className="text-info" />
                <span>{weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind size={12} className="text-text-tertiary" />
                <span>{Math.round(weather.windSpeed)}</span>
              </div>
            </div>
            {/* 数据新鲜度：正常显示更新时间；刷新失败但有缓存时提示 + 可重试 */}
            <div className="mt-2 flex items-center gap-2 text-[10px] font-sans text-text-quaternary">
              <span>
                {weatherError
                  ? tl(`刷新失败 · 显示 ${updatedAtLabel} 的数据`, `Refresh failed · data from ${updatedAtLabel}`)
                  : tl(`更新于 ${updatedAtLabel}`, `Updated ${updatedAtLabel}`)}
              </span>
              {weatherError && (
                <button
                  onClick={() => fireAndForget(refreshCityWeather(activeCityIndex), 'refresh weather retry')}
                  className="underline text-text-tertiary hover:text-text-primary cursor-pointer border-none bg-transparent p-0"
                >
                  {t('settings.locationRetry')}
                </button>
              )}
            </div>
          </>
        ) : null
      ) : (
        // ── 非今天：该日预报 ──
        dailyLoading && !dailyData ? (
          <div className="flex items-center gap-2 text-sm text-text-tertiary font-sans py-4 justify-center">
            <div className="w-3 h-3 rounded-full border border-text-tertiary border-t-transparent animate-spin" />
            {t('common.loading')}
          </div>
        ) : dailyError && !dailyData ? (
          <div className="text-sm text-danger font-sans text-center py-4">
            {dailyError}
            <button
              onClick={loadDailyWeather}
              className="block mx-auto mt-1.5 underline text-text-tertiary hover:text-text-primary cursor-pointer border-none bg-transparent"
            >
              {t('settings.locationRetry')}
            </button>
          </div>
        ) : dailyData ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WeatherIcon code={dailyData.weatherCode} size={32} />
              <span className="text-sm font-sans text-text-secondary">{dailyLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-sans">
              <span className="flex items-center gap-1 text-text-secondary">
                <ChevronUp size={13} className="text-danger/70" />
                {Math.round(dailyData.temperatureMax)}°
              </span>
              <span className="flex items-center gap-1 text-text-tertiary">
                <ChevronDown size={13} className="text-info/70" />
                {Math.round(dailyData.temperatureMin)}°
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-tertiary font-sans text-center py-4">
            {tl('暂无预报数据', 'No forecast data')}
          </div>
        )
      )}
    </div>
  )
}
