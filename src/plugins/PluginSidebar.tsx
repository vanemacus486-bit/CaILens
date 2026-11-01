/**
 * # PluginSidebar — 侧栏插件槽
 *
 * 主体侧栏（UnifiedSidebar / CompactSidebar）只放一个 `<PluginDomainPanel />`：
 * 当前路径由哪个插件域认领，就渲染该插件声明的侧栏内容。
 * 没有任何域命中时返回 null —— 关闭插件后侧栏自然不会出现它的入口。
 *
 * 与顶栏同理：域主插件没声明 `sidebarPanel` 但域下有多插件贡献的 `domainViews` 时，
 * 回退到通用子视图导航（书脊式）。
 */

import { createElement, lazy, Suspense, useMemo, type ComponentType, type LazyExoticComponent } from 'react'
import { useLocation } from 'react-router-dom'
import { collectDomainViews, findDomainPlugin, getPlugin } from './registry'
import { DomainViewNav } from './DomainViewNav'
import { useAppSettingsStore } from '@/stores/settingsStore'

type Loader = () => Promise<{ default: ComponentType }>

// lazy() 必须在 render 之外创建：每次渲染新建组件类型会让 React 卸载重挂。
const cache = new Map<Loader, LazyExoticComponent<ComponentType>>()

function lazyOnce(loader: Loader): LazyExoticComponent<ComponentType> {
  let C = cache.get(loader)
  if (!C) {
    C = lazy(loader)
    cache.set(loader, C)
  }
  return C
}

export function PluginDomainPanel() {
  const location = useLocation()
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)

  const hit = useMemo(
    () => findDomainPlugin(location.pathname, overrides ?? {}),
    [location.pathname, overrides],
  )

  const hasOwnPanel = useMemo(
    () => (hit ? Boolean(getPlugin(hit.pluginId)?.sidebarPanel) : false),
    [hit],
  )

  const viewCount = useMemo(
    () => (hit && !hasOwnPanel ? collectDomainViews(hit.domain.id, overrides ?? {}).length : 0),
    [hit, hasOwnPanel, overrides],
  )

  if (!hit) return null

  if (hasOwnPanel) {
    const loader = getPlugin(hit.pluginId)!.sidebarPanel!
    const Panel = lazyOnce(loader)
    // 用 createElement 而非 JSX 标签：面板组件由插件 loader 解析而来，
    // 写成 <Panel /> 会被 react-hooks/static-components 判为 render 期创建组件。
    return <Suspense fallback={null}>{createElement(Panel)}</Suspense>
  }

  if (viewCount > 0) return <DomainViewNav domainId={hit.domain.id} variant="spine" />

  return null
}
