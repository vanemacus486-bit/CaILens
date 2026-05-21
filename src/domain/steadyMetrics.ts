/**
 * # 稳态指标（Steady Metrics）
 *
 * 需求四：从"冲刺指标"转向"稳态指标"。
 *
 * 替代 `computeStreak`（连续天数）的冲刺型指标，
 * 引入更能反映长期规律性的稳态指标：
 *
 * - 覆盖率（coverage）     → 已有 `quality.ts` 中的实现
 * - 中位数（median）       → 就寝/起床时间的中位数
 * - 标准差（stddev）       → 就寝/起床时间的标准差
 * - 漂移速度（drift）      → 作息随时间滑动的速度与方向
 *
 * ## 时区约定
 *
 * 所有时间戳为 UTC 毫秒。就寝/起床时间按本地时区推断：
 * "就寝" = 当天最后一个事件的 endTime
 * "起床" = 当天第一个事件的 startTime（若在上午）
 */

import type { CalendarEvent } from './event'

// ── 类型定义 ────────────────────────────────────────────────────

export interface SleepMetrics {
  /** 就寝时间中位数（本地小时，如 23.5 = 23:30） */
  medianBedtime: number | null
  /** 起床时间中位数（本地小时，如 7.25 = 07:15） */
  medianWakeTime: number | null
  /** 睡眠时长中位数（小时） */
  medianSleepDuration: number | null
  /** 就寝时间的标准差（分钟） */
  bedtimeStddev: number | null
  /** 起床时间的标准差（分钟） */
  wakeTimeStddev: number | null
}

export interface DriftMetrics {
  /** 漂移速度（分钟/周，正数=推迟，负数=提前） */
  bedtimeDrift: number | null
  /** wakeTime 漂移速度（分钟/周） */
  wakeTimeDrift: number | null
  /** 若不干预，N 周后就寝时间会到达几点（本地小时） */
  projectedBedtime: number | null
  /** 若不干预，N 周后起床时间会到达几点（本地小时） */
  projectedWakeTime: number | null
  /** 漂移方向的文字描述 */
  direction: 'advancing' | 'delaying' | 'stable' | null
}

export interface SteadyMetrics {
  sleep: SleepMetrics
  drift: DriftMetrics
  /** 有数据的有效天数比例（0–1） */
  coverage: number
  /** 分析的周数 */
  weekCount: number
}

// ── 工具函数 ────────────────────────────────────────────────────

/** 将 Date 对象的 小时+分钟 转为浮点小时（本地时区） */
function toLocalHour(ts: number): number {
  const d = new Date(ts)
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
}

/** 将浮点小时转为 Date 对象的本地小时+分钟 */
/** 中位数 */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** 标准差 */
function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const sqDiffs = values.map((v) => (v - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / (values.length - 1))
}

/** 处理跨午夜的就寝时间：23:00 → 23，01:00 → 25（+24） */
/** 反标准化：25 → 01:00 */
function denormalizeBedtime(hour: number): number {
  return hour >= 24 ? hour - 24 : hour
}

/**
 * 线性回归斜率。返回每分钟变化量。
 * x = 天（相对于第一个点的偏移），y = 本地小时
 */
function linearSlope(points: { x: number; y: number }[]): number | null {
  if (points.length < 2) return null
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  // slope is in hours/day; convert to minutes/week
  return slope !== null ? slope * 60 * 7 : null
}

// ── 主函数 ──────────────────────────────────────────────────────

/**
 * 从一天的事件列表推断就寝时间和起床时间。
 *
 * - 起床：当天第一个事件的 startTime（如果在 04:00–12:00 之间）
 * - 就寝：当天最后一个事件的 endTime（如果在 18:00–06:00 之间，考虑跨午夜）
 */
function inferSleepTimes(dayEvents: CalendarEvent[]): {
  bedtime: number | null
  wakeTime: number | null
} {
  if (dayEvents.length === 0) return { bedtime: null, wakeTime: null }

  const sorted = [...dayEvents].sort((a, b) => a.startTime - b.startTime)

  // 起床：第一个事件的 startTime
  const firstHour = toLocalHour(sorted[0].startTime)
  const wakeTime = firstHour >= 4 && firstHour <= 12 ? firstHour : null

  // 就寝：最后一个事件的 endTime
  const last = sorted[sorted.length - 1]
  const lastHour = toLocalHour(last.endTime)

  // 如果最后一个事件结束在 18:00–06:00 之间，视为就寝时间
  const normalized = lastHour >= 18 ? lastHour : (lastHour < 6 ? lastHour + 24 : null)
  const bedtime = normalized !== null && normalized >= 18 && normalized <= 30
    ? normalized
    : null

  return { bedtime, wakeTime }
}

