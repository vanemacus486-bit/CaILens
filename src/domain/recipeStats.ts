/**
 * # 食谱统计（Recipe Stats）
 *
 * 基于 90 天 Meal 类型化事件的数据聚合。
 * 所有聚合从 typedData 就地计算，不依赖持久化中间结果。
 */

import type { CalendarEvent, MealTag, MealOrder, MealSource } from './event'
import { isMealData } from './event'
import { MEAL_TAG_OPTIONS } from './event'
import type { DateRange } from './dateRange'

// ── 输出类型 ────────────────────────────────────────────────

export interface RecipeStats {
  /** 分析覆盖的天数 */
  dayCount: number
  /** 有 Meal 记录的天数 */
  daysWithMeals: number
  /** 总 Meal 事件数 */
  totalMeals: number

  /** 各食物标签出现次数 */
  tagFrequency: Record<MealTag, number>
  /** 各餐次的事件数 */
  mealOrderDistribution: Record<MealOrder, number>
  /** 各来源的事件数 */
  sourceDistribution: Record<MealSource, number>

  /** 蛋白质达标率：包含 protein 标签的天数 / 有 Meal 记录的天数 */
  proteinRate: number
  /** 咖啡因摄入率：有 caffeine 标签的天数 / 有 Meal 记录的天数 */
  caffeineRate: number
  /** 糖分摄入率 */
  sugarRate: number
  /** 酒精摄入率 */
  alcoholRate: number

  /** 每周外卖次数（用于趋势折线） */
  weeklyTakeoutCounts: WeeklyCount[]
  /** 每周总 Meal 次数（用于对比） */
  weeklyMealCounts: WeeklyCount[]

  /** 咖啡因出现最多的餐次 */
  topCaffeineMealOrder: MealOrder | null
  /** 最常选择的外卖餐次 */
  topTakeoutMealOrder: MealOrder | null
}

export interface WeeklyCount {
  weekLabel: string   // 如 "3/10" 或 "W12"
  count: number
}

// ── 周标识 ──────────────────────────────────────────────────

function weekLabel(ts: number): string {
  const d = new Date(ts)
  // Find Monday of that week
  const dayOfWeek = d.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset)
  return `${monday.getMonth() + 1}/${String(monday.getDate()).padStart(2, '0')}`
}

// ── 天数标识 ────────────────────────────────────────────────

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// ── 主聚合函数 ──────────────────────────────────────────────

/**
 * 从指定时间范围内的事件中聚合食谱统计。
 *
 * @param events  时间范围内的事件（会被过滤出 Meal 事件）
 * @param rangeStart  范围起始 UTC ms
 * @param rangeEnd    范围结束 UTC ms
 */
