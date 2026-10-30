import type { PluginDefinition } from '../types'

/**
 * 复盘插件（review）。
 *
 * 从主体迁入：`/stats` 路由、满高滚动外壳（layout）、侧栏的复盘子视图导航、
 * Alt+3 快捷键、以及全部复盘图表。
 *
 * - 数据全部读主体的 `events`，`tables` 留空
 * - 只依赖 `domain/`、`stores/`、`components/`，不 import 主体页面
 * - 关闭插件只隐藏入口与路由，数据不动
 *
 * 与主体共享的 `EasternStatsShell` / `ExportSection` / `ImportSection` / `SlidingPills`
 * 留在 `src/components/stats/`：设置页与顶栏也在用，搬进插件会造成主体→插件反向依赖。
 */
export const reviewPlugin: PluginDefinition = {
  id: 'review',
  name: '复盘',
  description: '分类趋势、年度热力、睡眠 / 饮食 / 卫生节律。',
  version: '1.0.0',
  defaultEnabled: true,
  domain: {
    id: 'review',
    labelKey: 'nav.review',
    label: '复盘',
    icon: 'BarChart3',
    path: '/stats',
    to: '/stats',
    shortcutOrder: 3,
    headerStepKind: 'date-step',
  },
  routes: [
    {
      path: '/stats',
      component: () => import('./StatsPage').then((m) => ({ default: m.StatsPage })),
    },
  ],
  layout: () => import('./ReviewLayout').then((m) => ({ default: m.ReviewLayout })),
  sidebarPanel: () => import('./SidebarPanel').then((m) => ({ default: m.ReviewSidebarPanel })),
  topBar: () => import('./TopBar').then((m) => ({ default: m.ReviewTopBar })),
}
