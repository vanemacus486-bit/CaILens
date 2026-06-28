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

// ── 食物次数矩阵输出类型 ──────────────────────────────────

/** 本周食物次数矩阵的一行 */
export interface FoodWeekRow {
  title: string
  /** 周一→周日，长度 7；当天该菜的代表餐次（当天最早一条的 mealOrder），当天没吃为 null */
  days: (MealOrder | null)[]
  /** 本周该菜真实出现次数（同一天吃多次累加） */
  total: number
}

/** 本月食物次数矩阵的一行 */
export interface FoodMonthRow {
  title: string
  /** 每个日历周的次数，length = weekCount */
  weeks: number[]
  total: number
}

/** 本月食物次数矩阵 */
export interface FoodFreqMonth {
  weekCount: number
  rows: FoodMonthRow[]
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

// ── 辅助：周起始（周一）导出 ────────────────────────────

/** 导出以供食物次数矩阵复用 */
export { weekStartMonday }

// ═══════════════════════════════════════════════════════════
//  computeFoodFreqWeek
// ═══════════════════════════════════════════════════════════

/**
 * 按菜名 title 精确聚合本周食物出现次数。
 *
 * 结果按 total 降序排列，同分用 title.localeCompare 稳定排序。
 * 只统计 Meal 事件且 startTime ∈ [range.start, range.end)。
 * title 为空字符串时兜底为 "吃饭"。
 */
export function computeFoodFreqWeek(
  events: readonly CalendarEvent[],
  range: DateRange,
): FoodWeekRow[] {
  // 过滤出范围内的 Meal 事件
  const meals: { title: string; startTime: number; mealOrder: MealOrder }[] = []
  for (const e of events) {
    if (
      isMealEvent(e) &&
      e.startTime >= range.start &&
      e.startTime < range.end
    ) {
      meals.push({
        title: e.title || '吃饭',
        startTime: e.startTime,
        mealOrder: e.typedData.mealOrder,
      })
    }
  }

  // 按 title 分组
  const byTitle = new Map<string, { days: Map<number, { count: number; firstTs: number; mealOrder: MealOrder }>; total: number }>()
  for (const m of meals) {
    const d = new Date(m.startTime)
    // dayOfWeek: 0=Sunday..6=Saturday → 0=Monday..6=Sunday
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
    let bucket = byTitle.get(m.title)
    if (!bucket) {
      bucket = { days: new Map(), total: 0 }
      byTitle.set(m.title, bucket)
    }
    bucket.total++

    const dayEntry = bucket.days.get(dow)
    if (dayEntry) {
      dayEntry.count++
      // 保留最早一条的代表餐次
      if (m.startTime < dayEntry.firstTs) {
        dayEntry.firstTs = m.startTime
        dayEntry.mealOrder = m.mealOrder
      }
    } else {
      bucket.days.set(dow, { count: 1, firstTs: m.startTime, mealOrder: m.mealOrder })
    }
  }

  // 构建结果并排序
  const rows: FoodWeekRow[] = []
  for (const [title, bucket] of byTitle) {
    const days: (MealOrder | null)[] = Array.from({ length: 7 }, (_, i) => {
      const entry = bucket.days.get(i)
      return entry ? entry.mealOrder : null
    })
    rows.push({ title, days, total: bucket.total })
  }

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return a.title.localeCompare(b.title)
  })

  return rows
}

// ═══════════════════════════════════════════════════════════
//  computeFoodFreqMonth
// ═══════════════════════════════════════════════════════════

/**
 * 按菜名 title 精确聚合本月食物出现次数，分周展示。
 *
 * 周分片算法：
 * - base = weekStartMonday(range.start)
 * - 每条 meal 的列号 col = floor((meal.startTime - base) / (7 * 86400000))
 * - weekCount 至少覆盖到 range.end - 1
 * - 没有任何记录的中间周保留为整列 0（保证列与日历周对齐）
 *
 * 结果按 total 降序取前 topN 行，同分用 title.localeCompare 稳定排序。
 */
export function computeFoodFreqMonth(
  events: readonly CalendarEvent[],
  range: DateRange,
  topN: number,
): FoodFreqMonth {
  const WEEK_MS = 7 * 86_400_000
  const base = weekStartMonday(range.start)

  // 计算 weekCount
  const lastDay = range.end - 1
  const lastWeekStart = weekStartMonday(lastDay)
  const weekCount = Math.floor((lastWeekStart - base) / WEEK_MS) + 1

  // 过滤出范围内的 Meal 事件
  const meals: { title: string; startTime: number }[] = []
  for (const e of events) {
    if (
      isMealEvent(e) &&
      e.startTime >= range.start &&
      e.startTime < range.end
    ) {
      meals.push({
        title: e.title || '吃饭',
        startTime: e.startTime,
      })
    }
  }

  // 按 title 分组
  const byTitle = new Map<string, number[]>()
  for (const m of meals) {
    const col = Math.floor((m.startTime - base) / WEEK_MS)
    let buckets = byTitle.get(m.title)
    if (!buckets) {
      buckets = new Array<number>(weekCount).fill(0)
      byTitle.set(m.title, buckets)
    }
    if (col >= 0 && col < weekCount) {
      buckets[col]++
    }
  }

  // 构建结果
  const rows: FoodMonthRow[] = []
  for (const [title, weeks] of byTitle) {
    const total = weeks.reduce((s, v) => s + v, 0)
    rows.push({ title, weeks, total })
  }

  // 排序 + topN
  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return a.title.localeCompare(b.title)
  })

  return {
    weekCount,
    rows: topN > 0 ? rows.slice(0, topN) : rows,
  }
}
