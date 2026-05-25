/**
 * categoryLabels — 分类标签常量
 *
 * 独立出来供多个组件复用（避免重复定义）。
 */

import type { CategoryId } from '@/domain/category'

export const CATEGORY_LABELS: Record<CategoryId, { zh: string; en: string }> = {
  accent: { zh: '主要矛盾', en: 'Core Focus' },
  sage:   { zh: '次要矛盾', en: 'Support' },
  sand:   { zh: '庶务时间', en: 'Chores' },
  sky:    { zh: '个人提升', en: 'Growth' },
  rose:   { zh: '休息娱乐', en: 'Leisure' },
  stone:  { zh: '睡眠时长', en: 'Sleep' },
}
