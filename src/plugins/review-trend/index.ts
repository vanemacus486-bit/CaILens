import type { PluginDefinition } from '../types'

/**
 * 复盘 · 趋势（review-trend）。
 *
 * 原属 review 插件五个子视图之一，拆出来后可以单独关掉：
 * 关掉只让「趋势」这一格从复盘域的顶栏 / 侧栏消失，其余四格与复盘域本身照旧。
 */
export const reviewTrendPlugin: PluginDefinition = {
  id: 'review-trend',
  name: '复盘 · 趋势',
  description: '分类趋势曲线与习惯养成趋势卡。',
  version: '1.0.0',
  defaultEnabled: true,
  domainViews: [
    {
      domainId: 'review',
      id: 'trend',
      label: '趋势',
      labelKey: 'stats.trend',
      icon: 'TrendingUp',
      order: 10,
      component: () => import('./TrendView').then((m) => ({ default: m.TrendView })),
    },
  ],
}
