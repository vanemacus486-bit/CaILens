/**
 * # 标准周（Standard Week）聚合函数
 *
 * 把历史上所有事件按 (weekday, hour) 桶聚合，输出 168 个桶的统计。
 *
 * ## 时区约定
 *
 * 所有时间戳均为 UTC 毫秒（与 CalendarEvent 约定一致）。桶的 weekday/hour
 * 按 **浏览器本地时区** 计算（`new Date(ts).getDay()` / `.getHours()`），
 * 因此同一组 UTC 时间戳在不同时区的浏览器中可能落在不同的桶里。
 * 这是有意为之——标准周显示的是"在你的日常时区中，你通常在做什么"。
 *
 * 跨午夜事件通过逐小时步进自动分配到各天的正确桶中——不需要额外的拆分步骤。
 */

import type { CalendarEvent, EventColor } from './event'
import { getWeekStart } from './time'

// ── Types ────────────────────────────────────────────────────────

export interface ActivityEntry {
  title: string
  categoryId: EventColor
  /** 该活动在该桶的累计分钟数（按覆盖分钟权重）。 */
  minutes: number
  /**
   * 0–100。含义取决于 `percentageMode`：
   * - `'within-recorded'`:  该活动分钟数 / 该桶有记录的总分钟数
   * - `'across-all-weeks'`: 该活动分钟数 / (spanWeeks × 60)，上限 100
   */
  percentage: number
  /** 该活动在该桶出现的不同周数。 */
  weekCount: number
}

export interface StandardWeekBucket {
  weekday: number // 0=Mon … 6=Sun
  hour: number   // 0–23 (local time)
  entries: ActivityEntry[]
  /** 该桶有记录的累计分钟数（所有活动之和）。 */
  totalMinutes: number
}

export interface StandardWeekData {
  buckets: StandardWeekBucket[]
  /** 至少有一条事件（且未被排除）的周数。 */
  totalWeeks: number
  /** weekRange 覆盖的日历周数（无论是否有数据）。 */
  spanWeeks: number
}

export type PercentageMode = 'within-recorded' | 'across-all-weeks'

export interface ComputeStandardWeekOptions {
  events: CalendarEvent[]
  weekRangeStart: number
  weekRangeEnd: number
  excludeCategoryIds?: Set<EventColor>
  /** @default 'across-all-weeks' */
  percentageMode?: PercentageMode
}

// ── Helpers ──────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000
const WEEK_MS = 7 * 24 * HOUR_MS

function bucketKey(weekday: number, hour: number): string {
  return `${weekday}-${hour}`
}

/** 0=Mon … 6=Sun */
function localWeekday(ts: number): number {
  return (new Date(ts).getDay() + 6) % 7
}

function localHour(ts: number): number {
  return new Date(ts).getHours()
}

/**
 * Build a floor-to-the-hour timestamp from a UTC-ms value using local date/time
 * components, matching how `getDayStart` constructs day boundaries.
 */
function floorToLocalHour(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime()
}

/** Number of calendar weeks that intersect [rangeStart, rangeEnd). */
function computeSpanWeeks(rangeStart: number, rangeEnd: number): number {
  if (rangeEnd <= rangeStart) return 0
  let monday = getWeekStart(new Date(rangeStart), 1).getTime()
  let count = 0
  while (monday < rangeEnd) {
    count++
    monday += WEEK_MS
  }
  return count
}

// ── Main ─────────────────────────────────────────────────────────

/** 连续相同 top-activity 的小时合并后的块，用于渲染。 */
export interface MergedBlock {
  weekday: number // 0=Mon … 6=Sun
  startHour: number // inclusive
  endHour: number   // exclusive
  topTitle: string
  /** 合并前的原始桶（用于 tooltip 展示分布）。 */
  buckets: StandardWeekBucket[]
}

/**
 * 将相邻小时且最高频活动相同的桶合并为连续块，
 * 跨天不合并（不同 weekday 始终分属不同块）。
 */
