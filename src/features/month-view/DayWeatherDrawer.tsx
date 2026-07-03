/**
 * # DayWeatherDrawer — 月视图右侧天气面板
 *
 * 选中某天时，在周/月视图内容区右侧挤出一块悬浮卡片显示天气信息，
 * 与主视图共享同一行布局（非全屏遮罩），不遮挡顶栏。
 */

import { useEffect, useState, useCallback } from 'react'
import { X, Thermometer, Droplets, Wind, Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning, ChevronUp, ChevronDown } from 'lucide-react'
import { useLocationStore } from '@/stores/locationStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { fireAndForget } from '@/lib/fireAndForget'
import { wmoCodeToLabelZh, wmoCodeToLabelEn } from '@/domain/location'
import { fetchDailyWeather } from '@/data/locationService'
import type { DailyWeatherData } from '@/domain/location'
import { useT } from '@/i18n/useT'
import { formatISODate } from '@/domain/time'

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

interface DayWeatherDrawerProps {
  /** 选中日期的 UTC 毫秒时间戳 */
  selectedDateMs: number
  onClose: () => void
}

export function DayWeatherDrawer({ selectedDateMs, onClose }: DayWeatherDrawerProps) {
  const locationSettings = useLocationStore((s) => s.locationSettings)
  const weather = useLocationStore((s) => s.weather)
  const weatherLoading = useLocationStore((s) => s.weatherLoading)
  const weatherError = useLocationStore((s) => s.weatherError)
  const refreshWeather = useLocationStore((s) => s.refreshWeather)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = useT()
  const tl = (zh: string, en: string) => language === 'zh' ? zh : en

  const [dailyData, setDailyData] = useState<DailyWeatherData | null>(null)
  const [dailyLoading, setDailyLoading] = useState(false)
  const [dailyError, setDailyError] = useState<string | null>(null)

  const selectedDate = new Date(selectedDateMs)
  const dateStr = formatISODate(selectedDate)
  const isTodaySelected = dateStr === formatISODate(new Date())

  // 加载每日预报（今天已走实时天气，跳过）
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

  // 当天自动刷新当前天气
  useEffect(() => {
    if (isTodaySelected) {
      fireAndForget(refreshWeather(), 'refresh weather on drawer open')
    }
  }, [isTodaySelected, refreshWeather])

  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
  const weekdayEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dow = language === 'zh'
    ? `周${weekdayNames[selectedDate.getDay()]}`
    : weekdayEn[selectedDate.getDay()]

  // 天气标签
  const currentLabel = weather
    ? (language === 'zh' ? wmoCodeToLabelZh(weather.weatherCode) : wmoCodeToLabelEn(weather.weatherCode))
    : ''

  const dailyLabel = dailyData
    ? (language === 'zh' ? wmoCodeToLabelZh(dailyData.weatherCode) : wmoCodeToLabelEn(dailyData.weatherCode))
    : ''

  return (
    <div className="relative w-[320px] flex-shrink-0 my-3 mr-3 bg-surface-raised border border-border-subtle rounded-2xl shadow-lg overflow-hidden animate-slide-in-from-right">
      <div className="h-full overflow-y-auto">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="font-serif text-lg font-medium text-text-primary tracking-tight">
              {selectedDate.getDate()}
              <span className="text-sm font-sans text-text-tertiary ml-1.5 font-normal">
                {`${selectedDate.getMonth() + 1}月`}
              </span>
            </h2>
            <p className="text-xs text-text-tertiary font-sans mt-0.5">{dow}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none"
            aria-label={t('common.close')}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {!locationSettings ? (
          <div className="px-5 py-8 text-sm text-text-tertiary font-sans text-center">
            {t('settings.locationNoCity')}
          </div>
        ) : (
          <div className="px-5 pb-5">
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
                    onClick={() => fireAndForget(refreshWeather(), 'refresh weather retry')}
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
                      <div className="text-xs text-text-tertiary font-sans">{currentLabel}</div>
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
        )}
      </div>

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-from-right {
          animation: slideInFromRight 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
      `}</style>
    </div>
  )
}
