/**
 * # WeatherIcon — 根据 WMO 天气代码显示对应图标
 *
 * 纯展示组件，零副作用。
 * 从 SettingsLocation 和 DayWeatherDrawer 提取为共享组件。
 */

import { Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning } from 'lucide-react'

interface WeatherIconProps {
  code: number
  size?: number
}

export function WeatherIcon({ code, size = 24 }: WeatherIconProps) {
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
