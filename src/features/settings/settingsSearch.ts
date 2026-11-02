import type { SettingsTab } from '@/stores/uiStore'
import { SHORTCUT_REGISTRY } from '@/domain/shortcuts'
import type { Category } from '@/domain/category'
import type { PluginDefinition } from '@/plugins/types'

/**
 * # 设置项搜索索引
 *
 * Obsidian 的设置搜索能直接找到「语言」「自动更新」这类具体项，而不只是页签名。
 * 这里就是那份索引：静态项写死，快捷键 / 插件 / 分类从各自的事实源动态生成。
 *
 * **维护约定**：`anchor` 必须与页面上 `SettingsRow` 的 `anchor` 属性逐字一致，
 * 否则搜索结果能点、但滚动不到（`SettingsNav` 找不到锚点时会静默跳过）。
 * 新增设置行时两处一起加。
 */
export interface SettingsSearchItem {
  tab: SettingsTab
  anchor: string
  labelZh: string
  labelEn: string
  keywords: string[]
}

/** 允许只提供部分字段的静态条目（英文名缺省回退中文）。 */
type StaticItem = Omit<SettingsSearchItem, 'labelEn' | 'keywords'> &
  Partial<Pick<SettingsSearchItem, 'labelEn' | 'keywords'>>

const STATIC_ITEMS: readonly StaticItem[] = [
  // ── 关于 ──
  { tab: 'about', anchor: 'about-version', labelZh: '版本与更新', labelEn: 'Version & updates', keywords: ['版本', '检查更新', 'version', 'update'] },
  { tab: 'about', anchor: 'about-auto-update', labelZh: '自动更新', labelEn: 'Automatic updates', keywords: ['更新', 'auto update'] },
  { tab: 'about', anchor: 'about-language', labelZh: '界面语言', labelEn: 'Language', keywords: ['语言', '中文', 'english', 'language'] },
  { tab: 'about', anchor: 'about-help', labelZh: '获取帮助', labelEn: 'Get help', keywords: ['帮助', '支持', '赞助', 'help', 'support'] },
  { tab: 'about', anchor: 'about-privacy', labelZh: '隐私政策', labelEn: 'Privacy policy', keywords: ['隐私', 'privacy'] },

  // ── 外观 ──
  { tab: 'appearance', anchor: 'appearance-theme', labelZh: '主题模式', keywords: ['主题', '深色', '浅色', '跟随系统', 'theme', 'dark', 'light'] },
  { tab: 'appearance', anchor: 'appearance-font-size', labelZh: '字号', labelEn: 'Font size', keywords: ['字号', '大小', 'font', 'size'] },
  { tab: 'appearance', anchor: 'appearance-font', labelZh: '界面字体', labelEn: 'Interface font', keywords: ['字体', '思源黑体', '霞鹜文楷', 'font'] },

  // ── 界面 ──
  { tab: 'interface', anchor: 'interface-account-name', labelZh: '显示名称', labelEn: 'Display name', keywords: ['账户', '昵称', '名字', 'account', 'name'] },
  { tab: 'interface', anchor: 'interface-account-avatar', labelZh: '头像', labelEn: 'Avatar', keywords: ['账户', '头像', 'emoji', 'avatar'] },
  { tab: 'interface', anchor: 'interface-default-view', labelZh: '启动视图', labelEn: 'Startup view', keywords: ['默认视图', '周视图', '月视图', 'default view', 'week', 'month'] },
  { tab: 'interface', anchor: 'interface-language', labelZh: '界面语言', labelEn: 'Interface language', keywords: ['语言', '中文', 'language'] },

  // ── 文件 ──
  { tab: 'file', anchor: 'file-storage', labelZh: '存储位置', labelEn: 'Storage location', keywords: ['存储', '文件夹', '路径', '重新扫描', 'storage', 'folder'] },
  { tab: 'file', anchor: 'file-import-ics', labelZh: 'ICS 日历导入', labelEn: 'Import ICS calendar', keywords: ['导入', '日历', 'ics', 'import'] },
  { tab: 'file', anchor: 'file-import-json', labelZh: 'JSON 数据导入', labelEn: 'Import JSON data', keywords: ['导入', '恢复', '备份', 'json', 'import'] },
  { tab: 'file', anchor: 'file-export', labelZh: '导出数据', labelEn: 'Export data', keywords: ['导出', 'json', 'csv', 'ics', 'export', '备份'] },

  // ── 快捷键 ──
  { tab: 'shortcuts', anchor: 'shortcuts-reset', labelZh: '重置全部快捷键', labelEn: 'Reset all hotkeys', keywords: ['快捷键', '重置', 'reset', 'shortcut'] },

  // ── 插件 ──
  { tab: 'core-plugins', anchor: 'core-plugins-list', labelZh: '核心插件开关', labelEn: 'Core plugin toggles', keywords: ['插件', '启用', '停用', 'plugin'] },
  { tab: 'core-plugins', anchor: 'core-plugins-categories', labelZh: '分类与预算', labelEn: 'Categories & budgets', keywords: ['分类', '预算', '关键词', 'category', 'budget'] },
  { tab: 'third-party', anchor: 'third-party-list', labelZh: '第三方插件', labelEn: 'Third-party plugins', keywords: ['插件', '第三方', 'plugin'] },
]

