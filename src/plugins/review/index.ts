import type { PluginDefinition } from '../types'

/**
 * 复盘域（review）——**只剩外壳**。
 *
 * 五个视角（趋势 / 热力 / 睡眠 / 饮食 / 卫生）已各自成为独立插件，通过
 * `PluginDomainView` 往这个域里加格子。所以：
 *
 * - 这里保留 `domain`（域切换器上的一格、Alt+3、顶栏 ← → 的 date-step 语义）
 * - 保留 `layout`（满高滚动外壳）与 `/stats` 宿主路由
 * - **不再**声明 `topBar` / `sidebarPanel`：子视图导航由 registry 汇总生成
 *   （见 `DomainViewNav`），否则关掉某个视图插件后顶栏仍会显示它的名字
 *
 * 关闭本插件 = 整个复盘域消失（含其下所有子视图格），数据不动。
 */
export const reviewPlugin: PluginDefinition = {
  id: 'review',
  name: '复盘',
  description: '复盘域外壳：承载趋势 / 热力 / 睡眠 / 饮食 / 卫生五个可独立开关的视角。',
  version: '2.0.0',
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
      component: () => import('./ReviewPage').then((m) => ({ default: m.ReviewPage })),
    },
  ],
  layout: () => import('./ReviewLayout').then((m) => ({ default: m.ReviewLayout })),
}
