/**
 * # 输入-输出关联分析（Correlation Analysis）
 *
 * 需求二：基于 DailyContext（输入变量）与作息指标（输出指标），
 * 自动分析哪些生活变量与关键作息指标存在显著相关。
 *
 * ## 原则
 *
 * - 可解释优于精确：结果必须可以用一句白话讲清楚
 * - 声明相关性不等于因果
 * - 仅当数据量足够时给出结论（至少每组 3 天）
 */

import type { DailyContext } from './dailyContext'

// ── 类型定义 ────────────────────────────────────────────────────

/** 作息输出指标 */
export type SleepMetric = 'bedtime' | 'wakeTime' | 'sleepDuration'

/** 生活上下文输入变量 */
export type ContextVariable =
  | 'lastMealTime'
  | 'lastMealType'
  | 'socialIntensity'
  | 'outdoorMinutes'
  | 'exerciseIntensity'
  | 'mood'
  | 'screenHours'

/** 变量标签（中文） */
export const VARIABLE_LABELS_ZH: Record<ContextVariable, string> = {
  lastMealTime: '最后一餐时间',
  lastMealType: '餐食类型',
  socialIntensity: '社交强度',
  outdoorMinutes: '户外时长',
  exerciseIntensity: '运动强度',
  mood: '情绪基调',
  screenHours: '屏幕时间',
}

export const VARIABLE_LABELS_EN: Record<ContextVariable, string> = {
  lastMealTime: 'Last meal time',
  lastMealType: 'Meal type',
  socialIntensity: 'Social intensity',
  outdoorMinutes: 'Outdoor time',
  exerciseIntensity: 'Exercise intensity',
  mood: 'Mood',
  screenHours: 'Screen time',
}

/** 一条关联洞察 */
export interface Insight {
  /** 输入变量 */
  variable: ContextVariable
  /** 输出指标 */
  metric: SleepMetric
  /** 分组的均值差异 */
  difference: number
  /** 差异描述（如"就寝时间推迟了 34 分钟"） */
  description: string
  /** 高值组的均值 */
  highGroupMean: number
  /** 低值组的均值 */
  lowGroupMean: number
  /** 高值组的天数 */
  highGroupCount: number
  /** 低值组的天数 */
  lowGroupCount: number
  /** 建议方向 */
  suggestion?: string
}

/** 分析报告 */
export interface CorrelationReport {
  insights: Insight[]
  /** 分析覆盖的天数 */
  totalDays: number
  /** 数据充足的天数（有 DailyContext 的天数） */
  contextDays: number
}

// ── 数据点结构 ──────────────────────────────────────────────────

export interface DailyDataPoint {
  context: DailyContext
  /** 当天就寝时间（本地浮点小时，跨午夜归一化），如 23.5 = 23:30，次日 1:00 = 25 */
  bedtimeHour: number | null
  /** 当天起床时间（本地浮点小时），如 7.25 = 07:15 */
  wakeHour: number | null
  /** 睡眠时长（小时） */
  sleepDuration: number | null
}

// ── 工具函数 ────────────────────────────────────────────────────

/**
 * 从 DailyContext + 作息数据构建 DailyDataPoint。
 * bedtimeHour 和 wakeHour 需由调用方根据事件数据提供。
 */
export function buildDataPoint(
  context: DailyContext,
  bedtimeHour: number | null,
  wakeHour: number | null,
): DailyDataPoint {
  let sleepDuration: number | null = null
  if (bedtimeHour !== null && wakeHour !== null) {
    // bedtime 已归一化（跨午夜 +24），wake 是原始小时
    let dur = wakeHour - (bedtimeHour >= 24 ? bedtimeHour - 24 : bedtimeHour)
    if (dur < 0) dur += 24
    if (dur > 0 && dur < 16) sleepDuration = Math.round(dur * 10) / 10
  }
  return { context, bedtimeHour, wakeHour, sleepDuration }
}

/** 均值 */
function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

// ── 分组对比分析 ────────────────────────────────────────────────

/**
 * 将一个连续变量在中间值处二分，对比高值组与低值组的作息的均值。
 *
 * @param points    所有数据点
 * @param getValue  从 context 中提取变量值（必须返回有效数字）
 * @param threshold 分组阈值（默认中位数）
 * @returns 高值组和低值组的均值
 */
