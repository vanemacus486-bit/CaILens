import { useAppSettingsStore } from '@/stores/settingsStore'
import { SettingsPlugins } from './SettingsPlugins'
import { SettingsHeader } from './ui'

/**
 * 「第三方插件」页。
 *
 * 当前没有运行时加载通道（Tauri CSP 与 Capacitor WebView 都会拦远程加载），
 * 所以这一页必然是空的 —— 但它必须存在：分类结构是「应用将来会有哪几类插件」
 * 的声明，不是当前数据的投影。
 */
export function SettingsThirdPartyPlugins() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const tl = (zh: string, en: string): string => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-7">
      <SettingsHeader
        title={tl('第三方插件', 'Third-party plugins')}
        description={tl('由外部提供、运行时接入的插件', 'Externally provided plugins loaded at runtime')}
      />

      <SettingsPlugins onlyOrigin="third-party" />
    </div>
  )
}
