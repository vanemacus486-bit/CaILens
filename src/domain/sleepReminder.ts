/**
 * # sleepReminder — 就寝提醒领域类型 + 纯函数
 *
 * 纯类型 + 纯函数，零副作用，不依赖 React / Dexie / 浏览器 API / Tauri / Capacitor。
 * 所有时间数学基于注入的 UTC ms 时间戳，不碰真实时钟。
 */

import type { CalendarEvent, SleepData } from './event'

// ── 类型 ────────────────────────────────────────────────────

export interface SleepReminderSettings {
  enabled: boolean
  /** 目标就寝本地时刻 "HH:mm"（循环偏好，故意存字符串，不是 UTC 时间戳） */
  bedtime: string          // 例 "23:30"
  /** 提前多少分钟提醒（0/15/30） */
  leadMinutes: number
  /** 今晚已记录主睡眠则当晚不提醒 */
  skipIfLogged: boolean
}

export const DEFAULT_SLEEP_REMINDER: SleepReminderSettings = {
  enabled: false,
  bedtime: '23:30',
  leadMinutes: 30,
  skipIfLogged: true,
}

// ── 纯工具 ──────────────────────────────────────────────────

const DAY_MS = 86_400_000
const MINUTE_MS = 60_000

/**
 * 解析 "HH:mm" 字符串为 { h, m }。
 * 输入格式不合法时返回 null。
 */
export function parseHm(hm: string): { h: number; m: number } | null {
  const parts = hm.split(':')
  if (parts.length !== 2) return null
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

/**
 * 计算下一次 (bedtime − leadMinutes) 的本地时刻对应的 UTC ms。
 * 今天若已过则取明天（明天同样的本地时刻）。
 *
 * @param nowMs  当前 UTC ms（注入，不碰 Date.now()）
 * @param bedtime "HH:mm" 目标就寝本地时刻
 * @param leadMinutes 提前提醒分钟数
 * @returns 下一次提醒的 UTC ms
 */
export function nextTriggerAt(nowMs: number, bedtime: string, leadMinutes: number): number {
  const parsed = parseHm(bedtime)
  if (!parsed) return nowMs + DAY_MS // fallback

  const now = new Date(nowMs)
  const year = now.getFullYear()
  const month = now.getMonth()
  const date = now.getDate()

  // 今天的提醒时刻（本地 bedtime − leadMinutes）
  const triggerLocal = new Date(year, month, date, parsed.h, parsed.m - leadMinutes)
  const triggerMs = triggerLocal.getTime()

  if (triggerMs > nowMs) {
    // 今天的提醒时刻还没过
    return triggerMs
  }

  // 已过 → 明天的同样本地时刻
  const tomorrowLocal = new Date(year, month, date + 1, parsed.h, parsed.m - leadMinutes)
  return tomorrowLocal.getTime()
}

/**
 * 将 bedtime − leadMinutes 转为 { hour, minute }，给手机端定时用。
 * 返回值中 hour ∈ [0, 23]，minute ∈ [0, 59]。
 */
export function bedtimeToDaily(bedtime: string, leadMinutes: number): { hour: number; minute: number } {
  const parsed = parseHm(bedtime)
  if (!parsed) return { hour: 23, minute: 30 } // fallback

  let totalMinutes = parsed.h * 60 + parsed.m - leadMinutes
  // 若提前量使跨越子夜（如 00:15 − 30 → 23:45），取模保持 [0, 1440)
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440

  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
  }
}

// ── 睡眠数据分析 ────────────────────────────────────────────

/** 本地午夜辅助（与 habitPlan 的 startOfLocalDay 一致） */
function startOfLocalDay(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * 判断事件是否为主睡眠。
 * 有 typedData.type==='sleep' 时：sleepType !== 'nap' 且 sleepType !== 'insomnia' 为主睡眠。
 * 无 typedData 或 sleepType 缺省时：duration >= 2h 视为主睡眠。
 */
function isMainSleepEvent(e: CalendarEvent): boolean {
  if (e.deletedAt) return false
  if (!e.typedData || e.typedData.type !== 'sleep') return false
  const sd = e.typedData as SleepData
  if (sd.sleepType === 'nap' || sd.sleepType === 'insomnia') return false
  return true
}

/**
 * 取近 `days` 天主睡眠事件的入睡时刻，
 * 按 toWrapY 方式环绕到 [1080, 2280] 分钟空间求均值再还原成 "HH:mm"。
 * 无数据返回 null。
 *
 * @param events 事件列表
 * @param days   向前看的天数
 * @param nowMs  当前 UTC ms
 */
export function averageMainSleepBedtimeHm(
  events: readonly CalendarEvent[],
  days: number,
  nowMs: number,
): string | null {
  const rangeStart = startOfLocalDay(nowMs) - (days - 1) * DAY_MS
  const rangeEnd = nowMs

  const bedMinutes: number[] = []

  for (const e of events) {
    if (!isMainSleepEvent(e)) continue
    if (e.startTime < rangeStart || e.startTime > rangeEnd) continue

    const d = new Date(e.startTime)
    const minutes = d.getHours() * 60 + d.getMinutes()
    // 环绕到 [1080, 2280]：18:00(1080)→次日 14:00(2280)
    const wrapped = minutes < 1080 ? minutes + 1440 : minutes
    if (wrapped >= 1080 && wrapped <= 2280) {
      bedMinutes.push(wrapped)
    }
  }

  if (bedMinutes.length === 0) return null

  const sum = bedMinutes.reduce((a, b) => a + b, 0)
  const avg = Math.round(sum / bedMinutes.length)

  // 还原为 HH:mm
  let m = avg
  if (m >= 1440) m -= 1440
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/**
 * 判断「今晚」是否已有主睡眠事件。
 * 「今晚」定义为：从上一个 18:00 起到下一个中午 12:00 的窗口。
 * - 若当前时间 ≥ 18:00，窗口 = 今天 18:00 → 明天 12:00
 * - 若当前时间 < 18:00，窗口 = 昨天 18:00 → 今天 12:00
 *
 * @param events 事件列表
 * @param nowMs  当前 UTC ms
 */
export function hasMainSleepLoggedTonight(events: readonly CalendarEvent[], nowMs: number): boolean {
  const todayStart = startOfLocalDay(nowMs)
  const hour = new Date(nowMs).getHours()

  let windowStart: number
  let windowEnd: number

  if (hour >= 18) {
    // 当前在晚间 → 今晚 = 今天 18:00 ~ 明天 12:00
    windowStart = todayStart + 18 * 60 * MINUTE_MS
    windowEnd = todayStart + DAY_MS + 12 * 60 * MINUTE_MS
  } else {
    // 当前在凌晨/上午 → 今晚 = 昨天 18:00 ~ 今天 12:00
    windowStart = todayStart - 6 * 60 * MINUTE_MS
    windowEnd = todayStart + 12 * 60 * MINUTE_MS
  }

  for (const e of events) {
    if (!isMainSleepEvent(e)) continue
    // 事件入睡时间落在窗口内
    if (e.startTime >= windowStart && e.startTime < windowEnd) return true
  }

  return false
}
