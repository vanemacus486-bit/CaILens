/**
 * # 稳态指标（Steady Metrics）
 *
 * 替代旧的"连续天数"冲刺型指标体系。
 * 所有指标围绕"长期规律性"设计——允许偶发漏记与波动。
 *
 * ## 指标列表
 *
 * | 指标 | 含义 | 理想值方向 |
 * |------|------|------------|
 * | 覆盖率 | 统计周期内有记录的天数占比 | 越高越好 |
 * | 均值 | 关键指标（如睡眠时长）的周期均值 | 与目标一致 |
 * | 中位数 | 抗离群值的中心趋势 | 与均值接近 → 分布对称 |
 * | 标准差 | 波动幅度 | 越小越好 |
 * | 漂移速度 | 作息随时间滑动的速率（分钟/周） | 越接近 0 越好 |
 * | 漂移方向 | 推迟/提前/稳定 | 可观测即可 |
 * | 一致性指数 | 0-1, 综合反映规律性 | 越高越好 |
 */

import type { CalendarEvent } from './event'

// ── 核心类型 ──────────────────────────────────────────────

/** 漂移方向 */
export type DriftDirection = 'advancing' | 'delaying' | 'stable'

/** 睡眠稳态指标 */
export interface SleepSteadyMetrics {
  /** 统计周期天数 */
  periodDays: number
  /** 有睡眠记录的天数 */
  recordedDays: number
  /** 睡眠记录覆盖率（recordedDays / periodDays） */
  coverage: number
  /** 就寝时间均值（24h 小数） */
  meanBedtime: number
  /** 就寝时间中位数（24h 小数） */
  medianBedtime: number
  /** 就寝时间标准差（小时） */
  stdBedtime: number
  /** 起床时间均值（24h 小数） */
  meanWakeTime: number
  /** 起床时间中位数（24h 小数） */
  medianWakeTime: number
  /** 起床时间标准差（小时） */
  stdWakeTime: number
  /** 睡眠时长均值（小时） */
  meanDuration: number
  /** 睡眠时长中位数（小时） */
  medianDuration: number
  /** 睡眠时长标准差（小时） */
  stdDuration: number
  /** 漂移速度（分钟/周，正值=推迟，负值=提前） */
  driftSpeed: number
  /** 漂移方向 */
  driftDirection: DriftDirection
  /** 一致性指数 0-1 */
  consistencyIndex: number
}

/** 类别投入稳态指标 */
export interface CategorySteadyMetrics {
  categoryId: string
  /** 周均投入时间（小时） */
  weeklyMean: number
  /** 周投入标准差（小时） */
  weeklyStd: number
  /** 覆盖率：有投入的周数 / 总周数 */
  coverage: number
  /** 预算贴合度：weeklyMean / weeklyBudget （1 = 完美） */
  budgetAdherence: number
}

// ── 中位数辅助 ──────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function stddev(values: number[], meanVal: number): number {
  if (values.length === 0) return 0
  const sqSum = values.reduce((s, v) => s + (v - meanVal) * (v - meanVal), 0)
  return Math.sqrt(sqSum / values.length)
}

// ── 睡眠稳态计算 ─────────────────────────────────────────

/**
 * 从事件列表中提取主睡眠记录列表。
 * 主睡眠：categoryId === 'stone'，时长 ≥ 3h，非小睡。
 */
export function extractSleepNights(
  events: readonly CalendarEvent[],
  rangeStart: number,
  rangeEnd: number,
): Array<{ date: string; bedtime: number; wakeTime: number; duration: number }> {
  const result: Array<{ date: string; bedtime: number; wakeTime: number; duration: number }> = []
  const seen = new Set<number>() // dedup by night key (local midnight)

  for (const e of events) {
    if (e.categoryId !== 'stone') continue
    if (e.endTime - e.startTime < 3 * 3_600_000) continue
    if (e.startTime < rangeStart || e.startTime >= rangeEnd) continue
    if (e.typedData?.type === 'sleep' && e.typedData.sleepType === 'nap') continue

    const d = new Date(e.startTime)
    const nightKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    if (seen.has(nightKey)) continue
    seen.add(nightKey)

    const bedtime = d.getHours() + d.getMinutes() / 60
    const wd = new Date(e.endTime)
    const wakeTime = wd.getHours() + wd.getMinutes() / 60
    const duration = wakeTime > bedtime ? wakeTime - bedtime : wakeTime + 24 - bedtime

    result.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      bedtime,
      wakeTime,
      duration,
    })
  }

  return result
}

