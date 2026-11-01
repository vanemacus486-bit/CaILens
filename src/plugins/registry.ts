import type { PluginDefinition, PluginDomain, PluginDomainView } from './types'

/**
 * 插件注册表。
 *
 * 启用状态来自 `settingsStore.settings.enabledPlugins`（用户显式开关过的才记录），
 * 缺省回落到插件的 `defaultEnabled`。即 `overrides[id] ?? defaultEnabled`。
 *
 * 所有 collect* 函数都接受 `enabledOverrides` 参数而非自己读 store：
 * 这样它们保持纯函数、可单测，也让「关闭插件后主路径不受影响」这条验收标准
 * 可以在测试里直接断言。
 */

const _plugins = new Map<string, PluginDefinition>()

/** 注册插件。重复 id 会覆盖并留下告警，避免静默吃掉。 */
export function registerPlugin(def: PluginDefinition): void {
  if (_plugins.has(def.id)) {
    console.warn(`[plugin] duplicate id "${def.id}", overwriting`)
  }
  _plugins.set(def.id, def)
}

/** 批量注册，供 plugins/index.ts 使用。 */
export function registerPlugins(defs: PluginDefinition[]): void {
  for (const def of defs) registerPlugin(def)
}

export function getPlugin(id: string): PluginDefinition | undefined {
  return _plugins.get(id)
}

/** 全部已注册插件，按 id 排序保证顺序稳定。 */
export function listPlugins(): PluginDefinition[] {
  return [..._plugins.values()].sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * 当前应启用的插件。
 * enabledOverrides 来自 settings，缺省时回落到 defaultEnabled。
 */
export function activePlugins(
  enabledOverrides: Record<string, boolean> = {},
): PluginDefinition[] {
  return listPlugins().filter((p) => enabledOverrides[p.id] ?? p.defaultEnabled)
}

/** 汇总所有已注册插件的路由，供 App.tsx 展开。 */
export function collectRoutes(
  enabledOverrides: Record<string, boolean> = {},
): { id: string; routes: NonNullable<PluginDefinition['routes']> }[] {
  return activePlugins(enabledOverrides)
    .filter((p) => p.routes && p.routes.length > 0)
    .map((p) => ({ id: p.id, routes: p.routes! }))
}

/** 汇总导航入口，按 order 升序。 */
export function collectNavItems(
  enabledOverrides: Record<string, boolean> = {},
): { pluginId: string; items: NonNullable<PluginDefinition['navItems']> }[] {
  return activePlugins(enabledOverrides)
    .filter((p) => p.navItems && p.navItems.length > 0)
    .map((p) => ({
      pluginId: p.id,
      items: [...p.navItems!].sort((a, b) => a.order - b.order),
    }))
}

/**
 * 汇总各插件认领的主域，按 shortcutOrder 升序。
 *
 * 日历域由主体独占（Alt+1），不在此列表中。同一个域 id 被多个插件认领时，
 * 按 id 字典序取第一个并告警 —— 静默取后者会让启用顺序决定行为，难以排查。
 */
export function collectDomains(
  enabledOverrides: Record<string, boolean> = {},
): { pluginId: string; domain: PluginDomain }[] {
  const claimed = new Map<string, { pluginId: string; domain: PluginDomain }>()
  for (const p of activePlugins(enabledOverrides)) {
    if (!p.domain) continue
    const existing = claimed.get(p.domain.id)
    if (existing) {
      console.warn(`[plugin] domain "${p.domain.id}" claimed by both "${existing.pluginId}" and "${p.id}"`)
      continue
    }
    claimed.set(p.domain.id, { pluginId: p.id, domain: p.domain })
  }
  return [...claimed.values()].sort((a, b) => a.domain.shortcutOrder - b.domain.shortcutOrder)
}

/**
 * 当前路径命中的域插件（最长前缀匹配）。
 *
 * 用最长前缀而不是 `startsWith` 的第一命中：将来出现 `/action/archive` 这类
 * 子域时，短前缀会抢走归属。
 */
export function findDomainPlugin(
  pathname: string,
  enabledOverrides: Record<string, boolean> = {},
): { pluginId: string; domain: PluginDomain } | undefined {
  return collectDomains(enabledOverrides)
    .filter(({ domain }) => pathname === domain.path || pathname.startsWith(`${domain.path}/`))
    .sort((a, b) => b.domain.path.length - a.domain.path.length)[0]
}

/** 收集侧栏面板工厂，按域顺序。调用方按当前路径挑选。 */
export function collectSidebarPanels(
  enabledOverrides: Record<string, boolean> = {},
): { pluginId: string; path: string; component: NonNullable<PluginDefinition['sidebarPanel']> }[] {
  return collectDomains(enabledOverrides)
    .map(({ pluginId, domain }) => {
      const component = getPlugin(pluginId)?.sidebarPanel
      return component ? { pluginId, path: domain.path, component } : null
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
}

/** 收集路由包裹层，供 PluginRoutes 把插件页面套进自己的外壳。 */
export function collectLayouts(
  enabledOverrides: Record<string, boolean> = {},
): Map<string, NonNullable<PluginDefinition['layout']>> {
  const map = new Map<string, NonNullable<PluginDefinition['layout']>>()
  for (const p of activePlugins(enabledOverrides)) {
    if (p.layout) map.set(p.id, p.layout)
  }
  return map
}

/**
 * 收集某个域下所有子视图，按 order 升序。
 *
 * 三条过滤规则：
 * 1. 贡献者插件必须启用（关掉一个视图插件，那一格就消失）
 * 2. 域必须被某个**启用**插件认领（域主插件关掉后，子视图没有落脚处）
 * 3. 同域内 id 重复时保留先出现者并告警 —— 静默取后者会让启用顺序决定行为
 */
export function collectDomainViews(
  domainId: string,
  enabledOverrides: Record<string, boolean> = {},
): (PluginDomainView & { pluginId: string })[] {
  const domainAlive = collectDomains(enabledOverrides).some(
    (d) => d.domain.id === domainId,
  )
  if (!domainAlive) return []

  const seen = new Set<string>()
  const out: (PluginDomainView & { pluginId: string })[] = []
  for (const p of activePlugins(enabledOverrides)) {
    for (const v of p.domainViews ?? []) {
      if (v.domainId !== domainId) continue
      if (seen.has(v.id)) {
        console.warn(`[plugin] duplicate domain view "${domainId}/${v.id}", skipping "${p.id}"`)
        continue
      }
      seen.add(v.id)
      out.push({ ...v, pluginId: p.id })
    }
  }
  return out.sort((a, b) => a.order - b.order)
}

/** 测试用：清空注册表。生产代码不应调用。 */
export function _resetRegistry(): void {
  _plugins.clear()
}

/** 收集顶栏二级导航槽，按域顺序。调用方按当前路径挑选。 */
export function collectTopBars(
  enabledOverrides: Record<string, boolean> = {},
): { pluginId: string; path: string; component: NonNullable<PluginDefinition['topBar']> }[] {
  return collectDomains(enabledOverrides)
    .map(({ pluginId, domain }) => {
      const component = getPlugin(pluginId)?.topBar
      return component ? { pluginId, path: domain.path, component } : null
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
}
