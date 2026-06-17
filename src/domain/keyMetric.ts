/**
 * # KeyMetric — 关键指标计数器领域类型
 *
 * 挂在 Goal 上的「手动计数 + 可选绑定事件自动累加」指标。
 * 例：安卓开发 37→100 次。current = manualCount + autoCount(绑定事件出现数)。
 * 纯类型 + 纯函数，不依赖 React/Dexie/浏览器 API。
 */

import type { CategoryId } from './category'
import type { CalendarEvent } from './event'

// ── 主类型 ──────────────────────────────────────────────────

export interface KeyMetric {
  id: string
  label: string
  /** 着色用；null 时用默认 accent */
  categoryId: CategoryId | null
  /** 手动 −/+ 累加的基数 */
  manualCount: number
  /** 目标值（如 100） */
  target: number
  /** 单位文案，如 '次' */
  unit: string
  /** 绑定的具体事件 ID；有记录时自动累加到 current */
  linkedEventIds: string[]
}

export interface CreateMetricInput {
  label: string
  categoryId?: CategoryId | null
  target?: number
  unit?: string
}

// ── 纯函数 ──────────────────────────────────────────────────

/** 绑定事件的自动计数（存在于 events 中的绑定事件数） */
export function computeMetricAutoCount(
  metric: KeyMetric,
  events: readonly CalendarEvent[],
): number {
  if (metric.linkedEventIds.length === 0) return 0
  const idSet = new Set(metric.linkedEventIds)
  let count = 0
  for (const e of events) {
    if (idSet.has(e.id)) count++
  }
  return count
}

/** 当前值 = 手动基数 + 自动计数（下限 0） */
export function metricCurrent(metric: KeyMetric, autoCount = 0): number {
  return Math.max(0, metric.manualCount + autoCount)
}

/** 完成百分比 0–100（target<=0 视为 0） */
export function metricPercent(metric: KeyMetric, autoCount = 0): number {
  if (metric.target <= 0) return 0
  const pct = (metricCurrent(metric, autoCount) / metric.target) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

/**
 * 关键指标整体百分比 = Σcurrent / Σtarget（截图卡片头部的 48%）。
 * autoCounts: metricId → autoCount。
 */
export function aggregateMetricsPercent(
  metrics: readonly KeyMetric[],
  autoCounts: Map<string, number> = new Map(),
): number {
  let sumCurrent = 0
  let sumTarget = 0
  for (const m of metrics) {
    sumCurrent += metricCurrent(m, autoCounts.get(m.id) ?? 0)
    sumTarget += Math.max(0, m.target)
  }
  if (sumTarget <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((sumCurrent / sumTarget) * 100)))
}

/** 同层下一个 sortOrder 不适用；指标按数组顺序，新增追加到末尾。 */
export function makeMetric(id: string, input: CreateMetricInput): KeyMetric {
  return {
    id,
    label: input.label,
    categoryId: input.categoryId ?? null,
    manualCount: 0,
    target: input.target ?? 100,
    unit: input.unit ?? '次',
    linkedEventIds: [],
  }
}