/**
 * 计算最近 N 天的睡眠稳态指标。
 *
 * @param nights 睡眠记录列表
 * @param periodDays 统计周期天数
 * @returns SleepSteadyMetrics
 */
export function computeSleepSteadyMetrics(
  nights: ReadonlyArray<{ bedtime: number; wakeTime: number; duration: number }>,
  periodDays: number,
): SleepSteadyMetrics {
  const n = nights.length

  if (n === 0) {
    return {
      periodDays,
      recordedDays: 0,
      coverage: 0,
      meanBedtime: 0,
      medianBedtime: 0,
      stdBedtime: 0,
      meanWakeTime: 0,
      medianWakeTime: 0,
      stdWakeTime: 0,
      meanDuration: 0,
      medianDuration: 0,
      stdDuration: 0,
      driftSpeed: 0,
      driftDirection: 'stable',
      consistencyIndex: 0,
    }
  }

  const bedtimes = nights.map((n) => n.bedtime)
  const wakeTimes = nights.map((n) => n.wakeTime)
  const durations = nights.map((n) => n.duration)

  const meanBedtime = mean(bedtimes)
  const meanWakeTime = mean(wakeTimes)
  const meanDuration = mean(durations)

  // 漂移速度：最近 7 天均值 vs 更早 7 天均值（若数据充足）
  let driftSpeed = 0
  if (n >= 14) {
    const recent7 = mean(bedtimes.slice(-7))
    const earlier7 = mean(bedtimes.slice(-14, -7))
    driftSpeed = (recent7 - earlier7) * (60 / 7) // 分钟/周（正值=推迟）
  }

  let driftDirection: DriftDirection = 'stable'
  if (driftSpeed > 5) driftDirection = 'delaying'
  else if (driftSpeed < -5) driftDirection = 'advancing'

  // 一致性指数：综合标准差 + 覆盖率
  const stdBedtimeVal = stddev(bedtimes, meanBedtime)
  const stdDurationVal = stddev(durations, meanDuration)
  const stdWakeVal = stddev(wakeTimes, meanWakeTime)
  const coverage = periodDays > 0 ? n / periodDays : 0

  // 归一化：假设合理标准差上限为 2h，超过 2h 一致性为 0
  const bedtimeConsistency = Math.max(0, 1 - stdBedtimeVal / 2)
  const durationConsistency = Math.max(0, 1 - stdDurationVal / 2)
  const wakeConsistency = Math.max(0, 1 - stdWakeVal / 2)
  const coverageFactor = coverage
  const consistencyIndex = Math.round((bedtimeConsistency * 0.35 + durationConsistency * 0.35 + wakeConsistency * 0.2 + coverageFactor * 0.1) * 100) / 100

  return {
    periodDays,
    recordedDays: n,
    coverage: Math.round(coverage * 100) / 100,
    meanBedtime: Math.round(meanBedtime * 100) / 100,
    medianBedtime: median(bedtimes),
    stdBedtime: Math.round(stdBedtimeVal * 100) / 100,
    meanWakeTime: Math.round(meanWakeTime * 100) / 100,
    medianWakeTime: median(wakeTimes),
    stdWakeTime: Math.round(stdWakeVal * 100) / 100,
    meanDuration: Math.round(meanDuration * 100) / 100,
    medianDuration: median(durations),
    stdDuration: Math.round(stdDurationVal * 100) / 100,
    driftSpeed: Math.round(driftSpeed * 100) / 100,
    driftDirection,
    consistencyIndex,
  }
}
