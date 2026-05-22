/**
 * # 关联分析（Correlation Analysis）
 *
 * 朴素关联分析引擎。不依赖统计模型，采用分层对比法：
 * 将数据按条件分为两组（如"摄入咖啡因的日子" vs "未摄入的日子"），
 * 比较两组的关键作息指标均值差异。
 *
 * 设计原则：
 * - 可解释：每个结论都可以用一句话说清楚
 * - 声明：相关性 ≠ 因果
 * - 朴素：宁可方法简单也不要黑箱
 */

import type { CalendarEvent } from './event'
import { isMealData } from './event'

// ── 类型 ──────────────────────────────────────────────────

export interface ComparisonResult {
  /** 变量名称 */
  variableName: string
  variableNameZh: string
  /** 分组描述 */
  groupALabel: string
  groupBLabel: string
  /** A 组样本量 */
  groupAN: number
  /** B 组样本量 */
  groupBN: number
  /** A 组均值描述 */
  groupAValue: string
  /** B 组均值描述 */
  groupBValue: string
  /** 差异描述 */
  difference: string
  /** 差异大小（小时或分钟） */
  diffHours: number | null
  /** 结论强度：'strong' | 'moderate' | 'weak' | 'none' */
  strength: 'strong' | 'moderate' | 'weak' | 'none'
  /** 建议文案 */
  suggestion: string
  suggestionZh: string
}

export interface CorrelationResult {
  comparisons: ComparisonResult[]
}

// ── 睡眠辅助 ──────────────────────────────────────────────

interface NightInfo {
  date: string
  bedtime: number   // 24h 小数
  wakeTime: number  // 24h 小数
  duration: number  // 小时
}

function extractNights(
  events: readonly CalendarEvent[],
  rangeStart: number,
  rangeEnd: number,
): NightInfo[] {
  const byNight = new Map<string, NightInfo>()

  for (const e of events) {
    if (e.categoryId !== 'stone') continue
    if (e.endTime - e.startTime < 3 * 3_600_000) continue
    if (e.startTime < rangeStart || e.startTime >= rangeEnd) continue
    if (e.typedData?.type === 'sleep' && e.typedData.sleepType === 'nap') continue

    const d = new Date(e.startTime)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (byNight.has(dateStr)) continue

    const bedtime = d.getHours() + d.getMinutes() / 60
    const wd = new Date(e.endTime)
    const wakeTime = wd.getHours() + wd.getMinutes() / 60
    const duration = wakeTime > bedtime ? wakeTime - bedtime : wakeTime + 24 - bedtime

    byNight.set(dateStr, { date: dateStr, bedtime, wakeTime, duration })
  }

  return Array.from(byNight.values())
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((s, v) => s + v, 0) / nums.length
}

