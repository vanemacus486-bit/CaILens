/**
 * # 饮食统计（Diet Stats）
 *
 * 纯函数聚合 Meal 类型化事件，供饮食视图各面板使用。
 * 无外部依赖、无副作用。
 */

import type { CalendarEvent, MealData, MealOrder, MealTag } from './event'
import { isMealData } from './event'
import type { DateRange } from './dateRange'
import { formatISODate } from './time'

// ── 输出类型 ────────────────────────────────────────────────

export interface DailyMeal {
  eventId: string
  startTime: number
  mealOrder: MealOrder
  foodTags: readonly MealTag[]
  source: string
  title: string
}

export interface DailyMeals {
  date: string // 'yyyy-MM-dd'
  meals: DailyMeal[]
}

export interface WeeklyTagCount {
  weekLabel: string
  weekStart: number // epoch ms (Monday 00:00 local)
  protein: number
  staple: number
  vegetable: number
  fruit: number
  caffeine: number
  sugar: number
  alcohol: number
  fried: number
}

export interface MealTimeStats {
  avgBreakfastTime: number | null
  avgLunchTime: number | null
  avgDinnerTime: number | null
  avgNightSnackTime: number | null
}

export type DietDimension = 'month' | 'quarter' | 'year' | 'all'

// ── 常量 ────────────────────────────────────────────────────

const DAY_MS = 86_400_000

const MEAL_ORDER_RANK: Record<MealOrder, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  night_snack: 3,
}

// ── 类型守卫 ──────────────────────────────────────────────

/** 类型守卫：事件携带有效 Meal 数据 */
type MealEvent = CalendarEvent & { typedData: MealData }

function isMealEvent(e: CalendarEvent): e is MealEvent {
  return !!e.typedData && isMealData(e.typedData)
}

// ── 辅助：日期字符串 ──────────────────────────────────────

function dateStr(ts: number): string {
  return formatISODate(new Date(ts))
}

// ── 辅助：周起始（周一）──────────────────────────────────

function weekStartMonday(ts: number): number {
  const d = new Date(ts)
  const dayOfWeek = d.getDay()
  // JS: Sunday=0, Monday=1. Move backward to Monday.
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset)
  monday.setHours(0, 0, 0, 0)
  return monday.getTime()
}

// ── 辅助：小时转小数 ─────────────────────────────────────

function hourDecimal(ts: number): number {
  const d = new Date(ts)
  return d.getHours() + d.getMinutes() / 60
}

// ═══════════════════════════════════════════════════════════
//  groupMealsByDay
// ═══════════════════════════════════════════════════════════

/**
 * 将时间范围内的 Meal 事件按天分组。
 *
 * @param events       所有事件（会被过滤出 Meal 事件）
 * @param range        时间范围
 * @param includeEmpty 若为 true，范围中每一天（即使无 Meal）都会输出一条空记录
 */
export function groupMealsByDay(
  events: readonly CalendarEvent[],
  range: DateRange,
  includeEmpty = false,
): DailyMeals[] {
  // 过滤出范围内的 Meal 事件
  const mealEvents: MealEvent[] = []
  for (const e of events) {
    if (
      isMealEvent(e) &&
      e.startTime >= range.start &&
      e.startTime < range.end
    ) {
      mealEvents.push(e)
    }
  }

  // 按日期分组
  const byDay = new Map<string, DailyMeal[]>()
  for (const e of mealEvents) {
    const dk = dateStr(e.startTime)
    const data = e.typedData
    const meal: DailyMeal = {
      eventId: e.id,
      startTime: e.startTime,
      mealOrder: data.mealOrder,
      foodTags: data.foodTags,
      source: data.source,
      title: e.title || '吃饭',
    }
    const list = byDay.get(dk)
    if (list) {
      list.push(meal)
    } else {
      byDay.set(dk, [meal])
    }
  }

  // 如果 includeEmpty，填充范围内所有天
  if (includeEmpty) {
    const dayCount = Math.ceil((range.end - range.start) / DAY_MS)
    for (let i = 0; i < dayCount; i++) {
      const dayStart = range.start + i * DAY_MS
      const dk = dateStr(dayStart)
      if (!byDay.has(dk)) {
        byDay.set(dk, [])
      }
    }
  }

  // 转换为数组 + 排序
  const result: DailyMeals[] = []
  for (const [date, meals] of byDay) {
    // 天内按餐次排序
    meals.sort((a, b) => MEAL_ORDER_RANK[a.mealOrder] - MEAL_ORDER_RANK[b.mealOrder])
    result.push({ date, meals })
  }

  // 按日期升序
  result.sort((a, b) => a.date.localeCompare(b.date))

  return result
}

