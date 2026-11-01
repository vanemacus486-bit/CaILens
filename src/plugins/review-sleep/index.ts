import type { PluginDefinition } from '../types'

/** 复盘 · 睡眠（review-sleep）：入睡 / 起床散点与睡眠时长分布。 */
export const reviewSleepPlugin: PluginDefinition = {
  id: 'review-sleep',
  name: '复盘 · 睡眠',
  description: '睡眠时间散点，按月 / 季 / 年切换。',
  version: '1.0.0',
  defaultEnabled: true,
  domainViews: [
    {
      domainId: 'review',
      id: 'sleep',
      label: '睡眠',
      labelKey: 'stats.sleep',
      icon: 'Moon',
      order: 30,
      component: () => import('./SleepView').then((m) => ({ default: m.SleepView })),
    },
  ],
}
