/**
 * # useT — 翻译 Hook
 *
 * 用法：
 *   const t = useT()
 *   t('nav.settings')             // → "设置" 或 "Settings" 等
 *   t('common.inDays', 5)         // → "5 天后" 或 "in 5 days" 等（替换 {0}）
 *
 * 也可直接调用 translate(key, language, ...args) 在非 React 上下文中使用。
 */

import { useAppSettingsStore } from '@/stores/settingsStore'
import { translations, type TranslationKey } from './translations'
import type { AppLanguage } from './types'

/**
 * 查找翻译（纯函数，无 hook）
 */
export function translate(key: TranslationKey, language: AppLanguage, ...args: (string | number)[]): string {
  const entry = translations[key]
  if (!entry) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation key: "${key}"`)
    }
    return key
  }
  let value = entry[language] ?? entry['en'] ?? key
  // 替换 {0}, {1} 等
  if (args.length > 0) {
    value = value.replace(/\{(\d+)\}/g, (_, idx) => {
      const arg = args[Number(idx)]
      return arg != null ? String(arg) : `{${idx}}`
    })
  }
  return value
}

/**
 * React Hook：获取当前语言的翻译函数 t(key, ...args)
 *
 * 本 hook 直接读取 settingsStore 中的 language，
 * 因此只能在组件内使用。
 * 
 * 对于非组件代码（如 domain/），使用 translate() 纯函数并传入 language 参数。
 */
export function useT() {
  const language = useAppSettingsStore((s) => s.settings.language)
  return (key: TranslationKey, ...args: (string | number)[]) =>
    translate(key, language, ...args)
}
