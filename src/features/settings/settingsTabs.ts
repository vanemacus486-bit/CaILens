import type { SettingsTab } from '@/stores/uiStore'

/**
 * 设置页的导航结构 —— **单一事实源**。
 *
 * 为什么抽出来：SettingsModal（网页端弹窗）与 SettingsPage（桌面独立窗口）
 * 曾经各自维护一份 tab 表，改一处就漏一处。这里只定义一次，两边都从这里取。
 *
 * 侧栏只有一组「选项」，顺序即用户指定的顺序：
 * 关于 → 外观 → 界面 → 文件 → 快捷键 → 核心插件 → 第三方插件。
 * 插件那两页内部的「核心 / 第三方」分组由 `plugins/marketplace.ts` 的
 * `PLUGIN_GROUPS` 提供，不是侧栏分组。
 *
 * 放在 `.ts` 而不是 `.tsx`：这里只有数据，没有组件，避免 fast-refresh 规则
 * 对「非组件导出」报警。组件映射见 `settingsTabContent.ts`。
 */

export interface TabDef {
  key: SettingsTab
  labelZh: string
  labelEn: string
  descZh: string
  descEn: string
}

/** 侧栏可见的选项卡（顺序即渲染顺序）。 */
export const SETTINGS_TABS: readonly TabDef[] = [
  { key: 'about',        labelZh: '关于',       labelEn: 'About',               descZh: '版本、更新与语言', descEn: 'Version, updates & language' },
  { key: 'appearance',   labelZh: '外观',       labelEn: 'Appearance',          descZh: '主题、字体与字号', descEn: 'Theme, font & size' },
  { key: 'interface',    labelZh: '界面',       labelEn: 'Interface',           descZh: '账户、语言与显示', descEn: 'Account, language & display' },
  { key: 'file',         labelZh: '文件',       labelEn: 'Files',               descZh: '导入导出与存储',   descEn: 'Import, export & storage' },
  { key: 'shortcuts',    labelZh: '快捷键',     labelEn: 'Hotkeys',             descZh: '键盘操作绑定',     descEn: 'Keyboard bindings' },
  { key: 'core-plugins', labelZh: '核心插件',   labelEn: 'Core plugins',        descZh: '内置模块开关',     descEn: 'Built-in modules' },
  { key: 'third-party',  labelZh: '第三方插件', labelEn: 'Third-party plugins', descZh: '外部扩展（占位）', descEn: 'External plugins (placeholder)' },
]

/** 键盘导航只在可见项之间循环。 */
export const NAV_TABS = SETTINGS_TABS
