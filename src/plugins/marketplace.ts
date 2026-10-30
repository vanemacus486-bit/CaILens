import type { PluginDefinition } from './types'

/**
 * 插件市场的展示层模型。
 *
 * 为什么单独一层：设置页需要的不只是 PluginDefinition，还需要
 * 「用户是否显式设置过」「有多少路由 / 导航 / 表」这类派生信息。
 * 把它们算在 React 组件里，逻辑就没法单测，也没法在别处复用。
 *
 * 开关语义沿用主体约定：`overrides[id] ?? defaultEnabled`。
 */

export interface PluginCard {
  id: string
  name: string
  description: string
  version: string
  /** 当前是否启用 */
  enabled: boolean
  /** 用户是否显式设置过（false 表示仍在吃 defaultEnabled 默认值） */
  isOverridden: boolean
  /** 归属声明的表名，永远给数组，避免 UI 层判空两次 */
  tables: string[]
  routeCount: number
  navCount: number
}

/** 市场筛选状态：全部 / 只看已启用 / 只看已停用 */
export type PluginStatusFilter = 'all' | 'enabled' | 'disabled'

export interface PluginFilter {
  status: PluginStatusFilter
  /** 搜索词，匹配名称 / 描述 / id，大小写不敏感；空白等价于不过滤 */
  query: string
}

/** 把插件定义 + 用户开关记录合成可渲染的卡片列表。顺序沿用传入顺序。 */
export function buildPluginCards(
  plugins: readonly PluginDefinition[],
  overrides: Record<string, boolean>,
): PluginCard[] {
  return plugins.map((p) => {
    const override = overrides[p.id]
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      version: p.version,
      enabled: override ?? p.defaultEnabled,
      isOverridden: override !== undefined,
      tables: p.tables ?? [],
      routeCount: p.routes?.length ?? 0,
      navCount: p.navItems?.length ?? 0,
    }
  })
}

/**
 * 按状态与搜索词过滤卡片。
 *
 * 两个条件是**交集**：先按启用状态筛，再在结果里做模糊匹配。
 * 用 `filter` 而不是 `reduce` 原地改写——传入的数组可能被别处持有。
 */
export function filterPluginCards(
  cards: readonly PluginCard[],
  filter: PluginFilter,
): PluginCard[] {
  const needle = filter.query.trim().toLowerCase()
  return cards.filter((card) => {
    if (filter.status === 'enabled' && !card.enabled) return false
    if (filter.status === 'disabled' && card.enabled) return false
    if (needle.length === 0) return true
    return (
      card.name.toLowerCase().includes(needle) ||
      card.description.toLowerCase().includes(needle) ||
      card.id.toLowerCase().includes(needle)
    )
  })
}

export interface PluginCounts {
  total: number
  enabled: number
  disabled: number
}

/** 底部计数条用。total 恒等于 enabled + disabled。 */
export function countPlugins(cards: readonly PluginCard[]): PluginCounts {
  let enabled = 0
  for (const card of cards) if (card.enabled) enabled += 1
  return { total: cards.length, enabled, disabled: cards.length - enabled }
}