// ═══════════════════════════════════════════════════════════
//  computeWeeklyTagTrend
// ═══════════════════════════════════════════════════════════

/**
 * 按周聚合食物标签出现次数，用于堆叠面积图。
 * 周的定义：周一 00:00 至下周一 00:00。
 */
export function computeWeeklyTagTrend(
  events: readonly CalendarEvent[],
  range: DateRange,
): WeeklyTagCount[] {
  const mealEvents: MealEvent[] = []
  for (const e of events) {
    if (
      isMealEvent(e) &&
      e.startTime >= range.start &&
      e.startTime < range.end
    ) {
      mealEvents.push(e)
    }
  }

  const byWeek = new Map<number, Record<MealTag, number>>()

  for (const e of mealEvents) {
    const ws = weekStartMonday(e.startTime)
    const data = e.typedData
    const bucket = byWeek.get(ws)
    if (bucket) {
      for (const tag of data.foodTags) {
        bucket[tag]++
      }
    } else {
      const fresh: Record<MealTag, number> = {
        protein: 0, staple: 0, vegetable: 0, fruit: 0,
        caffeine: 0, sugar: 0, alcohol: 0, fried: 0,
      }
      for (const tag of data.foodTags) {
        fresh[tag]++
      }
      byWeek.set(ws, fresh)
    }
  }

  // 构建结果
  const weeks = [...byWeek.entries()].sort((a, b) => a[0] - b[0])
  return weeks.map(([ws, counts]) => ({
    weekLabel: formatWeekLabel(ws),
    weekStart: ws,
    ...counts,
  }))
}

function formatWeekLabel(weekStartMs: number): string {
  const d = new Date(weekStartMs)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ═══════════════════════════════════════════════════════════
//  computeMealTimeStats
// ═══════════════════════════════════════════════════════════

/**
 * 计算每种餐次的平均时间（小时制，0-24）。
 * 无数据的餐次返回 null。
 */
export function computeMealTimeStats(
  events: readonly CalendarEvent[],
  range: DateRange,
): MealTimeStats {
  const mealEvents: MealEvent[] = []
  for (const e of events) {
    if (
      isMealEvent(e) &&
      e.startTime >= range.start &&
      e.startTime < range.end
    ) {
      mealEvents.push(e)
    }
  }

  const byOrder = new Map<MealOrder, number[]>()

  for (const e of mealEvents) {
    const mo = e.typedData.mealOrder
    const list = byOrder.get(mo)
    if (list) {
      list.push(hourDecimal(e.startTime))
    } else {
      byOrder.set(mo, [hourDecimal(e.startTime)])
    }
  }

  const avg = (times: number[]): number | null => {
    if (times.length === 0) return null
    return times.reduce((s, t) => s + t, 0) / times.length
  }

  return {
    avgBreakfastTime: avg(byOrder.get('breakfast') ?? []),
    avgLunchTime: avg(byOrder.get('lunch') ?? []),
    avgDinnerTime: avg(byOrder.get('dinner') ?? []),
    avgNightSnackTime: avg(byOrder.get('night_snack') ?? []),
  }
}

// ═══════════════════════════════════════════════════════════
//  getDietDimensionRange
// ═══════════════════════════════════════════════════════════

/**
 * 根据维度和参考日期计算对应的 DateRange。
 *
 * - month:   参考日期所在自然月
 * - quarter: 参考日期所在自然季度（Q1=1-3, Q2=4-6, Q3=7-9, Q4=10-12）
 * - year:    参考日期所在自然年
 * - all:     过去 5 年至今（大范围覆盖率）
 */
export function getDietDimensionRange(
  dimension: DietDimension,
  referenceDateMs: number,
): DateRange {
  const d = new Date(referenceDateMs)
  const y = d.getFullYear()
  const m = d.getMonth() // 0-based

  switch (dimension) {
    case 'month':
      return {
        start: new Date(y, m, 1).getTime(),
        end: new Date(y, m + 1, 1).getTime(),
      }
    case 'quarter': {
      const qStart = Math.floor(m / 3) * 3 // 0, 3, 6, or 9
      return {
        start: new Date(y, qStart, 1).getTime(),
        end: new Date(y, qStart + 3, 1).getTime(),
      }
    }
    case 'year':
      return {
        start: new Date(y, 0, 1).getTime(),
        end: new Date(y + 1, 0, 1).getTime(),
      }
    case 'all':
      // 5 years back, generous enough to cover all existing data
      return {
        start: new Date(y - 5, 0, 1).getTime(),
        end: new Date(y + 1, 0, 1).getTime(),
      }
  }
}
