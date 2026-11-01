/**
 * # eventDraft — 把「一句话」解析成一个事件块
 *
 * 录入框的本质不是表单，是「输入事件」：用户敲的是一句话，
 * 系统负责把它切成结构化的事件块（标题 + 起止 + 分类）。
 *
 * 三条信息来源，按优先级：
 *   1. 显式时间：`9:00-10:30 写代码` / `9:00 写代码` —— 用户说了算
 *   2. 相对时长：`写代码 30分钟` —— 以默认区间的开始为锚点往后推
 *   3. 都没有：整句话当标题，时间沿用调用方给的默认区间
 *
 * 纯函数，零副作用：不读 Date.now()，时间全部由 ctx 传入。
 */

import type { CategoryId } from './category'
import { classifyEvent } from './icsImport'

export interface EventDraftContext {
  /** 用户正在补记的那一天（本地零点，UTC ms） */
  baseDate: number
  /** 当前时刻（UTC ms），用于判定「没写结束时间」时是否推进到现在 */
  now: number
  /** 没匹配到分类时用哪个 */
  defaultCategoryId: CategoryId
  /** 关键词分类表 */
  categories: ReadonlyArray<{ id: CategoryId; folders: readonly { keywords: readonly string[] }[] }>
  /** 整句话没有任何时间信息时，用这段区间 */
  defaultSpan: { start: number; end: number }
}

/** 时间的来历：显式 > 时长 > 默认 */
export type DraftTimeSource = 'explicit' | 'duration' | 'default'

export interface EventDraft {
  title: string
  startTime: number
  endTime: number
  categoryId: CategoryId
  timeSource: DraftTimeSource
}

/** 在 baseDate 那天拼出本地 h:m。 */
function atTime(baseDate: number, h: number, m: number): number {
  const d = new Date(baseDate)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0).getTime()
}

/** `9:00-10:30` —— 显式区间，允许 `-` `~` `–` `到` 作分隔。 */
const RANGE_RE = /(\d{1,2})[:：](\d{2})\s*(?:-|~|–|—|到|至)\s*(\d{1,2})[:：](\d{2})/

/** `45分钟` / `1.5小时` / `1小时20分` —— 相对时长，锚在默认区间的起点。 */
const DURATION_RE = /(\d+(?:\.\d+)?)\s*(?:小时|时|h)(?:\s*(\d{1,2})\s*(?:分钟|分|m))?|(\d{1,3})\s*(?:分钟|分|m)/i

/** 把匹配到的时长换算成毫秒；没匹配到返回 null。 */
function parseDurationMs(m: RegExpMatchArray): number | null {
  if (m[3] !== undefined) return Number(m[3]) * 60_000
  const hours = Number(m[1])
  const minutes = m[2] !== undefined ? Number(m[2]) : 0
  const total = hours * 3_600_000 + minutes * 60_000
  return total > 0 ? total : null
}

export function parseEventDraft(text: string, ctx: EventDraftContext): EventDraft {
  const raw = text.trim()

  const range = raw.match(RANGE_RE)
  if (range) {
    const startTime = atTime(ctx.baseDate, Number(range[1]), Number(range[2]))
    const endTime = atTime(ctx.baseDate, Number(range[3]), Number(range[4]))
    const title = (raw.slice(0, range.index) + ' ' + raw.slice((range.index ?? 0) + range[0].length))
      .replace(/\s+/g, ' ')
      .trim()
    return {
      title,
      startTime,
      endTime: endTime > startTime ? endTime : endTime + 24 * 60 * 60_000,
      categoryId: classifyEvent(title, ctx.categories) ?? ctx.defaultCategoryId,
      timeSource: 'explicit',
    }
  }

  const duration = raw.match(DURATION_RE)
  const durationMs = duration ? parseDurationMs(duration) : null
  if (duration && durationMs !== null) {
    const title = (raw.slice(0, duration.index) + ' ' + raw.slice((duration.index ?? 0) + duration[0].length))
      .replace(/\s+/g, ' ')
      .trim()
    return {
      title,
      startTime: ctx.defaultSpan.start,
      endTime: ctx.defaultSpan.start + durationMs,
      categoryId: classifyEvent(title, ctx.categories) ?? ctx.defaultCategoryId,
      timeSource: 'duration',
    }
  }

  return {
    title: raw,
    startTime: ctx.defaultSpan.start,
    endTime: ctx.defaultSpan.end,
    categoryId: classifyEvent(raw, ctx.categories) ?? ctx.defaultCategoryId,
    timeSource: 'default',
  }
}
