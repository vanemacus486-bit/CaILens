import { startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import type { Granularity } from '@/hooks/useStatsAggregation'

export type ReviewDomain = 'trend' | 'heatmap' | 'sleep' | 'diet' | 'hygiene'

export interface ReviewRouteState {
  domain: ReviewDomain
}

const REVIEW_DOMAINS = new Set<ReviewDomain>(['trend', 'heatmap', 'sleep', 'diet', 'hygiene'])

export function resolveReviewRoute(view: string | null): ReviewRouteState {
  const domain = view && REVIEW_DOMAINS.has(view as ReviewDomain) ? view as ReviewDomain : 'trend'
  return { domain }
}

/** 每个复盘子视图的时间步长，用于顶栏 ← → 的日期步进。 */
export const REVIEW_VIEW_STEP: Record<string, 'period' | 'year' | 'month' | 'week'> = {
  trend: 'period',
  heatmap: 'year',
  sleep: 'month',
  diet: 'week',
  hygiene: 'week',
}

/** 把「粒度 + 日期」归一到该粒度的起点。 */
export function anchorForPeriod(period: Granularity, date: Date): Date {
  switch (period) {
    case 'day': return startOfDay(date)
    case 'week': return startOfWeek(date, { weekStartsOn: 1 })
    case 'month': return startOfMonth(date)
  }
}

/**
 * 子视图的锚点日期。未知视图回落到「按粒度取整」，与 trend 一致。
 */
export function reviewViewAnchor(viewId: string, period: Granularity, date: Date): Date {
  switch (REVIEW_VIEW_STEP[viewId]) {
    case 'year': return new Date(date.getFullYear(), 0, 1)
    case 'month': return startOfMonth(date)
    case 'week': return startOfWeek(date, { weekStartsOn: 1 })
    default: return anchorForPeriod(period, date)
  }
}
