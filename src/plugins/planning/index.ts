import type { PluginDefinition } from '../types'

/**
 * 规划插件（planning）。
 *
 * 从主体迁入：`/action` 路由、侧栏的待办过滤 + 清单管理面板、Alt+2 快捷键。
 *
 * - 数据仍写主体的 `todos` / `todo_lists` 表，`tables` 留空（声明归属会误导导出）
 * - 只依赖 `domain/todo` 与 `stores/todo*`，不 import 主体 UI
 * - 关闭插件只隐藏入口与路由，待办数据不动
 */
export const planningPlugin: PluginDefinition = {
  id: 'planning',
  name: '规划',
  description: '多清单待办看板，含星标汇总与完成区。',
  version: '1.0.0',
  defaultEnabled: true,
  domain: {
    id: 'plan',
    labelKey: 'nav.plan',
    label: '规划',
    icon: 'CheckSquare',
    path: '/action',
    to: '/action',
    shortcutOrder: 2,
    extraPaths: ['/projects'],
    // 顶栏 ‹ › 循环切换 ?filter=all/starred/archive（本插件内部概念，
    // 主体只按语义分派，不再判断「这是不是 action 域」）
    headerStepKind: 'filter-cycle',
  },
  routes: [
    {
      path: '/action',
      component: () => import('./PlanningPage').then((m) => ({ default: m.PlanningPage })),
    },
  ],
  sidebarPanel: () => import('./SidebarPanel').then((m) => ({ default: m.PlanningSidebarPanel })),
}
