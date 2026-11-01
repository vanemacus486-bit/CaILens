import type { PluginDefinition } from '../types'

/** 复盘 · 饮食（review-diet）：饮食时间线与食物频次矩阵。 */
export const reviewDietPlugin: PluginDefinition = {
  id: 'review-diet',
  name: '复盘 · 饮食',
  description: '饮食时间线与食物出现次数。',
  version: '1.0.0',
  defaultEnabled: true,
  domainViews: [
    {
      domainId: 'review',
      id: 'diet',
      label: '饮食',
      labelKey: 'stats.diet',
      icon: 'Utensils',
      order: 40,
      component: () => import('./DietModeView').then((m) => ({ default: m.DietModeView })),
    },
  ],
}