function splitByThreshold(
  points: DailyDataPoint[],
  getValue: (ctx: DailyContext) => number | undefined,
  metricGetter: (p: DailyDataPoint) => number | null,
  threshold?: number,
): {
  highValues: number[]
  lowValues: number[]
  highMean: number | null
  lowMean: number | null
  threshold: number
} {
  const available = points.filter(
    (p) => getValue(p.context) !== undefined && metricGetter(p) !== null,
  ) as Array<DailyDataPoint & { _val: number; _metric: number }>

  const vals = available
    .map((p) => ({ p, v: getValue(p.context)! }))
    .filter(({ v }) => v !== undefined && !isNaN(v))

  if (vals.length < 4) {
    return { highValues: [], lowValues: [], highMean: null, lowMean: null, threshold: threshold ?? 0 }
  }

  const numericValues = vals.map((v) => v.v)
  const actualThreshold = threshold ?? median(numericValues)

  const highVal = vals.filter(({ v }) => v >= actualThreshold)
  const lowVal = vals.filter(({ v }) => v < actualThreshold)

  if (highVal.length < 2 || lowVal.length < 2) {
    return { highValues: [], lowValues: [], highMean: null, lowMean: null, threshold: actualThreshold }
  }

  const highMetrics = highVal
    .map(({ p }) => metricGetter(p))
    .filter((m): m is number => m !== null)
  const lowMetrics = lowVal
    .map(({ p }) => metricGetter(p))
    .filter((m): m is number => m !== null)

  return {
    highValues: highMetrics,
    lowValues: lowMetrics,
    highMean: mean(highMetrics),
    lowMean: mean(lowMetrics),
    threshold: actualThreshold,
  }
}

/** 中位数 */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ── 变量提取器 ──────────────────────────────────────────────────

const VARIABLE_GETTERS: Record<ContextVariable, (ctx: DailyContext) => number | undefined> = {
  lastMealTime: (ctx) => {
    // 将最后一餐时间转为本地浮点小时
    if (!ctx.lastMealTime) return undefined
    const d = new Date(ctx.lastMealTime)
    return d.getHours() + d.getMinutes() / 60
  },
  lastMealType: (ctx) => ctx.lastMealType ? 1 : 0, // 有/无标注餐食类型
  socialIntensity: (ctx) => ctx.socialIntensity,
  outdoorMinutes: (ctx) => ctx.outdoorMinutes,
  exerciseIntensity: (ctx) => ctx.exerciseIntensity,
  mood: (ctx) => ctx.mood,
  screenHours: (ctx) => ctx.screenHours,
}

const METRIC_GETTERS: Record<SleepMetric, (p: DailyDataPoint) => number | null> = {
  bedtime: (p) => p.bedtimeHour,
  wakeTime: (p) => p.wakeHour,
  sleepDuration: (p) => p.sleepDuration,
}

// ── 主分析函数 ──────────────────────────────────────────────────

/**
 * 对所有变量 × 指标组合执行分组对比分析。
 * 仅返回差异显著的洞察（|差值| >= 最小阈值）。
 *
 * @param points  每日数据点
 * @param minDiff 最小差异阈值（分钟），默认 15 分钟
 */