export function mergeConsecutiveBuckets(
  buckets: StandardWeekBucket[],
): MergedBlock[] {
  if (buckets.length === 0) return []

  const sorted = [...buckets].sort(
    (a, b) => a.weekday - b.weekday || a.hour - b.hour,
  )

  const merged: MergedBlock[] = []
  let cur: MergedBlock | null = null

  for (const bucket of sorted) {
    const topTitle = bucket.entries[0]?.title ?? ''
    if (
      cur &&
      cur.weekday === bucket.weekday &&
      cur.endHour === bucket.hour &&
      cur.topTitle === topTitle
    ) {
      cur.endHour = bucket.hour + 1
      cur.buckets.push(bucket)
    } else {
      if (cur) merged.push(cur)
      cur = {
        weekday: bucket.weekday,
        startHour: bucket.hour,
        endHour: bucket.hour + 1,
        topTitle,
        buckets: [bucket],
      }
    }
  }
  if (cur) merged.push(cur)

  return merged
}

export function computeStandardWeek(
  options: ComputeStandardWeekOptions,
): StandardWeekData {
  const {
    events,
    weekRangeStart,
    weekRangeEnd,
    excludeCategoryIds,
    percentageMode = 'across-all-weeks',
  } = options
  const exclude = excludeCategoryIds ?? new Set()

  const filtered = events.filter((e) => {
    if (exclude.has(e.categoryId)) return false
    if (e.endTime <= weekRangeStart) return false
    if (e.startTime >= weekRangeEnd) return false
    return true
  })

  // `${weekday}-${hour}` → Map<title → { categoryId, minutes, weeks }>
  type BucketValue = { categoryId: EventColor; minutes: number; weeks: Set<number> }
  const bucketMap = new Map<string, Map<string, BucketValue>>()

  for (const event of filtered) {
    const eventWeek = getWeekStart(new Date(event.startTime), 1).getTime()
    let hourStart = floorToLocalHour(event.startTime)

    while (hourStart < event.endTime) {
      const hourEnd = hourStart + HOUR_MS
      const overlapStart = Math.max(event.startTime, hourStart)
      const overlapEnd = Math.min(event.endTime, hourEnd)
      const minutes = (overlapEnd - overlapStart) / 60_000

      if (minutes > 0) {
        const key = bucketKey(localWeekday(hourStart), localHour(hourStart))
        let titleMap = bucketMap.get(key)
        if (!titleMap) {
          titleMap = new Map()
          bucketMap.set(key, titleMap)
        }
        const existing = titleMap.get(event.title)
        if (existing) {
          existing.minutes += minutes
          existing.weeks.add(eventWeek)
        } else {
          titleMap.set(event.title, { categoryId: event.categoryId, minutes, weeks: new Set([eventWeek]) })
        }
      }

      hourStart = hourEnd
    }
  }

  // Count distinct weeks that contributed at least one event.
  const weekSet = new Set<number>()
  for (const event of filtered) {
    weekSet.add(getWeekStart(new Date(event.startTime), 1).getTime())
  }

  const spanWeeks = computeSpanWeeks(weekRangeStart, weekRangeEnd)
  const denomAcrossAll = spanWeeks * 60 // minutes per bucket across all weeks

  const buckets: StandardWeekBucket[] = []
  for (const [key, titleMap] of bucketMap) {
    const [wdStr, hrStr] = key.split('-')
    const weekday = Number(wdStr)
    const hour = Number(hrStr)

    let totalMinutes = 0
    for (const [, entry] of titleMap) {
      totalMinutes += entry.minutes
    }

    const entries: ActivityEntry[] = []
    for (const [title, entry] of titleMap) {
      const pct =
        percentageMode === 'within-recorded'
          ? totalMinutes > 0
            ? (entry.minutes / totalMinutes) * 100
            : 0
          : denomAcrossAll > 0
            ? Math.min(100, (entry.minutes / denomAcrossAll) * 100)
            : 0

      entries.push({
        title,
        categoryId: entry.categoryId,
        minutes: Math.round(entry.minutes * 10) / 10,
        percentage: Math.round(pct * 10) / 10,
        weekCount: entry.weeks.size,
      })
    }

    entries.sort((a, b) => b.minutes - a.minutes)

    buckets.push({
      weekday,
      hour,
      entries,
      totalMinutes: Math.round(totalMinutes * 10) / 10,
    })
  }

  return {
    buckets,
    totalWeeks: weekSet.size,
    spanWeeks,
  }
}
