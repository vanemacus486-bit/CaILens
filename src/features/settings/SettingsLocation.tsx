/**
 * # SettingsLocation — 设置：位置、时区与多城市天气管理
 *
 * 允许用户搜索并添加多个城市，管理城市列表，查看各城市天气。
 * 使用 Open-Meteo API（免费，无需 API Key）。
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { MapPin, RefreshCw, Thermometer, Droplets, Wind, Search, Check, Trash2 } from 'lucide-react'
import { useLocationStore } from '@/stores/locationStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { detectBrowserTimezone, wmoCodeToLabelZh, wmoCodeToLabelEn, cityWeatherKey } from '@/domain/location'
import type { GeocodingResult } from '@/domain/location'
import { fireAndForget } from '@/lib/fireAndForget'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/utils'
import { WeatherIcon } from '@/components/ui/WeatherIcon'

export function SettingsLocation() {
  const locationSettings = useLocationStore((s) => s.locationSettings)
  const savedCities = useLocationStore((s) => s.savedCities)
  const activeCityIndex = useLocationStore((s) => s.activeCityIndex)
  const weatherMap = useLocationStore((s) => s.weatherMap)
  const weatherLoadingMap = useLocationStore((s) => s.weatherLoadingMap)
  const weatherErrorMap = useLocationStore((s) => s.weatherErrorMap)
  const searchResults = useLocationStore((s) => s.searchResults)
  const searching = useLocationStore((s) => s.searching)
  const loadLocation = useLocationStore((s) => s.loadLocation)
  const addCity = useLocationStore((s) => s.addCity)
  const removeCity = useLocationStore((s) => s.removeCity)
  const setActiveCity = useLocationStore((s) => s.setActiveCity)
  const refreshCityWeather = useLocationStore((s) => s.refreshCityWeather)
  const refreshAllWeather = useLocationStore((s) => s.refreshAllWeather)
  const searchCity = useLocationStore((s) => s.searchCity)
  const clearSearchResults = useLocationStore((s) => s.clearSearchResults)

  const language = useAppSettingsStore((s) => s.settings.language)
  const settingsLoaded = useAppSettingsStore((s) => s.isLoaded)
  const t = useT()

  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 加载已保存的城市
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
        fireAndForget(searchCity(value, language), 'search city')
      }, 300)
    },
    [searchCity, language],
  )

  // 添加城市
  const handleSelect = useCallback(
    (result: GeocodingResult) => {
      fireAndForget(addCity(result), 'add city')
      setQuery(result.name)
      setFocused(false)
    },
    [addCity],
  )

  // 删除城市
  const handleRemove = useCallback(
    (index: number) => {
      fireAndForget(removeCity(index), 'remove city')
    },
    [removeCity],
  )

  // 设为活跃
  const handleSetActive = useCallback(
    (index: number) => {
      fireAndForget(setActiveCity(index), 'set active city')
    },
    [setActiveCity],
  )

  // 刷新单个城市天气
  const handleRefreshCity = useCallback(
    (index: number) => {
      fireAndForget(refreshCityWeather(index), 'refresh city weather')
    },
    [refreshCityWeather],
  )

  // 刷新全部
  const handleRefreshAll = useCallback(() => {
    fireAndForget(refreshAllWeather(), 'refresh all weather')
  }, [refreshAllWeather])

  // 关闭候选项（点击外部）
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setFocused(false)
        clearSearchResults()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clearSearchResults])

  const browserTz = detectBrowserTimezone()
  const displayTimezone = locationSettings?.timezone ?? browserTz

  // 是否有任意城市正在加载天气
  const anyLoading = Object.values(weatherLoadingMap).some((v) => v)

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
      <div className="rounded-xl bg-surface-raised border border-border-subtle">
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
                  searchResults.map((r, i) => {
                    const alreadyAdded = savedCities.some(
                      (c) => c.latitude === r.latitude && c.longitude === r.longitude,
                    )
                    return (
                      <button
                        key={`${r.latitude}-${r.longitude}-${i}`}
                        onClick={() => !alreadyAdded && handleSelect(r)}
                        disabled={alreadyAdded}
                        className={cn(
                          'w-full text-left px-4 py-2.5 text-sm font-sans transition-colors duration-100 cursor-pointer border-none flex items-center gap-2',
                          alreadyAdded
                            ? 'text-text-quaternary cursor-not-allowed'
                            : 'text-text-primary hover:bg-surface-sunken',
                        )}
                      >
                        <MapPin size={14} className="text-text-tertiary flex-shrink-0" />
                        <span className="flex-1 min-w-0 truncate">{r.name}</span>
                        <span className="text-xs text-text-tertiary flex-shrink-0">{r.country}</span>
                        {alreadyAdded ? (
                          <span className="text-xs text-text-quaternary flex-shrink-0">{t('settings.locationAddCity')}</span>
                        ) : (
                          <Check size={14} className="text-success flex-shrink-0" />
                        )}
                      </button>
                    )
                  })
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

      {/* 城市列表 */}
      {savedCities.length > 0 && (
        <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-border-subtle">
            <h2 className="text-sm font-sans font-medium text-text-primary">
              {t('settings.locationWeather')}
            </h2>
            <button
              onClick={handleRefreshAll}
              disabled={anyLoading || savedCities.length === 0}
              className="flex items-center gap-1 text-xs font-sans text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer border-none bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} className={cn(anyLoading && 'animate-spin')} />
              {t('settings.locationRefresh')}
            </button>
          </div>

          <div className="divide-y divide-border-subtle">
            {savedCities.map((city, index) => {
              const key = cityWeatherKey(city.latitude, city.longitude)
              const weather = weatherMap[key]
              const loading = weatherLoadingMap[key]
              const error = weatherErrorMap[key]
              const isActive = index === activeCityIndex
              const weatherLabel = weather
                ? (language === 'zh' ? wmoCodeToLabelZh(weather.weatherCode) : wmoCodeToLabelEn(weather.weatherCode))
                : ''

              return (
                <div
                  key={key}
                  className={cn(
                    'px-5 py-3 flex items-center gap-3',
                    isActive && 'bg-accent/5',
                  )}
                >
                  {/* 活跃标记 */}
                  <button
                    onClick={() => handleSetActive(index)}
                    disabled={isActive}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-colors duration-150 flex-shrink-0',
                      isActive
                        ? 'bg-accent/15 text-accent cursor-default'
                        : 'text-text-quaternary hover:text-text-primary hover:bg-surface-sunken',
                    )}
                    title={isActive ? t('settings.locationCurrent') : t('settings.locationSetActive')}
                  >
                    <MapPin size={14} strokeWidth={isActive ? 3 : 1.75} />
                  </button>

                  {/* 城市信息 + 天气 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm font-sans font-medium truncate',
                        isActive ? 'text-text-primary' : 'text-text-secondary',
                      )}>
                        {city.cityName}
                      </span>
                      {city.country && (
                        <span className="text-xs text-text-quaternary font-sans">{city.country}</span>
                      )}
                      {isActive && (
                        <span className="text-[10px] font-sans font-medium text-accent px-1.5 py-0.5 rounded-full bg-accent/10">
                          {t('settings.locationCurrent')}
                        </span>
                      )}
                    </div>
                    {/* 天气信息 */}
                    {loading ? (
                      <div className="flex items-center gap-1.5 text-xs text-text-tertiary font-sans mt-1">
                        <RefreshCw size={11} className="animate-spin" />
                        {t('common.loading')}
                      </div>
                    ) : error ? (
                      <div className="flex items-center gap-1.5 text-xs text-danger font-sans mt-1">
                        <span className="truncate">{error}</span>
                      </div>
                    ) : weather ? (
                      <div className="flex items-center gap-2 mt-1">
                        <WeatherIcon code={weather.weatherCode} size={16} />
                        <span className="text-sm font-sans font-medium text-text-primary">
                          {Math.round(weather.temperature)}°C
                        </span>
                        <span className="text-xs text-text-tertiary font-sans">{weatherLabel}</span>
                        <span className="text-[10px] text-text-quaternary font-sans">
                          {t('settings.locationFeelsLike')} {Math.round(weather.feelsLike)}°
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-text-quaternary font-sans mt-1 block">
                        {t('settings.locationNoWeather')}
                      </span>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleRefreshCity(index)}
                      disabled={loading}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                      title={t('settings.locationRefresh')}
                    >
                      <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
                    </button>
                    {savedCities.length > 1 && (
                      <button
                        onClick={() => handleRemove(index)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-danger hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
                        title={t('settings.locationRemoveCity')}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 当前活跃城市详细天气 */}
      {locationSettings && savedCities[activeCityIndex] && (() => {
        const city = savedCities[activeCityIndex]
        const key = cityWeatherKey(city.latitude, city.longitude)
        const weather = weatherMap[key]
        const loading = weatherLoadingMap[key]
        const error = weatherErrorMap[key]

        if (loading && !weather) {
          return (
            <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden px-5 py-4 flex items-center gap-2 text-sm text-text-tertiary font-sans">
              <RefreshCw size={14} className="animate-spin" />
              {t('common.loading')}
            </div>
          )
        }
        if (error && !weather) {
          return (
            <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden px-5 py-4 text-sm text-danger font-sans">
              {error}
              <button
                onClick={() => handleRefreshCity(activeCityIndex)}
                className="ml-2 underline text-text-tertiary hover:text-text-primary cursor-pointer border-none bg-transparent"
              >
                {t('settings.locationRetry')}
              </button>
            </div>
          )
        }
        if (weather) {
          const weatherLabel = language === 'zh' ? wmoCodeToLabelZh(weather.weatherCode) : wmoCodeToLabelEn(weather.weatherCode)
          return (
            <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
              <div className="px-5 py-4">
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
            </div>
          )
        }
        return null
      })()}
    </div>
  )
}
