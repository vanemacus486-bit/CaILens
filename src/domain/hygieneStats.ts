/**
 * # 卫生统计（Hygiene Stats）
 *
 * 纯函数聚合 Hygiene 类型化事件，供卫生时刻图使用（与 dietStats 同构）。
 * 活动由用户自定义（domain/hygieneActivity）：事件 typedData 引用活动 id；
 * 无 typedData 的普通事件按用户关键词兜底匹配，避免历史数据丢失。
 * 无外部依赖、无副作用。
 */

import type { CalendarEvent } from './event'
import { isHygieneData } from './event'
import type { HygieneActivityDef } from './hygieneActivity'
import { inferHygieneActivity, findHygieneActivity } from './hygieneActivity'
import type { DateRange } from './dateRange'
import { formatISODate } from './time'

const DAY_MS = 86_400_000

// ── 输出类型 ────────────────────────────────────────────────

export interface DailyHygieneItem {
  eventId: string
  startTime: number
  /** 活动 id（可能指向已删除活动） */
  activityId: string
  /** 显示名称（活动名；活动已删则回退事件标题/ id） */
  name: string
  /** 调色板颜色 key（活动已删则回退中性色） */
  colorKey: string
  title: string
}

export interface DailyHygieneItems {
  date: string // 'yyyy-MM-dd'
  items: DailyHygieneItem[]
}

// ── 辅助 ────────────────────────────────────────────────────

/** 解析事件对应的卫生活动：优先 typedData，其次按用户关键词兜底；都无则 null */
function resolveHygiene(
  e: CalendarEvent,
  activities: readonly HygieneActivityDef[],
): { activityId: string; name: string; colorKey: string } | null {
  if (e.typedData && isHygieneData(e.typedData)) {
    const id = e.typedData.activity
    const def = findHygieneActivity(activities, id)
    // 活动被删除：仍展示，名称回退事件标题/ id，颜色回退中性
    return {
      activityId: id,
      name: def?.name ?? (e.title || id),
      colorKey: def?.color ?? 'sand',
    }
  }
  const id = inferHygieneActivity(e.title, activities)
  if (!id) return null
  const def = findHygieneActivity(activities, id)
  return { activityId: id, name: def?.name ?? e.title, colorKey: def?.color ?? 'sand' }
}

function dateStr(ts: number): string {
  return formatISODate(new Date(ts))
}

// ═══════════════════════════════════════════════════════════
//  groupHygieneByDay
// ═══════════════════════════════════════════════════════════

/**
 * 将时间范围内的卫生事件按天分组。
 *
 * @param events       所有事件（会被过滤出卫生事件）
 * @param range        时间范围
 * @param activities   用户自定义卫生活动列表（用于解析 id / 关键词兜底）
 * @param includeEmpty 若为 true，范围内每一天（即使无记录）都会输出空记录
 */
export function groupHygieneByDay(
  events: readonly CalendarEvent[],
  range: DateRange,
  activities: readonly HygieneActivityDef[],
  includeEmpty = false,
): DailyHygieneItems[] {
  const byDay = new Map<string, DailyHygieneItem[]>()

  for (const e of events) {
    if (e.startTime < range.start || e.startTime >= range.end) continue
    const resolved = resolveHygiene(e, activities)
    if (!resolved) continue
    const dk = dateStr(e.startTime)
    const item: DailyHygieneItem = {
      eventId: e.id,
      startTime: e.startTime,
      activityId: resolved.activityId,
      name: resolved.name,
      colorKey: resolved.colorKey,
      title: e.title,
    }
    const list = byDay.get(dk)
    if (list) list.push(item)
    else byDay.set(dk, [item])
  }

  if (includeEmpty) {
    const dayCount = Math.ceil((range.end - range.start) / DAY_MS)
    for (let i = 0; i < dayCount; i++) {
      const dk = dateStr(range.start + i * DAY_MS)
      if (!byDay.has(dk)) byDay.set(dk, [])
    }
  }

  const result: DailyHygieneItems[] = []
  for (const [date, items] of byDay) {
    items.sort((a, b) => a.startTime - b.startTime)
    result.push({ date, items })
  }
  result.sort((a, b) => a.date.localeCompare(b.date))
  return result
}

// ═══════════════════════════════════════════════════════════
//  Hygiene 频次输出类型
// ═══════════════════════════════════════════════════════════

/** 本周卫生频次矩阵的一行 */
export interface HygieneFreqWeekRow {
  activityId: string
  name: string
  colorKey: string
  icon: string
  /** 周一→周日，长度 7；当天该活动出现次数（0 = 没出现） */
  days: number[]
  /** 本周该活动总出现次数 */
  total: number
}

/** 本月卫生频次矩阵的一行 */
export interface HygieneFreqMonthRow {
  activityId: string
  name: string
  colorKey: string
  icon: string
  /** 每个日历周该活动出现次数，length = weekCount */
  weeks: number[]
  total: number
}

