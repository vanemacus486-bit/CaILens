/**
 * # PluginSidebar — 侧栏插件槽
 *
 * 主体侧栏（UnifiedSidebar / CompactSidebar）只放一个 `<PluginDomainPanel />`：
 * 当前路径由哪个插件域认领，就渲染该插件声明的侧栏内容。
 * 没有任何域命中时返回 null —— 关闭插件后侧栏自然不会出现它的入口。
 */

import { createElement, lazy, Suspense, useMemo, type ComponentType, type LazyExoticComponent } from 'react'
import { useLocation } from 'react-router-dom'
import { collectSidebarPanels } from './registry'
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

function isWithin(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function PluginDomainPanel() {
  const location = useLocation()
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)
  const panels = useMemo(() => collectSidebarPanels(overrides ?? {}), [overrides])
  const hit = useMemo(
    () =>
      panels
        .filter((p) => isWithin(location.pathname, p.path))
        .sort((a, b) => b.path.length - a.path.length)[0],
    [panels, location.pathname],
  )

  if (!hit) return null
  const Panel = lazyOnce(hit.component)
  // 用 createElement 而非 JSX 标签：面板组件由插件 loader 解析而来，
  // 写成 <Panel /> 会被 react-hooks/static-components 判为 render 期创建组件。
  return <Suspense fallback={null}>{createElement(Panel)}</Suspense>
}
