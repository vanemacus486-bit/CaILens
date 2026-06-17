/**
 * # goalContributions — 目标贡献图纯函数
 *
 * 计算子树下 todo 完成数/事件时长 → 按本地日聚合 → 统计连续天数。
 * 零副作用，不依赖 React/Dexie/浏览器 API。
 */

import type { CalendarEvent } from './event'
import type { Todo } from './todo'
import type { CategoryId } from './category'

export type { CategoryId }

export type ContribMetric = 'duration' | 'count'

// ── 完成数贡献（按 completedAt 落本地日） ──────────────────

/**
 * 完成数：子树内 todo 按 completedAt 落本地日计数 → Map<本地午夜ts, count>
 */
export function computeCompletionContributions(
  todos: readonly Todo[],
  subtreeIds: Set<string>,
  rangeStart: number,
  rangeEnd: number,
): Map<number, number> {
  const map = new Map<number, number>()

  // 只取已完成且带 completedAt 的 todo
  const filtered = todos.filter(
    (t) => t.status === 'done' && t.completedAt !== null && t.goalId !== null && subtreeIds.has(t.goalId),
  )

  for (const t of filtered) {
    const ts = t.completedAt!
    // 截取到范围
    if (ts < rangeStart || ts >= rangeEnd) continue

    // 转本地时区午夜
    const d = new Date(ts)
    const localDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    map.set(localDayStart, (map.get(localDayStart) ?? 0) + 1)
  }

  return map
}

// ── 时长贡献（按事件时长分摊到本地日） ──────────────────────

/**
 * 时长：子树内 event(goalId∈subtree) 按本地日累加小时。
 * 跨日事件按比例分摊到涉及的每一天。
 */
export function computeDurationContributions(
  events: readonly CalendarEvent[],
  subtreeIds: Set<string>,
  rangeStart: number,
  rangeEnd: number,
): Map<number, number> {
  const map = new Map<number, number>()

  const filtered = events.filter(
    (e) => e.goalId && subtreeIds.has(e.goalId),
  )

  const DAY_MS = 86_400_000

  for (const e of filtered) {
    const eventStart = Math.max(e.startTime, rangeStart)
    const eventEnd = Math.min(e.endTime, rangeEnd)
    if (eventStart >= eventEnd) continue

    // 遍历受影响的每一天
    let cursor = eventStart
    while (cursor < eventEnd) {
      const d = new Date(cursor)
      const localDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const dayEnd = localDayStart + DAY_MS

      const sliceStart = Math.max(cursor, localDayStart)
      const sliceEnd = Math.min(eventEnd, dayEnd)
      const sliceHours = (sliceEnd - sliceStart) / 3_600_000

      if (sliceHours > 0) {
        map.set(localDayStart, (map.get(localDayStart) ?? 0) + sliceHours)
      }

      cursor = dayEnd
    }
  }

  return map
}

// ── 坚持统计 ──────────────────────────────────────────────────

/**
 * 坚持统计：有贡献(value>0)的天。
 * currentStreak 截止到 now（若 now 当天无贡献不算断）。
 */
export function computeContribStreak(
  dayMap: Map<number, number>,
  now: number,
): {
  currentStreak: number
  longestStreak: number
  activeDays: number
} {
  const activeDays = dayMap.size

  // 收集有值的日期（本地 midnight ts）
  const activeDates = Array.from(dayMap.entries())
    .filter(([, v]) => v > 0)
    .map(([k]) => k)
    .sort((a, b) => a - b)

  if (activeDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, activeDays: 0 }
  }

  // 最长连续
  let longestStreak = 1
  let currentRun = 1
  for (let i = 1; i < activeDates.length; i++) {
    const diff = activeDates[i] - activeDates[i - 1]
    if (diff === 86_400_000) {
      currentRun++
    } else {
      longestStreak = Math.max(longestStreak, currentRun)
      currentRun = 1
    }
  }
  longestStreak = Math.max(longestStreak, currentRun)

  // 当前连续（截至今天）
  const nowDate = new Date(now)
  const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime()
  let currentStreak = 0

  // 从今天开始往前数
  for (let i = 0; ; i++) {
    const dayStart = todayStart - i * 86_400_000
    const value = dayMap.get(dayStart)
    if (value && value > 0) {
      currentStreak++
    } else if (i === 0) {
      // 今天还没贡献，不中断（从昨天算起）
      continue
    } else {
      break
    }
  }

  return { currentStreak, longestStreak, activeDays }
}

// ── 事件存在性贡献（自动检测，按绑定事件 ID） ──────────────────

/**
 * 事件存在性：绑定具体事件 ID 按本地日计数 → Map<本地午夜ts, count>
 * count > 0 即表示当天有记录，不需要手动打卡。
 */
export function computeEventPresenceContributions(
  events: readonly CalendarEvent[],
  eventIds: readonly string[],
  rangeStart: number,
  rangeEnd: number,
): Map<number, number> {
  const map = new Map<number, number>()
  if (eventIds.length === 0) return map

  const idSet = new Set<string>(eventIds)
  const filtered = events.filter(
    (e) => idSet.has(e.id) && e.startTime >= rangeStart && e.startTime < rangeEnd,
  )

  for (const e of filtered) {
    const d = new Date(e.startTime)
    const localDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    map.set(localDayStart, (map.get(localDayStart) ?? 0) + 1)
  }

  return map
}

// ── 强度分级（纯函数，domain 内定义以避免依赖 React） ────

/** 完成数阈值（绝对计数） */
export const COMPLETION_THRESHOLDS: readonly [number, number, number, number] = [1, 2, 4, 6]

/** 强度等级：0-4，基于 ratio 与阈值比较 */
export function getIntensityLevel(ratio: number, thresholds: readonly [number, number, number, number] = [0.1, 0.25, 0.5, 0.8]): 0 | 1 | 2 | 3 | 4 {
  if (ratio <= 0) return 0
  if (ratio < thresholds[0]) return 1
  if (ratio < thresholds[1]) return 2
  if (ratio < thresholds[2]) return 3
  return 4
}