/** 本月卫生频次矩阵 */
export interface HygieneFreqMonth {
  weekCount: number
  rows: HygieneFreqMonthRow[]
}

// ── 辅助：周起始（周一）──────────────────────────────────

function weekStartMonday(ts: number): number {
  const d = new Date(ts)
  const dayOfWeek = d.getDay()
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset)
  monday.setHours(0, 0, 0, 0)
  return monday.getTime()
}

// ═══════════════════════════════════════════════════════════
//  computeHygieneFreqWeek
// ═══════════════════════════════════════════════════════════

/**
 * 按活动聚合本周卫生事件出现次数。
 *
 * 结果按 total 降序排列，同分用 name.localeCompare 稳定排序。
 * 只统计能解析出卫生活动的事件且 startTime ∈ [range.start, range.end)。
 */
export function computeHygieneFreqWeek(
  events: readonly CalendarEvent[],
  range: DateRange,
  activities: readonly HygieneActivityDef[],
): HygieneFreqWeekRow[] {
  // 过滤并解析事件
  const resolved: { activityId: string; name: string; colorKey: string; icon: string; startTime: number }[] = []
  for (const e of events) {
    if (e.startTime < range.start || e.startTime >= range.end) continue
    const r = resolveHygiene(e, activities)
    if (!r) continue
    const def = findHygieneActivity(activities, r.activityId)
    resolved.push({
      activityId: r.activityId,
      name: r.name,
      colorKey: r.colorKey,
      icon: def?.icon ?? '',
      startTime: e.startTime,
    })
  }

  // 按 activityId 分组
  const byActivity = new Map<string, { name: string; colorKey: string; icon: string; days: number[]; total: number }>()
  for (const r of resolved) {
    let bucket = byActivity.get(r.activityId)
    if (!bucket) {
      bucket = { name: r.name, colorKey: r.colorKey, icon: r.icon, days: new Array<number>(7).fill(0), total: 0 }
      byActivity.set(r.activityId, bucket)
    }
    const d = new Date(r.startTime)
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1 // 0=Monday..6=Sunday
    bucket.days[dow]++
    bucket.total++
  }

  // 构建结果并排序
  const rows: HygieneFreqWeekRow[] = []
  for (const [activityId, bucket] of byActivity) {
    rows.push({ activityId, ...bucket })
  }
  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return a.name.localeCompare(b.name)
  })

  return rows
}

// ═══════════════════════════════════════════════════════════
//  computeHygieneFreqMonth
// ═══════════════════════════════════════════════════════════

/**
 * 按活动聚合本月卫生事件出现次数，分周展示。
 *
 * 周分片算法：
 * - base = weekStartMonday(range.start)
 * - 每条事件列号 col = floor((event.startTime - base) / (7 * 86400000))
 * - weekCount 至少覆盖到 range.end - 1
 * - 没有任何记录的中间周保留为整列 0（保证列与日历周对齐）
 *
 * 结果按 total 降序取前 topN 行，同分用 name.localeCompare 稳定排序。
 */
export function computeHygieneFreqMonth(
  events: readonly CalendarEvent[],
  range: DateRange,
  activities: readonly HygieneActivityDef[],
  topN: number,
): HygieneFreqMonth {
  const WEEK_MS = 7 * 86_400_000
  const base = weekStartMonday(range.start)

  const lastDay = range.end - 1
  const lastWeekStart = weekStartMonday(lastDay)
  const weekCount = Math.floor((lastWeekStart - base) / WEEK_MS) + 1

  // 过滤并解析事件
  const resolved: { activityId: string; name: string; colorKey: string; icon: string; startTime: number }[] = []
  for (const e of events) {
    if (e.startTime < range.start || e.startTime >= range.end) continue
    const r = resolveHygiene(e, activities)
    if (!r) continue
    const def = findHygieneActivity(activities, r.activityId)
    resolved.push({
      activityId: r.activityId,
      name: r.name,
      colorKey: r.colorKey,
      icon: def?.icon ?? '',
      startTime: e.startTime,
    })
  }

  // 按 activityId 分组
  const byActivity = new Map<string, { name: string; colorKey: string; icon: string; weeks: number[] }>()
  for (const r of resolved) {
    let bucket = byActivity.get(r.activityId)
    if (!bucket) {
      bucket = { name: r.name, colorKey: r.colorKey, icon: r.icon, weeks: new Array<number>(weekCount).fill(0) }
      byActivity.set(r.activityId, bucket)
    }
    const col = Math.floor((r.startTime - base) / WEEK_MS)
    if (col >= 0 && col < weekCount) {
      bucket.weeks[col]++
    }
  }

  // 构建结果
  const rows: HygieneFreqMonthRow[] = []
  for (const [activityId, bucket] of byActivity) {
    const total = bucket.weeks.reduce((s, v) => s + v, 0)
    rows.push({ activityId, total, ...bucket })
  }

  // 排序 + topN
  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return a.name.localeCompare(b.name)
  })

  return {
    weekCount,
    rows: topN > 0 ? rows.slice(0, topN) : rows,
  }
}
