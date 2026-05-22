/**
 * # 小睡统计（Nap Stats）
 *
 * 从 typedData.sleepType === 'nap' 的事件中提取小睡数据并聚合。
 * 小睡关注的不是 bedtime/waketime 散点，而是：
 * - 什么时候睡（时间分布）
 * - 睡多久（时长分布）
 * - 频率（每周/每月次数）
 */

import type { CalendarEvent } from './event'
import type { DateRange } from './dateRange'

// ── 输出类型 ────────────────────────────────────────────────

export interface NapStats {
  /** 统计周期内的小睡总次数 */
  totalNaps: number
  /** 平均小睡时长（分钟） */
  avgDurationMinutes: number
  /** 小睡中位数时长（分钟） */
  medianDurationMinutes: number
  /** 按小时段的小睡次数分布（0-23） */
  hourDistribution: number[]
  /** 按周的小睡次数 */
  weeklyCounts: WeeklyNapCount[]
}

export interface WeeklyNapCount {
  weekLabel: string
  count: number
}

// ── 周标识 ──────────────────────────────────────────────────

function weekLabel(ts: number): string {
  const d = new Date(ts)
  const dayOfWeek = d.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset)
  return `${monday.getMonth() + 1}/${String(monday.getDate()).padStart(2, '0')}`
}

// ── 中位数 ──────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ── 主聚合函数 ──────────────────────────────────────────────

/**
 * 从指定范围的事件中提取小睡统计。
 */
export function computeNapStats(
  events: readonly CalendarEvent[],
  range: DateRange,
): NapStats {
  // 过滤出小睡事件
  const naps = events.filter(
    (e) =>
      e.typedData?.type === 'sleep' &&
      e.typedData.sleepType === 'nap' &&
      e.startTime >= range.start &&
      e.startTime < range.end,
  )

  const totalNaps = naps.length

  // 时长（分钟）
  const durations = naps.map((e) => (e.endTime - e.startTime) / 60_000)
  const avgDurationMinutes =
    durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : 0
  const medianDurationMinutes =
    durations.length > 0 ? Math.round(median(durations)) : 0

  // 按小时段分布 (0-23)
  const hourDistribution: number[] = new Array(24).fill(0)
  for (const e of naps) {
    const hour = new Date(e.startTime).getHours()
    hourDistribution[hour]++
  }

  // 按周统计
  const weeklyMap = new Map<string, number>()
  for (const e of naps) {
    const wk = weekLabel(e.startTime)
    weeklyMap.set(wk, (weeklyMap.get(wk) ?? 0) + 1)
  }
  const sortedWeeks = [...weeklyMap.keys()].sort()
  const weeklyCounts: WeeklyNapCount[] = sortedWeeks.map((wk) => ({
    weekLabel: wk,
    count: weeklyMap.get(wk) ?? 0,
  }))

  return {
    totalNaps,
    avgDurationMinutes,
    medianDurationMinutes,
    hourDistribution,
    weeklyCounts,
  }
}
