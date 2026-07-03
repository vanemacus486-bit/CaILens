/**
 * # SettingsLocation — 设置：位置、时区与天气
 *
 * 允许用户搜索并选择城市，自动获取时区与当前天气。
 * 使用 Open-Meteo API（免费，无需 API Key）。
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { MapPin, RefreshCw, Thermometer, Droplets, Wind, Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning, Search, Check } from 'lucide-react'
import { useLocationStore } from '@/stores/locationStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { detectBrowserTimezone, wmoCodeToLabelZh, wmoCodeToLabelEn } from '@/domain/location'
import type { GeocodingResult } from '@/domain/location'
import { fireAndForget } from '@/lib/fireAndForget'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/utils'

function WeatherIcon({ code, size = 24 }: { code: number; size?: number }) {
  if (code === 0) return <Sun size={size} className="text-accent" />
  if (code <= 2) return <Sun size={size} className="text-text-secondary" />
  if (code === 3) return <Cloud size={size} className="text-text-tertiary" />
  if (code >= 45 && code <= 48) return <CloudFog size={size} className="text-text-tertiary" />
  if (code >= 51 && code <= 67) return <CloudRain size={size} className="text-info" />
  if (code >= 71 && code <= 77) return <CloudSnow size={size} className="text-info" />
  if (code >= 80 && code <= 82) return <CloudRain size={size} className="text-info" />
  if (code >= 85 && code <= 86) return <CloudSnow size={size} className="text-info" />
  if (code >= 95 && code <= 99) return <CloudLightning size={size} className="text-danger" />
  return <Cloud size={size} className="text-text-tertiary" />
}

export function SettingsLocation() {
  const locationSettings = useLocationStore((s) => s.locationSettings)
  const weather = useLocationStore((s) => s.weather)
  const weatherLoading = useLocationStore((s) => s.weatherLoading)
  const weatherError = useLocationStore((s) => s.weatherError)
  const searchResults = useLocationStore((s) => s.searchResults)
  const searching = useLocationStore((s) => s.searching)
  const loadLocation = useLocationStore((s) => s.loadLocation)
  const setCity = useLocationStore((s) => s.setCity)
  const searchCity = useLocationStore((s) => s.searchCity)
  const refreshWeather = useLocationStore((s) => s.refreshWeather)

  const language = useAppSettingsStore((s) => s.settings.language)
  const settingsLoaded = useAppSettingsStore((s) => s.isLoaded)
  const t = useT()

  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 加载已保存的位置
  useEffect(() => {
    if (settingsLoaded) {
      fireAndForget(loadLocation(), 'load location')
    }
  }, [loadLocation, settingsLoaded])

  // 搜索防抖
  const handleInput = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fireAndForget(searchCity(value), 'search city')
      }, 300)
    },
    [searchCity],
  )

  // 选中城市
  const handleSelect = useCallback(
    (result: GeocodingResult) => {
      fireAndForget(setCity(result), 'set city')
      setQuery(result.name)
      setFocused(false)
    },
    [setCity],
  )

  // 刷新天气
  const handleRefresh = useCallback(() => {
    fireAndForget(refreshWeather(), 'refresh weather')
  }, [refreshWeather])

  // 关闭候选项（点击外部）
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const browserTz = detectBrowserTimezone()
  const displayTimezone = locationSettings?.timezone ?? browserTz

  // 天气标签
  const weatherLabel = weather
    ? language === 'zh'
      ? wmoCodeToLabelZh(weather.weatherCode)
      : wmoCodeToLabelEn(weather.weatherCode)
    : ''

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          {t('settings.location')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          {t('settings.locationDesc')}
        </p>
      </div>

      {/* 城市搜索 */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <label className="text-sm font-sans font-medium text-text-primary mb-2 block">
            {t('settings.locationCity')}
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder={t('settings.locationSearchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-sm font-sans text-text-primary bg-surface-base border border-border-subtle rounded-lg placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150"
            />
            {/* 候选项下拉 */}
            {focused && (searching || searchResults.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-raised border border-border-subtle rounded-lg shadow-lg z-10 max-h-[240px] overflow-y-auto">
                {searching ? (
                  <div className="px-4 py-3 text-sm text-text-tertiary font-sans text-center">
                    {t('common.loading')}
                  </div>
                ) : (
                  searchResults.map((r, i) => (
                    <button
                      key={`${r.latitude}-${r.longitude}-${i}`}
                      onClick={() => handleSelect(r)}
                      className="w-full text-left px-4 py-2.5 text-sm font-sans text-text-primary hover:bg-surface-sunken transition-colors duration-100 cursor-pointer border-none flex items-center gap-2"
                    >
                      <MapPin size={14} className="text-text-tertiary flex-shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{r.name}</span>
                      <span className="text-xs text-text-tertiary flex-shrink-0">{r.country}</span>
                      {locationSettings?.latitude === r.latitude && locationSettings?.longitude === r.longitude && (
                        <Check size={14} className="text-success flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 当前时区显示 */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border-subtle">
          <span className="text-sm font-sans font-medium text-text-primary">
            {t('settings.locationTimezone')}
          </span>
          <span className="text-sm font-sans text-text-secondary font-mono">{displayTimezone}</span>
        </div>
      </div>

      {/* 天气展示 */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-sans font-medium text-text-primary">
            {t('settings.locationWeather')}
          </h2>
          <button
            onClick={handleRefresh}
            disabled={weatherLoading || !locationSettings}
            className="flex items-center gap-1 text-xs font-sans text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer border-none bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={13}
              className={cn(weatherLoading && 'animate-spin')}
            />
            {t('settings.locationRefresh')}
          </button>
        </div>

        {!locationSettings ? (
          <div className="px-5 pb-5 text-sm text-text-tertiary font-sans">
            {t('settings.locationNoCity')}
          </div>
        ) : weatherLoading && !weather ? (
          <div className="px-5 pb-5 flex items-center gap-2 text-sm text-text-tertiary font-sans">
            <RefreshCw size={14} className="animate-spin" />
            {t('common.loading')}
          </div>
        ) : weatherError && !weather ? (
          <div className="px-5 pb-5 text-sm text-danger font-sans">
            {weatherError}
            <button
              onClick={handleRefresh}
              className="ml-2 underline text-text-tertiary hover:text-text-primary cursor-pointer border-none bg-transparent"
            >
              {t('settings.locationRetry')}
            </button>
          </div>
        ) : weather ? (
          <div className="px-5 pb-5">
            <div className="flex items-center gap-4 mb-4">
              <WeatherIcon code={weather.weatherCode} size={40} />
              <div>
                <div className="text-2xl font-sans font-medium text-text-primary tracking-tight">
                  {Math.round(weather.temperature)}°C
                </div>
                <div className="text-xs text-text-tertiary font-sans mt-0.5">
                  {weatherLabel}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-xs font-sans text-text-secondary">
                <Thermometer size={13} className="text-text-tertiary" />
                {t('settings.locationFeelsLike')} {Math.round(weather.feelsLike)}°C
              </div>
              <div className="flex items-center gap-2 text-xs font-sans text-text-secondary">
                <Droplets size={13} className="text-info" />
                {weather.humidity}%
              </div>
              <div className="flex items-center gap-2 text-xs font-sans text-text-secondary">
                <Wind size={13} className="text-text-tertiary" />
                {Math.round(weather.windSpeed)} km/h
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 text-sm text-text-tertiary font-sans">
            {t('settings.locationNoWeather')}
          </div>
        )}
      </div>
    </div>
  )
}
