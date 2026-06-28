/**
 * # i18n 类型定义
 *
 * 支持 6 种语言：中文、英文、西班牙语、阿拉伯语、法语、俄语
 */

export type AppLanguage = 'zh' | 'en' | 'es' | 'ar' | 'fr' | 'ru'

/** 语言显示名（用其自身语言表示） */
export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  zh: '中文',
  en: 'English',
  es: 'Español',
  ar: 'العربية',
  fr: 'Français',
  ru: 'Русский',
}

/** 语言选择器中的分组顺序 */
export const LANGUAGE_ORDER: AppLanguage[] = ['zh', 'en', 'es', 'fr', 'ar', 'ru']

/** 用于 toLocaleString 的 locale 映射 */
export const LANGUAGE_LOCALE: Record<AppLanguage, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  es: 'es-ES',
  ar: 'ar-SA',
  fr: 'fr-FR',
  ru: 'ru-RU',
}
