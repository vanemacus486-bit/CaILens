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
