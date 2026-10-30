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
 * 视觉风格只保留两套：
 * - graphite 石墨：默认暖纸底，日常长时间阅读
 * - tide 浸染：全画布深青，沉浸式
 * 旧值 nocturne / carbon / indigo 已废弃，读取时由 settingsStore 回退到 graphite。
 */
export type VisualStyle = 'graphite' | 'tide'

/** 已废弃的风格值 → 新值映射，供迁移使用 */
export const DEPRECATED_VISUAL_STYLES: Record<string, VisualStyle> = {
  nocturne: 'graphite',
  carbon: 'graphite',
  indigo: 'tide',
}
export type FontScale = 'sm' | 'default' | 'lg' | 'xl'
export type DefaultView = 'week' | 'month'

// ── AI 设置 ──────────────────────────────────────────────

export type AiProvider = 'openai' | 'anthropic' | 'google' | 'custom'

/** 上下文脱敏级别：full=完整标题；category-only=只发分类+时长；summary=仅分类统计摘要 */
export type AiPrivacy = 'full' | 'category-only' | 'summary'

/** 单个 AI 提供商配置 */
export interface AiProviderConfig {
  provider: AiProvider
  /** 用户自定义标签（如「主力模型」「本地测试」） */
  label: string
  apiKey: string
  /** 自定义 API 端点；缺省使用提供商官方地址 */
  baseUrl?: string
  /** 模型名，如 gpt-4o、claude-sonnet-4-20250514 */
  model?: string
}

export interface AiSettings {
  enabled: boolean
  /** 用户自定义的 AI 系统提示词；为空时使用默认提示词 */
  systemPrompt?: string
  providers: AiProviderConfig[]
  /** 上下文脱敏级别：full（默认）/ category-only / summary */
  privacy?: AiPrivacy
  /** 当月累计 token 用量（本地估算，按自然月；月份变化时自动归零） */
  monthlyTokens?: number
  /** 当前用量所属月份 'YYYY-MM' */
  usageMonth?: string
  /** 月度预算（token 数）；缺省/0 表示不限制 */
  monthlyBudget?: number
}

export interface AppSettings {
  /** AI 功能设置 */
  ai?: AiSettings
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
  updatedAt?: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  language: 'zh',
  theme: 'light',
  visualStyle: 'graphite',
  fontScale: 'default',
  defaultView: 'week',
  hygieneActivities: [...DEFAULT_HYGIENE_ACTIVITIES],
}

export function resolveTheme(theme: AppTheme | undefined, systemPrefersDark: boolean): 'light' | 'dark' {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return systemPrefersDark ? 'dark' : 'light'
}

export const FONT_SCALE_PX: Record<FontScale, number> = { sm: 15, default: 16, lg: 17.5, xl: 19 }
