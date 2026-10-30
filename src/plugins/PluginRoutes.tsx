import { Fragment, lazy, useMemo, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { collectLayouts, collectRoutes } from './registry'

/**
 * 把已启用插件的路由展开成 <Route> 列表。
 *
 * ⚠️ 必须作为**hook**调用，把返回值当 JSX children 塞进 <Routes>：
 *
 *     const pluginRoutes = usePluginRoutes()
 *     ...
 *     <Routes><Route element={<Layout />}>...{pluginRoutes}</Route></Routes>
 *
 * 不能写成 `<PluginRoutes />` 组件！
 *
 * react-router v6 的 `createRoutesFromChildren` 会遍历 <Routes> 的**直接子元素**，
 * 只认 `Route` / `Fragment`，其他任何元素（包括自定义组件，哪怕它内部 return 了
 * Fragment + Route）都会直接抛：
 *
 *   Error: [Xxx] is not a <Route> component. All component children of <Routes>
 *   must be a <Route> or <React.Fragment>
 *
 * 这个错误发生在挂载之前，整棵 React 树不会渲染 —— 表现就是**白屏、窗口里零元素**。
 * 返回 Fragment 是为了让 <Routes> 把它识别成合法的 children 容器。
 *
 * 插件可声明 `layout`：该插件的所有路由会被套进这个 pathless 父路由，
 * 由 layout 自己渲染 <Outlet />。这样满高滚动容器这类域级外壳留在插件内部，
 * 主体不需要知道 `/stats` 需要什么外壳。
 */
export function usePluginRoutes(): ReactNode {
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)
  const groups = useMemo(() => collectRoutes(overrides ?? {}), [overrides])
  const layouts = useMemo(() => collectLayouts(overrides ?? {}), [overrides])

  // 依赖 overrides 变化重建 lazy 组件；collectRoutes 已按 id 排序，顺序稳定
  const groupsWithComponents = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        routes: group.routes.map((route) => ({
          key: `${group.id}:${route.path}`,
          path: route.path,
          Component: lazy(route.component),
        })),
        // layout 只在插件确有路由时才需要
        Layout: layouts.has(group.id) ? lazy(layouts.get(group.id)!) : null,
      })),
    [groups, layouts],
  )

  return (
    <>
      {groupsWithComponents.map(({ id, routes, Layout }) => {
        const children = routes.map(({ key, path, Component }) => (
          <Route
            key={key}
            path={path}
            element={
              <Suspense fallback={<div className="flex-1 bg-surface-base" />}>
                <Component />
              </Suspense>
            }
          />
        ))
        if (!Layout) return <Fragment key={id}>{children}</Fragment>
        return (
          <Route
            key={id}
            element={
              <Suspense fallback={<div className="flex-1 bg-surface-base" />}>
                <Layout />
              </Suspense>
            }
          >
            {children}
          </Route>
        )
      })}
    </>
  )
}
