import { useAppSettingsStore } from '@/stores/settingsStore'
import { SettingsPlugins } from './SettingsPlugins'
import { SettingsCategories } from './SettingsCategories'
import { SettingsHeader } from './ui'

/**
 * 「核心插件」页：随应用编译的内置模块开关 + 内置业务配置。
 *
 * 两层内容，顺序不能反：
 * 1. **插件开关** —— 可关闭的模块（review / plan / stats 等），关掉只隐藏入口与路由。
 * 2. **内置配置** —— 分类分配。它不是插件（不可关闭），但它是「核心」这一层
 *    唯一的业务配置项，所以收在这一页里，不再单占一个侧栏项。
 */
export function SettingsCorePlugins() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const tl = (zh: string, en: string): string => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-7">
      <SettingsHeader
        title={tl('核心插件', 'Core plugins')}
        description={tl('内置模块的开关与配置', 'Built-in module toggles & configuration')}
      />

      <SettingsPlugins onlyOrigin="core" />

      <SettingsCategories />
    </div>
  )
}
