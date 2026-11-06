import type { SettingsTab } from '@/stores/uiStore'

/**
 * 设置页的导航结构 —— **单一事实源**。
 *
 * 为什么抽出来：SettingsModal（网页端弹窗）与 SettingsPage（桌面独立窗口）
 * 曾经各自维护一份 tab 表，改一处就漏一处。这里只定义一次，两边都从这里取。
 *
 * 侧栏分三组，顺序即 Obsidian 的顺序：选项 → 核心插件 → 第三方插件。
 * 插件那两页内部的「核心 / 第三方」分组由 `plugins/marketplace.ts` 的
 * `PLUGIN_GROUPS` 提供，不是侧栏分组。
 *
 * 放在 `.ts` 而不是 `.tsx`：这里只有数据，没有组件，避免 fast-refresh 规则
 * 对「非组件导出」报警。图标名到组件的映射见 `SettingsNav.tsx`。
 */

export type SettingsTabGroup = 'options' | 'core' | 'third-party'

/** 图标语义名；具体组件在 SettingsNav.tsx 里映射，数据模块不持有 JSX。 */
export type SettingsTabIcon =
  | 'info'
  | 'history'
  | 'palette'
  | 'layout'
  | 'folder'
  | 'keyboard'
  | 'blocks'
  | 'package'

export interface TabDef {
  key: SettingsTab
  labelZh: string
  labelEn: string
  descZh: string
  descEn: string
  group: SettingsTabGroup
  icon: SettingsTabIcon
  /** 设置项搜索的补充关键词（中文片段即可，英文名由 label 覆盖）。 */
  keywords?: string[]
}

/** 侧栏可见的选项卡（顺序即渲染顺序）。 */
export const SETTINGS_TABS: readonly TabDef[] = [
  {
    key: 'about',
    labelZh: '关于',
    labelEn: 'About',
    descZh: '版本、更新与语言',
    descEn: 'Version, updates & language',
    group: 'options',
    icon: 'info',
    keywords: ['版本', '更新', '语言', '隐私'],
  },
  {
    key: 'versions',
    labelZh: '版本',
    labelEn: 'Versions',
    descZh: '更新记录与回退',
    descEn: 'Release notes & rollback',
    group: 'options',
    icon: 'history',
    keywords: ['版本', '更新', '回退', '降级', 'version', 'release', 'rollback'],
  },
  {
    key: 'appearance',
    labelZh: '外观',
    labelEn: 'Appearance',
    descZh: '主题、字体与字号',
    descEn: 'Theme, font & size',
    group: 'options',
    icon: 'palette',
    keywords: ['主题', '深色', '浅色', '字体', '字号', '视觉风格'],
  },
  {
    key: 'interface',
    labelZh: '界面',
    labelEn: 'Interface',
    descZh: '账户、语言与显示',
    descEn: 'Account, language & display',
    group: 'options',
    icon: 'layout',
    keywords: ['账户', '头像', '昵称', '语言', '默认视图'],
  },
  {
    key: 'file',
    labelZh: '文件',
    labelEn: 'Files',
    descZh: '导入导出与存储',
    descEn: 'Import, export & storage',
    group: 'options',
    icon: 'folder',
    keywords: ['导入', '导出', '备份', '存储', 'JSON', 'CSV', 'ICS'],
  },
  {
    key: 'shortcuts',
    labelZh: '快捷键',
    labelEn: 'Hotkeys',
    descZh: '键盘操作绑定',
    descEn: 'Keyboard bindings',
    group: 'options',
    icon: 'keyboard',
    keywords: ['快捷键', '按键', '重置'],
  },
  {
    key: 'core-plugins',
    labelZh: '核心插件',
    labelEn: 'Core plugins',
    descZh: '内置模块开关',
    descEn: 'Built-in modules',
    group: 'core',
    icon: 'blocks',
    keywords: ['插件', '分类', '复盘', '规划', '统计'],
  },
  {
    key: 'third-party',
    labelZh: '第三方插件',
    labelEn: 'Third-party plugins',
    descZh: '外部扩展（占位）',
    descEn: 'External plugins (placeholder)',
    group: 'third-party',
    icon: 'package',
    keywords: ['插件', '第三方', '扩展'],
  },
]

export interface SettingsTabGroupDef {
  id: SettingsTabGroup
  labelZh: string
  labelEn: string
}

/** 侧栏分组标题；恒定输出（含未来可能为空的组），结构不随数据消失。 */
export const SETTINGS_TAB_GROUPS: readonly SettingsTabGroupDef[] = [
  { id: 'options', labelZh: '选项', labelEn: 'Options' },
  { id: 'core', labelZh: '核心插件', labelEn: 'Core plugins' },
  { id: 'third-party', labelZh: '第三方插件', labelEn: 'Third-party plugins' },
]

/** 键盘导航只在可见项之间循环。 */
export const NAV_TABS = SETTINGS_TABS

/**
 * 历史隐藏页 key → 侧栏应高亮的页签。
 *
 * 账户菜单仍可能直接打开 `account`（旧深链 / 旧持久化值）。侧栏里没有这一项，
 * 不映射就会「打开了设置，但没有任何一项被选中」。
 */
const HIDDEN_TAB_PARENT: Partial<Record<SettingsTab, SettingsTab>> = {
  account: 'interface',
  data: 'file',
  storage: 'file',
  support: 'about',
  plugins: 'core-plugins',
}

export function resolveNavTab(tab: SettingsTab): SettingsTab {
  return HIDDEN_TAB_PARENT[tab] ?? tab
}