function fmtHour(h: number): string {
  const hr = Math.floor(h)
  const mi = Math.round((h - hr) * 60)
  return `${String(hr).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

// ── 1. 咖啡因 vs 就寝时间 ───────────────────────────────

function compareCaffeineBedtime(
  events: readonly CalendarEvent[],
  nights: NightInfo[],
): ComparisonResult | null {
  const nightMap = new Map(nights.map((n) => [n.date, n]))
  const caffeineBedtimes: number[] = []
  const noCaffeineBedtimes: number[] = []

  for (const e of events) {
    if (!e.typedData || !isMealData(e.typedData)) continue
    if (!e.typedData.foodTags.includes('caffeine')) continue

    const d = new Date(e.startTime)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const night = nightMap.get(dateStr)
    if (night) caffeineBedtimes.push(night.bedtime)
  }

  // 无咖啡因日：所有夜晚排除有咖啡因的日子
  const caffeineDates = new Set(
    events
      .filter((e) => e.typedData && isMealData(e.typedData) && e.typedData.foodTags.includes('caffeine'))
      .map((e) => {
        const d = new Date(e.startTime)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }),
  )

  for (const night of nights) {
    if (!caffeineDates.has(night.date)) {
      noCaffeineBedtimes.push(night.bedtime)
    }
  }

  if (caffeineBedtimes.length < 3 || noCaffeineBedtimes.length < 3) return null

  const avgCaffeine = mean(caffeineBedtimes)
  const avgNoCaffeine = mean(noCaffeineBedtimes)
  const diff = avgCaffeine - avgNoCaffeine

  const strength: ComparisonResult['strength'] =
    Math.abs(diff) > 0.75 ? 'strong'
    : Math.abs(diff) > 0.33 ? 'moderate'
    : Math.abs(diff) > 0.1 ? 'weak'
    : 'none'

  return {
    variableName: 'Caffeine Intake',
    variableNameZh: '咖啡因摄入',
    groupALabel: '有咖啡因摄入的日子',
    groupBLabel: '无咖啡因摄入的日子',
    groupAN: caffeineBedtimes.length,
    groupBN: noCaffeineBedtimes.length,
    groupAValue: `就寝 ${fmtHour(avgCaffeine)}`,
    groupBValue: `就寝 ${fmtHour(avgNoCaffeine)}`,
    difference: diff > 0
      ? `咖啡因日就寝平均推迟 ${(diff * 60).toFixed(0)} 分钟`
      : `咖啡因日就寝平均提前 ${(Math.abs(diff) * 60).toFixed(0)} 分钟`,
    diffHours: diff,
    strength,
    suggestion: diff > 0.5
      ? '建议减少下午/晚间咖啡因摄入，观察就寝时间变化。'
      : '咖啡因摄入对就寝时间影响不大，继续保持。',
    suggestionZh: diff > 0.5
      ? '建议减少下午/晚间咖啡因摄入，观察就寝时间变化。'
      : '咖啡因摄入对就寝时间影响不大，继续保持。',
  }
}

// ── 2. 糖分 vs 睡眠时长 ─────────────────────────────────

function compareSugarDuration(
  events: readonly CalendarEvent[],
  nights: NightInfo[],
): ComparisonResult | null {
  const nightMap = new Map(nights.map((n) => [n.date, n]))
  const sugarDurations: number[] = []
  const noSugarDurations: number[] = []

  for (const e of events) {
    if (!e.typedData || !isMealData(e.typedData)) continue
    if (!e.typedData.foodTags.includes('sugar')) continue

    const d = new Date(e.startTime)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const night = nightMap.get(dateStr)
    if (night) sugarDurations.push(night.duration)
  }

  const sugarDates = new Set(
    events
      .filter((e) => e.typedData && isMealData(e.typedData) && e.typedData.foodTags.includes('sugar'))
      .map((e) => {
        const d = new Date(e.startTime)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }),
  )

  for (const night of nights) {
    if (!sugarDates.has(night.date)) {
      noSugarDurations.push(night.duration)
    }
  }

  if (sugarDurations.length < 3 || noSugarDurations.length < 3) return null

  const avgSugar = mean(sugarDurations)
  const avgNoSugar = mean(noSugarDurations)
  const diff = avgSugar - avgNoSugar

  const strength: ComparisonResult['strength'] =
    Math.abs(diff) > 0.75 ? 'strong'
    : Math.abs(diff) > 0.33 ? 'moderate'
    : Math.abs(diff) > 0.1 ? 'weak'
    : 'none'

  return {
    variableName: 'Sugar Intake',
    variableNameZh: '糖分摄入',
    groupALabel: '有糖分摄入的日子',
    groupBLabel: '无糖分摄入的日子',
    groupAN: sugarDurations.length,
    groupBN: noSugarDurations.length,
    groupAValue: `睡眠 ${avgSugar.toFixed(1)}h`,
    groupBValue: `睡眠 ${avgNoSugar.toFixed(1)}h`,
    difference: diff > 0
      ? `糖分日睡眠多 ${diff.toFixed(1)}h`
      : `糖分日睡眠少 ${(Math.abs(diff)).toFixed(1)}h`,
    diffHours: diff,
    strength,
    suggestion: Math.abs(diff) > 0.3
      ? '糖分摄入与睡眠时长有关联，建议留意。'
      : '糖分摄入对睡眠时长影响不大。',
    suggestionZh: Math.abs(diff) > 0.3
      ? '糖分摄入与睡眠时长有关联，建议留意。'
      : '糖分摄入对睡眠时长影响不大。',
  }
}

// ── 3. 宵夜 vs 就寝时间 ─────────────────────────────────

function compareNightSnackBedtime(
  events: readonly CalendarEvent[],
  nights: NightInfo[],
): ComparisonResult | null {
  const nightMap = new Map(nights.map((n) => [n.date, n]))
  const snackBedtimes: number[] = []
  const noSnackBedtimes: number[] = []

  for (const e of events) {
    if (!e.typedData || !isMealData(e.typedData)) continue
    if (e.typedData.mealOrder !== 'night_snack') continue

    const d = new Date(e.startTime)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const night = nightMap.get(dateStr)
    if (night) snackBedtimes.push(night.bedtime)
  }

  const snackDates = new Set(
    events
      .filter((e) => e.typedData && isMealData(e.typedData) && e.typedData.mealOrder === 'night_snack')
      .map((e) => {
        const d = new Date(e.startTime)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }),
  )

  for (const night of nights) {
    if (!snackDates.has(night.date)) {
      noSnackBedtimes.push(night.bedtime)
    }
  }

  if (snackBedtimes.length < 2 || noSnackBedtimes.length < 3) return null

  const avgSnack = mean(snackBedtimes)
  const avgNoSnack = mean(noSnackBedtimes)
  const diff = avgSnack - avgNoSnack

  const strength: ComparisonResult['strength'] =
    Math.abs(diff) > 0.75 ? 'strong'
    : Math.abs(diff) > 0.33 ? 'moderate'
    : Math.abs(diff) > 0.1 ? 'weak'
    : 'none'

  return {
    variableName: 'Late Night Eating',
    variableNameZh: '宵夜',
    groupALabel: '吃宵夜的日子',
    groupBLabel: '不吃宵夜的日子',
    groupAN: snackBedtimes.length,
    groupBN: noSnackBedtimes.length,
    groupAValue: `就寝 ${fmtHour(avgSnack)}`,
    groupBValue: `就寝 ${fmtHour(avgNoSnack)}`,
    difference: diff > 0
      ? `宵夜日就寝平均推迟 ${(diff * 60).toFixed(0)} 分钟`
      : `关联方向不一致`,
    diffHours: diff,
    strength,
    suggestion: diff > 0.5
      ? '宵夜与就寝延迟存在关联，建议尝试减少宵夜频率。'
      : '宵夜对就寝时间影响不大。',
    suggestionZh: diff > 0.5
      ? '宵夜与就寝延迟存在关联，建议尝试减少宵夜频率。'
      : '宵夜对就寝时间影响不大。',
  }
}

// ── 4. 卫生分数 vs 次日起床时间 ─────────────────────────

function compareHygieneWakeTime(
  hygieneRecords: ReadonlyArray<{ date: string; score: number }>,
  nights: NightInfo[],
): ComparisonResult | null {
  const nightMap = new Map(nights.map((n) => [n.date, n]))
  const highHygieneWakes: number[] = []
  const lowHygieneWakes: number[] = []

  for (const h of hygieneRecords) {
    const night = nightMap.get(h.date)
    if (!night) continue

    if (h.score >= 50) {
      highHygieneWakes.push(night.wakeTime)
    } else {
      lowHygieneWakes.push(night.wakeTime)
    }
  }

  if (highHygieneWakes.length < 3 || lowHygieneWakes.length < 3) return null

  const avgHigh = mean(highHygieneWakes)
  const avgLow = mean(lowHygieneWakes)
  const diff = avgHigh - avgLow

  const strength: ComparisonResult['strength'] =
    Math.abs(diff) > 0.75 ? 'strong'
    : Math.abs(diff) > 0.33 ? 'moderate'
    : Math.abs(diff) > 0.1 ? 'weak'
    : 'none'

  return {
    variableName: 'Hygiene Score',
    variableNameZh: '卫生分数',
    groupALabel: '卫生分 ≥ 50 的日子',
    groupBLabel: '卫生分 < 50 的日子',
    groupAN: highHygieneWakes.length,
    groupBN: lowHygieneWakes.length,
    groupAValue: `次日起床 ${fmtHour(avgHigh)}`,
    groupBValue: `次日起床 ${fmtHour(avgLow)}`,
    difference: Math.abs(diff) < 0.1
      ? '卫生分数与次日起床时间无显著关联'
      : diff > 0
        ? '卫生高分日起床略晚'
        : '卫生高分日起床略早',
    diffHours: diff,
    strength,
    suggestion: '卫生习惯是整体生活规律的信号，建议保持。',
    suggestionZh: '卫生习惯是整体生活规律的信号，建议保持。',
  }
}

// ── 主入口 ────────────────────────────────────────────────

/**
 * 运行关联分析，返回所有可计算的对比洞察。
 */
export function runCorrelation(
  events: readonly CalendarEvent[],
  hygieneRecords: ReadonlyArray<{ date: string; score: number }>,
  periodDays = 30,
): CorrelationResult {
  const now = Date.now()
  const rangeStart = now - periodDays * 24 * 60 * 60_000
  const nights = extractNights(events, rangeStart, now)

  const comparisons: ComparisonResult[] = []

  // 1. 咖啡因 vs 就寝
  const caffeineResult = compareCaffeineBedtime(events, nights)
  if (caffeineResult) comparisons.push(caffeineResult)

  // 2. 糖分 vs 睡眠时长
  const sugarResult = compareSugarDuration(events, nights)
  if (sugarResult) comparisons.push(sugarResult)

  // 3. 宵夜 vs 就寝
  const snackResult = compareNightSnackBedtime(events, nights)
  if (snackResult) comparisons.push(snackResult)

  // 4. 卫生 vs 起床
  const hygieneResult = compareHygieneWakeTime(hygieneRecords, nights)
  if (hygieneResult) comparisons.push(hygieneResult)

  return { comparisons }
}
