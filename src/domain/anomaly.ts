/**
 * # anomaly — 本地异常检测（纯函数，零副作用）
 *
 * 在给定日期上扫描时间数据，找出可主动提示的健康/效率异常：
 * - 睡眠不足：当天睡眠事件总时长低于阈值（默认 6 小时）
 * - 久坐：当天任一段工作类事件连续时长超过阈值（默认 4 小时）
 * - 逾期：存在 dueDate 早于该日且未完成的待办
 *
 * 全部在本机完成，不调用 AI、不上传数据。
 */

import type { CalendarEvent } from './event'
import type { Todo } from './todo'

export type AnomalyKind = 'sleep' | 'sedentary' | 'overdue'

export interface Anomaly {
  kind: AnomalyKind
  /** 相关事件/待办时间（UTC ms） */
  at: number
  /** 按语言渲染的提示文案 */
  summary: string
}

const SLEEP_MIN_HOURS = 6
const SEDENTARY_MIN_HOURS = 4
const DAY_MS = 24 * 60 * 60_000

/** 时长格式化 "X小时Y分钟" / "Xh Ym" */
function formatDur(minutes: number, zh: boolean): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (zh) return h === 0 ? `${m}分钟` : m === 0 ? `${h}小时` : `${h}小时${m}分钟`
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * 扫描某天的异常。
 *
 * @param events  全量事件（函数内按天过滤）
 * @param todos   全量待办
 * @param dayStart 当日 00:00（UTC ms）
 * @param language 'zh' 或其他
 */
export function detectAnomalies(
  events: readonly CalendarEvent[],
  todos: readonly Todo[],
  dayStart: number,
  language: string,
): Anomaly[] {
  const zh = language === 'zh'
  const dayEnd = dayStart + DAY_MS
  const out: Anomaly[] = []

  // ── 睡眠不足：与当天有交集的睡眠事件（typedKey=sleep，或 stone 分类兜底），
  //     按重叠区间裁剪后统计当日段时长（跨天睡眠 23:00–07:00 会被正确切分到两天） ──
  const sleepEvents = events.filter((e) =>
    !e.deletedAt &&
    (e.typedKey === 'sleep' || e.categoryId === 'stone') &&
    e.startTime < dayEnd && e.endTime > dayStart,
  )
  if (sleepEvents.length > 0) {
    const sleepMin = sleepEvents.reduce(
      (sum, e) => sum + (Math.min(e.endTime, dayEnd) - Math.max(e.startTime, dayStart)) / 60_000,
      0,
    )
    if (sleepMin > 0 && sleepMin < SLEEP_MIN_HOURS * 60) {
      out.push({
        kind: 'sleep',
        at: sleepEvents[0].startTime,
        summary: zh
          ? `睡眠不足：仅 ${formatDur(sleepMin, true)}，低于建议的 ${SLEEP_MIN_HOURS} 小时`
          : `Not enough sleep: ${formatDur(sleepMin, false)}, below the recommended ${SLEEP_MIN_HOURS}h`,
      })
    }
  }

  // ── 久坐：当天任一工作类事件连续时长 ≥ 4 小时 ──
  const workEvents = events.filter((e) =>
    !e.deletedAt &&
    (e.categoryId === 'accent' || e.categoryId === 'sage') &&
    e.startTime < dayEnd && e.endTime > dayStart,
  )
  for (const ev of workEvents) {
    const minutes = (Math.min(ev.endTime, dayEnd) - Math.max(ev.startTime, dayStart)) / 60_000
    if (minutes >= SEDENTARY_MIN_HOURS * 60) {
      out.push({
        kind: 'sedentary',
        at: ev.startTime,
        summary: zh
          ? `久坐提醒：「${ev.title}」连续 ${formatDur(minutes, true)}，建议起身活动`
          : `Sedentary: "${ev.title}" ran ${formatDur(minutes, false)} straight; consider a break`,
      })
      break // 每类最多一条
    }
  }

  // ── 逾期待办：dueDate 早于该日且未完成 ──
  const overdue = todos.filter((t) =>
    !t.deletedAt && t.status !== 'done' && t.dueDate != null && t.dueDate < dayStart,
  )
  if (overdue.length > 0) {
    out.push({
      kind: 'overdue',
      at: overdue[0].dueDate ?? dayStart,
      summary: zh
        ? `有 ${overdue.length} 条待办已逾期（最早一条：「${overdue[0].title}」）`
        : `${overdue.length} overdue todo(s) (earliest: "${overdue[0].title}")`,
    })
  }

  return out
}
