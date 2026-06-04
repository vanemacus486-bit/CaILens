/**
 * # Log — 每日/周时间线聚合模型
 *
 * 为"日志"Tab 提供按天聚合的数据结构。
 * 将 CalendarEvent、Todo、DailyContext 等多源数据
 * 合并为一个可直接渲染的 DayTimeline。
 *
 * 纯类型 + 纯函数，不依赖 React/Dexie/浏览器 API。
 */

import type { CalendarEvent, MealOrder, MealData } from './event'
import type { Todo } from './todo'
import type { CategoryId } from './category'

// ── 每日时间线 ─────────────────────────────────────────────

export interface DayTimeline {
  /** 日期时间戳（当天 0 点 UTC ms） */
  dateTs: number
  /** 日期标签，如 "3月17日" */
  dateLabel: string
  /** 周几（0=周日，1=周一…6=周六） */
  weekday: number
  /** 当日有效投入总时长（ms） */
  totalMs: number
  /** 各分类时长（ms），用于堆叠条 */
  categoryMs: Map<CategoryId, number>
  /** 按开始时间排序的当天事件 */
  events: CalendarEvent[]
  /** 当天完成的待办 */
  doneTodos: Todo[]
  /** 饮食概括 */
  mealSummary: {
    /** 总餐次 */
    count: number
    /** 餐序列表，如 ['breakfast', 'lunch', 'dinner'] */
    orders: MealOrder[]
  }
  /** 是否有睡眠记录 */
  hasSleep: boolean
}

// ── 周时间线 ───────────────────────────────────────────────

export interface WeekTimeline {
  /** 本周一 0 点时间戳 */
  weekStart: number
  /** 本周日最后一毫秒 */
  weekEnd: number
  /** 周标签，如 "3月17日 – 3月23日" */
  weekLabel: string
  /** 本周有效投入总时长（ms） */
  weekTotalMs: number
  /** 周一~周日，每天一组 */
  days: [DayTimeline, DayTimeline, DayTimeline, DayTimeline, DayTimeline, DayTimeline, DayTimeline]
}

// ── 工具函数 ───────────────────────────────────────────────

/**
 * 格式化时长（ms → 紧凑字符串，如 "6.2h" / "45m"）。
 */
export function fmtDurationCompact(ms: number): string {
  const hours = ms / 3_600_000
  if (hours >= 1) return hours.toFixed(1) + 'h'
  return Math.round(ms / 60_000) + 'm'
}

/**
 * 获取某天 0 点时间戳（本地时区）。
 */
function localDayStart(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * 判断事件是否与某天重叠。
 */
function eventOverlapsDay(event: CalendarEvent, dayStart: number, dayEnd: number): boolean {
  return event.startTime < dayEnd && event.endTime > dayStart
}

/**
 * 从事件 typedData 中提取 MealOrder 列表。
 */
function extractMealOrders(events: CalendarEvent[]): MealOrder[] {
  const orders = new Set<MealOrder>()
  for (const e of events) {
    if (e.typedData?.type === 'meal') {
      const meal = e.typedData as MealData
      orders.add(meal.mealOrder)
    }
  }
  return Array.from(orders)
}

/**
 * 计算某天的有效投入时长和各分类时长。
 */
function computeDayTimeStats(events: CalendarEvent[], dayStart: number, dayEnd: number): {
  totalMs: number
  categoryMs: Map<CategoryId, number>
} {
  let totalMs = 0
  const categoryMs = new Map<CategoryId, number>()

  for (const e of events) {
    const segStart = Math.max(e.startTime, dayStart)
    const segEnd = Math.min(e.endTime, dayEnd)
    const dur = Math.max(0, segEnd - segStart)
    totalMs += dur
    categoryMs.set(e.categoryId, (categoryMs.get(e.categoryId) ?? 0) + dur)
  }

  return { totalMs, categoryMs }
}

/**
 * 判断事件中是否包含睡眠记录。
 */
function hasSleepEvent(events: CalendarEvent[]): boolean {
  return events.some((e) => e.typedData?.type === 'sleep')
}

/**
 * 创建单日 DayTimeline。
 */
function createDayTimeline(
  dateTs: number,
  weekEvents: CalendarEvent[],
  weekDoneTodos: Todo[],
): DayTimeline {
  const d = new Date(dateTs)
  const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日`
  const weekday = d.getDay()

  const dayStart = dateTs
  const dayEnd = dayStart + 86_400_000

  // 过滤当天事件
  const dayEvents = weekEvents
    .filter((e) => eventOverlapsDay(e, dayStart, dayEnd))
    .sort((a, b) => a.startTime - b.startTime)

  // 过滤当天完成的待办（按 completedAt 在当天范围内）
  const doneTodos = weekDoneTodos.filter((todo) => {
    if (todo.completedAt === null) return false
    const completedDay = localDayStart(todo.completedAt)
    return completedDay >= dayStart && completedDay < dayEnd
  })

  const { totalMs, categoryMs } = computeDayTimeStats(dayEvents, dayStart, dayEnd)
  const orders = extractMealOrders(dayEvents)

  return {
    dateTs,
    dateLabel,
    weekday,
    totalMs,
    categoryMs,
    events: dayEvents,
    doneTodos,
    mealSummary: { count: orders.length, orders },
    hasSleep: hasSleepEvent(dayEvents),
  }
}

/**
 * 将多源数据聚合为周时间线。
 *
 * @param events     - 周范围内的事件（已按时间范围过滤，不要求排序）
 * @param doneTodos  - 本周完成的待办（status === 'done'）
 * @param weekStart  - 本周一 0 点时间戳（本地时区）
 * @returns WeekTimeline
 */
export function computeWeekTimeline(
  events: CalendarEvent[],
  doneTodos: Todo[],
  weekStart: number,
): WeekTimeline {
  const weekEnd = weekStart + 7 * 86_400_000 - 1

  // 生成 7 天的时间戳
  const dayTimestamps: number[] = []
  for (let i = 0; i < 7; i++) {
    dayTimestamps.push(weekStart + i * 86_400_000)
  }

  const days = dayTimestamps.map((ts) =>
    createDayTimeline(ts, events, doneTodos),
  ) as unknown as [DayTimeline, DayTimeline, DayTimeline, DayTimeline, DayTimeline, DayTimeline, DayTimeline]

  const weekTotalMs = days.reduce((sum, day) => sum + day.totalMs, 0)

  // 周标签
  const startDate = new Date(weekStart)
  const endDate = new Date(weekStart + 6 * 86_400_000)
  const weekLabel = `${startDate.getMonth() + 1}月${startDate.getDate()}日 – ${endDate.getMonth() + 1}月${endDate.getDate()}日`

  return { weekStart, weekEnd, weekLabel, weekTotalMs, days }
}

/**
 * 计算单日摘要字符串（用于周概览圆点 tooltip 等场景）。
 */
export function computeDaySummary(day: DayTimeline): {
  hoursStr: string
  eventCount: number
  doneCount: number
  mealCount: number
} {
  return {
    hoursStr: fmtDurationCompact(day.totalMs),
    eventCount: day.events.length,
    doneCount: day.doneTodos.length,
    mealCount: day.mealSummary.count,
  }
}