export function computeRecipeStats(
  events: readonly CalendarEvent[],
  range: DateRange,
): RecipeStats {
  const dayCount = Math.max(1, Math.round((range.end - range.start) / 86_400_000))

  // 过滤出 Meal 事件
  const mealEvents = events.filter(
    (e) => e.typedData?.type === 'meal' && e.startTime >= range.start && e.startTime < range.end,
  )

  const totalMeals = mealEvents.length

  // 按天去重
  const mealDays = new Set<string>()
  for (const e of mealEvents) {
    mealDays.add(dayKey(e.startTime))
  }
  const daysWithMeals = mealDays.size

  // 标签频率
  const tagFrequency: Record<MealTag, number> = {} as Record<MealTag, number>
  for (const tag of MEAL_TAG_OPTIONS) tagFrequency[tag] = 0

  const mealOrderDistribution: Record<MealOrder, number> = {
    breakfast: 0, lunch: 0, dinner: 0, night_snack: 0,
  }
  const sourceDistribution: Record<MealSource, number> = {
    home: 0, takeout: 0, dine_in: 0, convenience: 0,
  }

  // 含特定标签的天数
  const daysWithProtein = new Set<string>()
  const daysWithCaffeine = new Set<string>()
  const daysWithSugar = new Set<string>()
  const daysWithAlcohol = new Set<string>()

  // 每周统计
  const takeoutByWeek = new Map<string, number>()
  const mealByWeek = new Map<string, number>()

  // 咖啡因的餐次计数
  const caffeineByMealOrder: Record<MealOrder, number> = {
    breakfast: 0, lunch: 0, dinner: 0, night_snack: 0,
  }
  // 外卖的餐次计数
  const takeoutByMealOrder: Record<MealOrder, number> = {
    breakfast: 0, lunch: 0, dinner: 0, night_snack: 0,
  }

  for (const e of mealEvents) {
    const data = e.typedData
    if (!data || !isMealData(data)) continue

    const dk = dayKey(e.startTime)
    const wk = weekLabel(e.startTime)

    // 餐次分布
    mealOrderDistribution[data.mealOrder]++

    // 来源分布
    sourceDistribution[data.source]++

    // 标签频率
    for (const tag of data.foodTags) {
      tagFrequency[tag]++
    }

    // 含特定标签的天数
    if (data.foodTags.includes('protein')) daysWithProtein.add(dk)
    if (data.foodTags.includes('caffeine')) {
      daysWithCaffeine.add(dk)
      caffeineByMealOrder[data.mealOrder]++
    }
    if (data.foodTags.includes('sugar')) daysWithSugar.add(dk)
    if (data.foodTags.includes('alcohol')) daysWithAlcohol.add(dk)

    // 外卖统计
    if (data.source === 'takeout') {
      takeoutByWeek.set(wk, (takeoutByWeek.get(wk) ?? 0) + 1)
      takeoutByMealOrder[data.mealOrder]++
    }

    // 每周总餐数
    mealByWeek.set(wk, (mealByWeek.get(wk) ?? 0) + 1)
  }

  // 计算率
  const proteinRate = daysWithMeals > 0 ? daysWithProtein.size / daysWithMeals : 0
  const caffeineRate = daysWithMeals > 0 ? daysWithCaffeine.size / daysWithMeals : 0
  const sugarRate = daysWithMeals > 0 ? daysWithSugar.size / daysWithMeals : 0
  const alcoholRate = daysWithMeals > 0 ? daysWithAlcohol.size / daysWithMeals : 0

  // 排序的周列表
  const sortedWeeks = [...mealByWeek.keys()].sort()

  const weeklyTakeoutCounts: WeeklyCount[] = sortedWeeks.map((wk) => ({
    weekLabel: wk,
    count: takeoutByWeek.get(wk) ?? 0,
  }))

  const weeklyMealCounts: WeeklyCount[] = sortedWeeks.map((wk) => ({
    weekLabel: wk,
    count: mealByWeek.get(wk) ?? 0,
  }))

  // 找出咖啡因最多的餐次
  let topCaffeineMealOrder: MealOrder | null = null
  let maxCaffeine = 0
  for (const [mo, count] of Object.entries(caffeineByMealOrder)) {
    if (count > maxCaffeine) {
      maxCaffeine = count
      topCaffeineMealOrder = mo as MealOrder
    }
  }

  // 找出外卖最多的餐次
  let topTakeoutMealOrder: MealOrder | null = null
  let maxTakeout = 0
  for (const [mo, count] of Object.entries(takeoutByMealOrder)) {
    if (count > maxTakeout) {
      maxTakeout = count
      topTakeoutMealOrder = mo as MealOrder
    }
  }

  return {
    dayCount,
    daysWithMeals,
    totalMeals,
    tagFrequency,
    mealOrderDistribution,
    sourceDistribution,
    proteinRate,
    caffeineRate,
    sugarRate,
    alcoholRate,
    weeklyTakeoutCounts,
    weeklyMealCounts,
    topCaffeineMealOrder,
    topTakeoutMealOrder,
  }
}
