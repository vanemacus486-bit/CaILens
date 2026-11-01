import type { FC } from 'react'
import type { SettingsTab } from '@/stores/uiStore'
import { SettingsAbout } from './SettingsAbout'
import { SettingsAppearance } from './SettingsAppearance'
import { SettingsInterface } from './SettingsInterface'
import { SettingsData } from './SettingsData'
import { SettingsShortcuts } from './SettingsShortcuts'
import { SettingsCorePlugins } from './SettingsCorePlugins'
import { SettingsThirdPartyPlugins } from './SettingsThirdPartyPlugins'
/* 子页：不出现在侧栏，从父页进入（保留原有功能，不删除） */
import { SettingsStorage } from './SettingsStoragePage'
import { SettingsAccount } from './SettingsAccount'
import { SettingsSupport } from './SettingsSupport'

/**
 * Tab → 组件映射。包含隐藏子页，保证任何 key 都有落点。
 *
 * 使用方应**直接查表**（`TAB_CONTENT[tab] ?? SettingsAbout`），不要包一层
 * `getTabContent()` 之类的函数在 render 里调用 —— 那会被
 * `react-hooks/static-components` 判定为「render 期间创建组件」。
 */
export const TAB_CONTENT: Record<SettingsTab, FC> = {
  about: SettingsAbout,
  appearance: SettingsAppearance,
  interface: SettingsInterface,
  file: SettingsData,
  shortcuts: SettingsShortcuts,
  'core-plugins': SettingsCorePlugins,
  'third-party': SettingsThirdPartyPlugins,
  /* 隐藏子页 */
  account: SettingsAccount,
  data: SettingsData,
  storage: SettingsStorage,
  support: SettingsSupport,
  /* 旧 key：历史持久化值 / 旧调用点，落到对应新页 */
  plugins: SettingsCorePlugins,
}

export const FALLBACK_TAB: FC = SettingsAbout
