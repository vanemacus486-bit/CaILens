/**
 * # PluginTopBar — 顶栏插件槽
 *
 * 顶栏的「子视图切换」属于插件内部概念，主体只负责给一个位置。两种来源：
 * 1. 域主插件声明了 `topBar` → 渲染它（适合单个插件独占的域）
 * 2. 没声明、但该域下有多插件贡献的 `domainViews` → 渲染通用子视图导航
 *
 * 第 2 条是「一个域、多个可独立开关的插件」必需的：子视图分散在多个插件里，
 * 任何单个插件都不该、也不能替别人渲染导航。
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

export function PluginTopBar() {
  const location = useLocation()
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)

  const hit = useMemo(
    () => findDomainPlugin(location.pathname, overrides ?? {}),
    [location.pathname, overrides],
  )

  const hasOwnBar = useMemo(
    () => (hit ? Boolean(getPlugin(hit.pluginId)?.topBar) : false),
    [hit],
  )

  const viewCount = useMemo(
    () => (hit && !hasOwnBar ? collectDomainViews(hit.domain.id, overrides ?? {}).length : 0),
    [hit, hasOwnBar, overrides],
  )

  if (!hit) return null

  if (hasOwnBar) {
    const loader = getPlugin(hit.pluginId)!.topBar!
    const Bar = lazyOnce(loader)
    // 用 createElement 而非 JSX 标签：组件由插件 loader 解析而来，
    // 写成 <Bar /> 会被 react-hooks/static-components 判为 render 期创建组件。
    return <Suspense fallback={null}>{createElement(Bar)}</Suspense>
  }

  if (viewCount > 0) return <DomainViewNav domainId={hit.domain.id} variant="pills" />

  return null
}