function normalizeItem(item: StaticItem): SettingsSearchItem {
  return {
    tab: item.tab,
    anchor: item.anchor,
    labelZh: item.labelZh,
    labelEn: item.labelEn ?? item.labelZh,
    keywords: item.keywords ?? [],
  }
}

export interface SettingsSearchSources {
  plugins?: readonly PluginDefinition[]
  categories?: readonly Pick<Category, 'id' | 'name'>[]
}

/**
 * 构建完整索引。
 *
 * 插件与分类的条目随注册表 / 用户数据变化，所以由调用方传入；不传时
 * 只返回静态项与快捷键项（测试与无数据场景）。
 */
export function buildSettingsSearchIndex({
  plugins = [],
  categories = [],
}: SettingsSearchSources = {}): SettingsSearchItem[] {
  const items: SettingsSearchItem[] = STATIC_ITEMS.map(normalizeItem)

  for (const def of Object.values(SHORTCUT_REGISTRY)) {
    items.push({
      tab: 'shortcuts',
      anchor: `shortcut-${def.action}`,
      labelZh: def.label,
      labelEn: def.label,
      keywords: ['快捷键', 'shortcut', def.action],
    })
  }

  for (const plugin of plugins) {
    items.push({
      tab: plugin.origin === 'third-party' ? 'third-party' : 'core-plugins',
      anchor: `plugin-${plugin.id}`,
      labelZh: plugin.name,
      labelEn: plugin.name,
      keywords: ['插件', 'plugin', plugin.id, plugin.description],
    })
  }

  for (const category of categories) {
    items.push({
      tab: 'core-plugins',
      anchor: `category-${category.id}`,
      labelZh: category.name,
      labelEn: category.name,
      keywords: ['分类', 'category', category.id],
    })
  }

  return items
}

/** 简单模糊匹配：先子串，再按字符顺序松散匹配（长度 ≥ 2 时）。 */
export function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase().replace(/\s+/g, '')
  const t = text.toLowerCase().replace(/\s+/g, '')
  if (!q) return true
  if (t.includes(q)) return true
  if (q.length >= 2) {
    try {
      if (new RegExp(q.split('').join('.*')).test(t)) return true
    } catch {
      /* 正则构造失败时只认子串 */
    }
  }
  return false
}

/** 命中优先级：标题前缀 → 标题包含 → 仅关键词命中。 */
function score(item: SettingsSearchItem, query: string): number {
  const q = query.toLowerCase().replace(/\s+/g, '')
  const zh = item.labelZh.toLowerCase()
  const en = item.labelEn.toLowerCase()
  if (zh.startsWith(q) || en.startsWith(q)) return 0
  if (zh.includes(q) || en.includes(q)) return 1
  return 2
}

/**
 * 搜索设置项。
 *
 * 空查询返回空数组（导航此时应继续显示页签列表，而不是「无结果」）。
 * 去重按 `tab + anchor`，同一项不会因为中英文都命中而出现两次。
 */
export function searchSettings(
  query: string,
  index: readonly SettingsSearchItem[],
): SettingsSearchItem[] {
  const q = query.trim()
  if (!q) return []

  const seen = new Set<string>()
  const hits: { item: SettingsSearchItem; rank: number; order: number }[] = []

  index.forEach((item, order) => {
    const key = `${item.tab}:${item.anchor}`
    if (seen.has(key)) return
    const matched =
      fuzzyMatch(q, item.labelZh) ||
      fuzzyMatch(q, item.labelEn) ||
      item.keywords.some((kw) => fuzzyMatch(q, kw))
    if (!matched) return
    seen.add(key)
    hits.push({ item, rank: score(item, q), order })
  })

  return hits
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, 20)
    .map((hit) => hit.item)
}
