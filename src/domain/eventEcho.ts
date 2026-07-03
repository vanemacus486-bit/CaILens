import type { CalendarEvent } from './event'
import { getDayStart } from './time'

export interface EventEcho {
  /** 本周（含本条）同名事件次数 */
  weekCount: number
  /** 本月（含本条）同名事件累计毫秒 */
  monthTotalMs: number
  /** 距上一条同名记录的本地日历日差；窗口内无 → null */
  daysSinceLast: number | null
}

/**
 * 计算目标事件的"回声统计"：本周次数、本月累计时长、距上次天数。
 *
 * @param target       目标事件
 * @param candidates   候选事件集（必须包含 target 本身）
 * @param weekStartMs  target 所在周的周一本地 0 点（ms）
 * @param monthStartMs target 所在月的 1 号本地 0 点（ms）
 */
export function computeEventEcho(
  target: CalendarEvent,
  candidates: readonly CalendarEvent[],
  weekStartMs: number,
  monthStartMs: number,
): EventEcho {
  const title = target.title.trim()
  const weekEndMs = weekStartMs + 7 * 86_400_000

  // 同名匹配集（含 target）
  const matched = candidates.filter((e) => e.title.trim() === title)

  // weekCount: 同一周内
  const weekCount = matched.filter(
    (e) => e.startTime >= weekStartMs && e.startTime < weekEndMs,
  ).length

  // monthTotalMs: 本月到 target 为止
  const monthTotalMs = matched
    .filter((e) => e.startTime >= monthStartMs && e.startTime <= target.startTime)
    .reduce((sum, e) => sum + (e.endTime - e.startTime), 0)

  // daysSinceLast: target 之前最近一条同名记录
  const before = matched
    .filter((e) => e.id !== target.id && e.startTime < target.startTime)
    .sort((a, b) => b.startTime - a.startTime)

  let daysSinceLast: number | null = null
  if (before.length > 0) {
    const last = before[0]
    const targetDayStart = getDayStart(new Date(target.startTime))
    const lastDayStart = getDayStart(new Date(last.startTime))
    daysSinceLast = Math.round((targetDayStart - lastDayStart) / 86_400_000)
  }

  return { weekCount, monthTotalMs, daysSinceLast }
}
