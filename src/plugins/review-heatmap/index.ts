import type { PluginDefinition } from '../types'

/** 复盘 · 热力（review-heatmap）：年度 / 近 365 天分类热力图。 */
export const reviewHeatmapPlugin: PluginDefinition = {
  id: 'review-heatmap',
  name: '复盘 · 热力',
  description: '按分类着色的年度热力图，含近 365 天滚动视图。',
  version: '1.0.0',
  defaultEnabled: true,
  domainViews: [
    {
      domainId: 'review',
      id: 'heatmap',
      label: '热力',
      labelKey: 'stats.heatmap',
      icon: 'LayoutGrid',
      order: 20,
      component: () => import('./HeatmapView').then((m) => ({ default: m.HeatmapView })),
    },
  ],
}