/**
 * 将事件按天分组。
 */
function groupByDay(events: readonly CalendarEvent[]): Map<number, CalendarEvent[]> {
  const map = new Map<number, CalendarEvent[]>()
  for (const event of events) {
    const dayStart = new Date(event.startTime)
    dayStart.setHours(0, 0, 0, 0)
    const key = dayStart.getTime()
    const arr = map.get(key) ?? []
    arr.push(event)
    map.set(key, arr)
  }
  return map
}

/**
 * 计算稳态指标。
 *
 * @param events  时间范围内的所有事件
 * @param dayCount  分析的日历天数
 * @param projectWeeks  投影周数（默认 4 周）
 */
export function computeSteadyMetrics(
  events: readonly CalendarEvent[],
  dayCount: number,
  projectWeeks = 4,
): SteadyMetrics {
  const byDay = groupByDay(events)
  const daysWithData = byDay.size
  const coverage = dayCount > 0 ? daysWithData / dayCount : 0

  // 提取每天的作息时间
  type DayPoint = { dateTs: number; dayIndex: number; bedtime: number | null; wakeTime: number | null }
  const dayPoints: DayPoint[] = []
  let idx = 0
  for (const [, dayEvents] of byDay) {
    const { bedtime, wakeTime } = inferSleepTimes(dayEvents)
    dayPoints.push({
      dateTs: dayEvents[0].startTime,
      dayIndex: idx++,
      bedtime,
      wakeTime,
    })
  }

  // ── 睡眠中位数与标准差 ──
  const validBedtimes = dayPoints
    .map((p) => p.bedtime)
    .filter((b): b is number => b !== null)
  const validWakeTimes = dayPoints
    .map((p) => p.wakeTime)
    .filter((w): w is number => w !== null)

  const medianBedtime = validBedtimes.length > 0 ? denormalizeBedtime(median(validBedtimes)) : null
  const medianWakeTime = validWakeTimes.length > 0 ? median(validWakeTimes) : null

  const bedtimeStddev = validBedtimes.length > 1 ? stddev(validBedtimes) : null
  const wakeTimeStddev = validWakeTimes.length > 1 ? stddev(validWakeTimes) : null

  // 睡眠时长中位数
  const durations: number[] = []
  for (const dp of dayPoints) {
    if (dp.bedtime !== null && dp.wakeTime !== null) {
      // bedtime 是 normalize 后的，wakeTime 是 raw 的
      let duration = dp.wakeTime - denormalizeBedtime(dp.bedtime)
      if (duration < 0) duration += 24
      if (duration > 0 && duration < 16) durations.push(duration)
    }
  }
  const medianSleepDuration = durations.length > 0 ? median(durations) : null

  // ── 漂移速度 ──
  const bedtimePoints = validBedtimes.map((b, i) => ({ x: i, y: b }))
  const wakePoints = validWakeTimes.map((w, i) => ({ x: i, y: w }))

  const bedtimeDriftMpw = linearSlope(bedtimePoints) // minutes/week
  const wakeDriftMpw = linearSlope(wakePoints)

  // 投影
  let projectedBedtime: number | null = null
  let projectedWakeTime: number | null = null
  if (bedtimeDriftMpw !== null && validBedtimes.length > 0) {
    const projected = validBedtimes[validBedtimes.length - 1] + (bedtimeDriftMpw / 60) * projectWeeks
    projectedBedtime = denormalizeBedtime(projected)
  }
  if (wakeDriftMpw !== null && validWakeTimes.length > 0) {
    projectedWakeTime = validWakeTimes[validWakeTimes.length - 1] + (wakeDriftMpw / 60) * projectWeeks
  }

  // 文字描述
  let direction: 'advancing' | 'delaying' | 'stable' | null = null
  if (bedtimeDriftMpw !== null) {
    direction = bedtimeDriftMpw > 3 ? 'delaying' : bedtimeDriftMpw < -3 ? 'advancing' : 'stable'
  }

  return {
    sleep: {
      medianBedtime,
      medianWakeTime,
      medianSleepDuration,
      bedtimeStddev: bedtimeStddev ?? null,
      wakeTimeStddev: wakeTimeStddev ?? null,
    },
    drift: {
      bedtimeDrift: bedtimeDriftMpw !== null ? Math.round(bedtimeDriftMpw * 10) / 10 : null,
      wakeTimeDrift: wakeDriftMpw !== null ? Math.round(wakeDriftMpw * 10) / 10 : null,
      projectedBedtime,
      projectedWakeTime,
      direction,
    },
    coverage,
    weekCount: Math.ceil(dayCount / 7),
  }
}
