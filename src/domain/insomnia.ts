/**
 * # 失眠统计
 *
 * 纯函数，从 CalendarEvent 中提取 sleepType === 'insomnia' 的事件，
 * 按月聚合产出统计指标。
 */

import type { CalendarEvent } from './event'

// ── 类型 ──────────────────────────────────────────────────────

export interface InsomniaNight {
  id: string
  /** YYYY-MM-DD */
  date: string
  startTime: number
  endTime: number
  /** 失眠持续时间（小时） */
  durationHours: number
  quality?: 1 | 2 | 3 | 4 | 5
}

export interface MonthlyInsomniaStats {
  /** YYYY-MM */
  monthKey: string
  /** 显示标签，如 "6月" */
  monthLabel: string
  /** 本月失眠晚数 */
  count: number
  /** 平均失眠时长（小时） */
  avgDurationHours: number
  /** 平均质量评分（1-5），无数据时为 null */
  avgQuality: number | null
  /** 本月所有失眠事件详情 */
  nights: InsomniaNight[]
}

export interface InsomniaSummaryResult {
  /** 过去 N 个月的月度统计（含零数据月份） */
  monthlyStats: MonthlyInsomniaStats[]
  /** 过去 N 个月的总失眠晚数 */
  totalNights: number
  /** 有数据的月份中最近的一个 */
  latestMonth: MonthlyInsomniaStats | null
}

// ── 过滤 ──────────────────────────────────────────────────────

/**
 * 从事件列表中筛选失眠事件。
 * 失眠：typedData.type === 'sleep' && sleepType === 'insomnia'，且时长 >= 30 分钟。
 */
export function filterInsomniaEvents(
  events: readonly CalendarEvent[],
): CalendarEvent[] {
  return events.filter(
    (e) =>
      e.typedData?.type === 'sleep' &&
      e.typedData.sleepType === 'insomnia' &&
      e.endTime - e.startTime >= 30 * 60_000,
  )
}

// ── 月度聚合 ──────────────────────────────────────────────────

/**
 * 按月分组计算失眠统计。
 *
 * @param events     CalendarEvent 列表
 * @param monthCount 返回最近多少个月的数据（默认 12）
 * @returns InsomniaSummaryResult
 */
export function computeMonthlyInsomniaStats(
  events: readonly CalendarEvent[],
  monthCount = 12,
): InsomniaSummaryResult {
  const insomniaEvents = filterInsomniaEvents(events)

  // 按月分组
  const byMonth = new Map<string, CalendarEvent[]>()

  for (const ev of insomniaEvents) {
    const d = new Date(ev.startTime)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const arr = byMonth.get(key)
    if (arr) arr.push(ev)
    else byMonth.set(key, [ev])
  }

  // 构建连续的月份列表
  const now = new Date()
  const stats: MonthlyInsomniaStats[] = []

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthEvents = byMonth.get(key) ?? []

    const count = monthEvents.length
    const durations = monthEvents.map((e) => (e.endTime - e.startTime) / 3_600_000)
    const qualities = monthEvents
      .map((e) => (e.typedData?.type === 'sleep' ? e.typedData.quality : undefined))
      .filter((q): q is 1 | 2 | 3 | 4 | 5 => q !== undefined)

    const avgDuration = count > 0
      ? durations.reduce((a, b) => a + b, 0) / count
      : 0

    const avgQuality = qualities.length > 0
      ? qualities.reduce((a, b) => a + b, 0) / qualities.length
      : null

    const nights: InsomniaNight[] = monthEvents.map((ev) => {
      const ed = new Date(ev.startTime)
      const dateStr = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`
      return {
        id: ev.id,
        date: dateStr,
        startTime: ev.startTime,
        endTime: ev.endTime,
        durationHours: (ev.endTime - ev.startTime) / 3_600_000,
        quality: ev.typedData?.type === 'sleep' ? ev.typedData.quality : undefined,
      }
    })

    stats.push({
      monthKey: key,
      monthLabel: `${d.getMonth() + 1}月`,
      count,
      avgDurationHours: Math.round(avgDuration * 100) / 100,
      avgQuality: avgQuality !== null ? Math.round(avgQuality * 10) / 10 : null,
      nights,
    })
  }

  const totalNights = stats.reduce((s, m) => s + m.count, 0)

  // 找有数据的最近月份
  let latestMonth: MonthlyInsomniaStats | null = null
  for (let i = stats.length - 1; i >= 0; i--) {
    if (stats[i].count > 0) {
      latestMonth = stats[i]
      break
    }
  }

  return { monthlyStats: stats, totalNights, latestMonth }
}
