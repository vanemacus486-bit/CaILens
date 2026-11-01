import type { PluginDefinition } from '../types'

/** 复盘 · 卫生（review-hygiene）：卫生时间线与活动频次矩阵。 */
export const reviewHygienePlugin: PluginDefinition = {
  id: 'review-hygiene',
  name: '复盘 · 卫生',
  description: '卫生时间线与活动出现次数。',
  version: '1.0.0',
  defaultEnabled: true,
  domainViews: [
    {
      domainId: 'review',
      id: 'hygiene',
      label: '卫生',
      labelKey: 'stats.hygiene',
      icon: 'Droplets',
      order: 50,
      component: () => import('./HygieneModeView').then((m) => ({ default: m.HygieneModeView })),
    },
  ],
}
