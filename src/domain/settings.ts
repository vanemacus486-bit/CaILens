import type { ShortcutAction, ShortcutString } from './shortcuts'
import type { HygieneActivityDef } from './hygieneActivity'
import { DEFAULT_HYGIENE_ACTIVITIES } from './hygieneActivity'
import type { HabitPlan } from './habitPlan'
import type { DayMark } from './dayMark'
import type { LocationSettings, SavedCity, DayLocation, WeatherData } from './location'

export type AppLanguage = 'zh' | 'en' | 'es' | 'ar' | 'fr' | 'ru'
export type AppTheme = 'light' | 'dark' | 'auto'
export type UiFont = 'default' | 'sourcehan' | 'wenkai'
/**
 * 视觉风格只保留石墨一套：暖纸底 + 石墨文字 + 陶土橙强调。
 * 旧值 nocturne / carbon / tide / indigo 全部废弃，读取时由 settingsStore 回退到 graphite。
 */
export type VisualStyle = 'graphite'

/** 已废弃的风格值 → 新值映射，供迁移使用 */
export const DEPRECATED_VISUAL_STYLES: Record<string, VisualStyle> = {
  nocturne: 'graphite',
  carbon: 'graphite',
  tide: 'graphite',
  indigo: 'graphite',
}
export type FontScale = 'sm' | 'default' | 'lg' | 'xl'
export type DefaultView = 'week' | 'month'

export interface AppSettings {
  id: 'default'   // singleton — Dexie primary key is always 'default'
  language: AppLanguage
  theme?: AppTheme
  uiFont?: UiFont
  visualStyle?: VisualStyle
  fontScale?: FontScale
  shortcuts?: Partial<Record<ShortcutAction, ShortcutString>>
  /** 自定义卫生活动（哪些事件计入卫生 + 颜色）；缺省回退 DEFAULT_HYGIENE_ACTIVITIES */
  hygieneActivities?: HygieneActivityDef[]
  /** 习惯调节计划（分阶段增减某些活动时间 + 达标检测）；与 hygieneActivities 同为 settings 内用户自定义列表 */
  habitPlans?: HabitPlan[]
  /** 日期标记（右键迷你月历某天打的标记 + 备注） */
  dayMarks?: DayMark[]
  /** 日期位置标记（右键某天设置所处地点，从该天起生效） */
  dayLocations?: DayLocation[]
  /** 启动时默认显示的视图 */
  defaultView?: DefaultView
  /** 用户位置与时区设置（主城市） — legacy, kept for migration */
  location?: LocationSettings
  /** 所有已保存城市 */
  savedCities?: SavedCity[]
  /** 当前活跃城市索引 */
  activeCityIndex?: number
  /** 各城市最近一次成功获取的天气（key = cityWeatherKey）：启动水合 + 断网时兜底显示 */
  weatherCache?: Record<string, WeatherData>
  /**
   * 插件启用状态覆盖。缺省时回落到插件的 defaultEnabled。
   * 只记录用户显式开关过的插件，避免插件增删后残留大量无意义条目。
   */
  enabledPlugins?: Record<string, boolean>
  /** 启动时自动检查更新；缺省（undefined）视为开启 */
  autoUpdateCheck?: boolean
  /**
   * 回退后固定住的版本号（不带 v）。
   *
   * 设置后不再把这个版本之后的更新当作「可用更新」提示，直到在版本面板解除固定。
   * 只影响提示，不阻止手动检查与安装。
   */
  pinnedVersion?: string
  updatedAt?: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  language: 'zh',
  theme: 'light',
  visualStyle: 'graphite',
  fontScale: 'default',
  defaultView: 'week',
  autoUpdateCheck: true,
  hygieneActivities: [...DEFAULT_HYGIENE_ACTIVITIES],
}

export function resolveTheme(theme: AppTheme | undefined, systemPrefersDark: boolean): 'light' | 'dark' {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return systemPrefersDark ? 'dark' : 'light'
}

export const FONT_SCALE_PX: Record<FontScale, number> = { sm: 15, default: 16, lg: 17.5, xl: 19 }
