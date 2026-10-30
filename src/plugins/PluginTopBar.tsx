/**
 * # PluginTopBar — 顶栏插件槽
 *
 * 顶栏的「子视图切换」是插件内部概念，主体只负责给一个位置：
 * 当前路径由哪个域认领，就渲染该插件声明的 topBar 组件。
 */

import { createElement, lazy, Suspense, useMemo, type ComponentType, type LazyExoticComponent } from 'react'
import { useLocation } from 'react-router-dom'
import { collectTopBars } from './registry'
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
  const bars = useMemo(() => collectTopBars(overrides ?? {}), [overrides])
  const hit = useMemo(
    () =>
      bars
        .filter((b) => location.pathname === b.path || location.pathname.startsWith(`${b.path}/`))
        .sort((a, b) => b.path.length - a.path.length)[0],
    [bars, location.pathname],
  )

  if (!hit) return null
  const Bar = lazyOnce(hit.component)
  // 用 createElement 而非 JSX 标签：组件由插件 loader 解析而来，
  // 写成 <Bar /> 会被 react-hooks/static-components 判为 render 期创建组件。
  return <Suspense fallback={null}>{createElement(Bar)}</Suspense>
}
