import type { PluginDefinition, PluginOrigin } from './types'

/**
 * 插件市场的展示层模型。
 *
 * 为什么单独一层：设置页需要的不只是 PluginDefinition，还需要
 * 「用户是否显式设置过」「有多少路由 / 导航 / 表」这类派生信息。
 * 把它们算在 React 组件里，逻辑就没法单测，也没法在别处复用。
 *
 * 开关语义沿用主体约定：`overrides[id] ?? defaultEnabled`。
 */

/**
 * 设置页里的插件分组。
 *
 * 顺序即渲染顺序，且**恒定输出**（哪怕某组一个插件都没有）——
 * 「第三方插件」这一组现在必然是空的，但空组要显式存在，
 * 用户才知道这一类将来会有东西，而不是以为分类没做。
 */
export interface PluginGroupMeta {
  id: PluginOrigin
  label: string
  /** 组头下的一句话说明 */
  description: string
  /** 该组空时的提示 */
  emptyHint: string
}

export const PLUGIN_GROUPS: readonly PluginGroupMeta[] = [
  {
    id: 'core',
    label: '核心插件',
    description: '随应用一起编译的内置模块，开关只影响入口注册。',
    emptyHint: '没有核心插件。',
  },
  {
    id: 'third-party',
    label: '第三方插件',
    description: '由外部提供、在运行时接入的插件。',
    emptyHint: '暂未支持第三方插件。当前版本没有运行时加载通道，插件需要随应用编译。',
  },
]

export interface PluginCard {
  id: string
  name: string
  description: string
  version: string
  /** 来源分组，缺省为 `core` */
  origin: PluginOrigin
  /** 当前是否启用 */
  enabled: boolean
  /** 用户是否显式设置过（false 表示仍在吃 defaultEnabled 默认值） */
  isOverridden: boolean
  /** 归属声明的表名，永远给数组，避免 UI 层判空两次 */
  tables: string[]
  routeCount: number
  navCount: number
  /** 贡献给其他域的子视图数（`domainViews`）。复盘五格就是靠它显示的。 */
  viewCount: number
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
      origin: p.origin ?? 'core',
      enabled: override ?? p.defaultEnabled,
      isOverridden: override !== undefined,
      tables: p.tables ?? [],
      routeCount: p.routes?.length ?? 0,
      navCount: p.navItems?.length ?? 0,
      viewCount: p.domainViews?.length ?? 0,
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

/** 一个分组 + 它下面的卡片（已过滤）。 */
export interface PluginGroupSection {
  meta: PluginGroupMeta
  cards: PluginCard[]
}

/**
 * 按来源把（已过滤的）卡片分组。
 *
 * 两条硬规则：
 * 1. **恒定输出所有分组**，包括空组 —— 分组是「这个应用有哪些种类的插件」的
 *    结构声明，不是「当前有哪些数据」的投影。空组由 UI 渲染成灰色说明文字。
 * 2. **组内顺序沿用传入顺序**，未在 `PLUGIN_GROUPS` 里登记的 origin 不静默丢弃，
 *    追加到末尾并按 id 排序 —— 新增来源类型时先看得到，再去补 meta。
 */
export function groupPluginCards(
  cards: readonly PluginCard[],
  groups: readonly PluginGroupMeta[] = PLUGIN_GROUPS,
): PluginGroupSection[] {
  const known = new Set(groups.map((g) => g.id))
  const sections: PluginGroupSection[] = groups.map((meta) => ({
    meta,
    cards: cards.filter((c) => c.origin === meta.id),
  }))

  const orphans = cards.filter((c) => !known.has(c.origin))
  if (orphans.length > 0) {
    const ids = [...new Set(orphans.map((c) => c.origin))].sort()
    for (const id of ids) {
      sections.push({
        meta: {
          id,
          label: id,
          description: '未登记来源的插件。',
          emptyHint: '',
        },
        cards: orphans.filter((c) => c.origin === id),
      })
    }
  }

  return sections
}