export function analyzeCorrelations(
  points: DailyDataPoint[],
  minDiff = 15,
): CorrelationReport {
  const variables: ContextVariable[] = [
    'lastMealTime',
    'lastMealType',
    'socialIntensity',
    'outdoorMinutes',
    'exerciseIntensity',
    'mood',
    'screenHours',
  ]

  const metrics: SleepMetric[] = ['bedtime', 'wakeTime', 'sleepDuration']

  const insights: Insight[] = []

  for (const variable of variables) {
    for (const metric of metrics) {
      const getter = (ctx: DailyContext) => VARIABLE_GETTERS[variable](ctx)
      const metricGetter = (p: DailyDataPoint) => METRIC_GETTERS[metric](p)

      const result = splitByThreshold(points, getter, metricGetter)

      if (result.highMean === null || result.lowMean === null) continue

      const diff = result.highMean - result.lowMean
      const diffMinutes = Math.round(Math.abs(diff) * 60)
      if (diffMinutes < minDiff) continue

      const higherFirst = diff > 0
      const groupLabel = (variable: ContextVariable): string => {
        // 对于 ordinal 变量，标记高低
        if (['socialIntensity', 'exerciseIntensity', 'mood', 'screenHours'].includes(variable)) {
          return higherFirst ? t('较高', 'High') : t('较低', 'Low')
        }
        if (variable === 'lastMealTime') {
          return higherFirst ? t('较晚', 'Late') : t('较早', 'Early')
        }
        if (variable === 'outdoorMinutes') {
          return higherFirst ? t('较多', 'More') : t('较少', 'Less')
        }
        return higherFirst ? t('有', 'Yes') : t('无', 'No')
      }

      const metricLabel = (m: SleepMetric): string => {
        switch (m) {
          case 'bedtime': return t('就寝时间', 'bedtime')
          case 'wakeTime': return t('起床时间', 'wake time')
          case 'sleepDuration': return t('睡眠时长', 'sleep duration')
        }
      }

      const directionLabel = (diff: number, metric: SleepMetric): string => {
        if (metric === 'sleepDuration') {
          return diff > 0 ? t('增加', 'increased') : t('减少', 'decreased')
        }
        // bedtime/wakeTime: positive diff = later
        return diff > 0 ? t('推迟', 'later') : t('提前', 'earlier')
      }

      const description = `${t(
        `${groupLabel(variable)}${variable === 'lastMealType' ? '标注餐食' : ''}`,
        '',
      )}: ${metricLabel(metric)} ${directionLabel(diff, metric)} ${diffMinutes}${t('分钟', 'min')}`

      const suggestion = generateSuggestion(variable, metric, diff)

      insights.push({
        variable,
        metric,
        difference: Math.round(diff * 10) / 10,
        description,
        highGroupMean: Math.round(result.highMean * 10) / 10,
        lowGroupMean: Math.round(result.lowMean * 10) / 10,
        highGroupCount: result.highValues.length,
        lowGroupCount: result.lowValues.length,
        suggestion,
      })
    }
  }

  // 按差异绝对值排序
  insights.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))

  const uniqueDays = new Set(points.map((p) => p.context.date)).size

  return {
    insights,
    totalDays: uniqueDays,
    contextDays: points.length,
  }
}

// ── 建议生成 ────────────────────────────────────────────────────

function generateSuggestion(
  variable: ContextVariable,
  _metric: SleepMetric,
  diff: number,
): string | undefined {
  // 只为差值 >= 30 分钟且影响方向明确的变量生成建议
  if (Math.abs(diff * 60) < 30) return undefined

  const zhHints: Record<ContextVariable, string> = {
    lastMealTime: '尝试将最后一餐时间提前/推后 1 小时，观察作息变化',
    lastMealType: '尝试调整餐食类型，观察对睡眠的影响',
    socialIntensity: '高社交日之后增加独处缓冲时间',
    outdoorMinutes: '尝试增加户外时间，观察作息变化',
    exerciseIntensity: '调整运动强度和时间段，观察对睡眠的影响',
    mood: '情绪波动日留意就寝前的放松活动',
    screenHours: '尝试睡前 1 小时减少屏幕使用',
  }

  return zhHints[variable]
}

// ── 辅助 ────────────────────────────────────────────────────────

/** 中英文字符串（简化内联 i18n） */
function t(zh: string, _en: string): string {
  return zh // Default to Chinese for now; the actual language is passed at the UI layer
}

/**
 * 将分析报告转为自然语言洞察卡片文本。
 *
 * @param report  分析报告
 * @param language 语言
 * @returns 洞察文本数组，每条一条
 */
export function formatInsights(
  report: CorrelationReport,
  language: 'zh' | 'en',
): string[] {
  if (report.insights.length === 0) {
    return language === 'zh'
      ? ['目前数据不足以发现显著关联，请坚持记录每日上下文后再来看。']
      : ['Not enough data to find significant correlations yet. Keep logging daily context.']
  }

  const lines: string[] = []

  if (language === 'zh') {
    lines.push(`基于 ${report.contextDays} 天的数据分析，发现以下关联趋势：`)
    lines.push('')
    lines.push('> ⚠️ 相关性不等于因果。以下观察仅供参考。')
    lines.push('')
  } else {
    lines.push(`Based on ${report.contextDays} days of data, these trends emerged:`)
    lines.push('')
    lines.push('> ⚠️ Correlation ≠ causation. These are observations, not conclusions.')
    lines.push('')
  }

  // 最多显示 5 条最显著的洞察
  const topInsights = report.insights.slice(0, 5)

  for (const insight of topInsights) {
    lines.push(`- **${insight.description}**`)
    if (insight.suggestion) {
      lines.push(`  💡 ${insight.suggestion}`)
    }
  }

  return lines
}
