/**
 * # dayMark — 日期标记/提醒领域类型 + 纯函数
 *
 * 用户可在迷你月历上右键某天打标记、写备注。
 * 标记数据存 settings.dayMarks，不另建 Dexie 表。
 *
 * 纯类型 + 纯函数，零副作用，不依赖 React / Dexie / 浏览器 API。
 */

import type { EventColor } from './event'
import type { AppLanguage } from '@/i18n/types'

/** 单条日期标记 */
export interface DayMark {
  id: string
  /** 本地日对齐到本地午夜后的 UTC 毫秒 */
  date: number
  /** 这天是干嘛的，一句话 */
  label: string
  /** 可选着色；null/缺省用 accent */
  color?: EventColor | null
  createdAt: number
  updatedAt: number
}

// ── 纯工具 ──────────────────────────────────────────────────

const DAY_MS = 86_400_000

/** 时间戳 → 本地午夜时间戳（与 habitPlan.startOfLocalDay 一致） */
function startOfLocalDay(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** 两个时间戳是否落在同一个本地日 */
export function isSameLocalDay(aMs: number, bMs: number): boolean {
  return startOfLocalDay(aMs) === startOfLocalDay(bMs)
}

/** 筛选出落在 dayMs 这一天的所有标记 */
export function marksOnDay(marks: DayMark[], dayMs: number): DayMark[] {
  const day = startOfLocalDay(dayMs)
  return marks.filter((m) => startOfLocalDay(m.date) === day)
}

/**
 * 仅保留今天及未来（按本地日 ≥ 今天本地午夜）的标记，
 * 按 date 升序，再按 createdAt 升序。
 */
export function upcomingMarks(marks: DayMark[], nowMs: number): DayMark[] {
  const today = startOfLocalDay(nowMs)
  return marks
    .filter((m) => startOfLocalDay(m.date) >= today)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date - b.date
      return a.createdAt - b.createdAt
    })
}

/**
 * 格式化相对日描述。
 *
 * | 差值      | zh           | en                |
 * |-----------|--------------|-------------------|
 * | 今天      | 今天         | Today             |
 * | 明天      | 明天         | Tomorrow          |
 * | N 天后    | N 天后       | in N days         |
 * | 昨天      | 昨天         | Yesterday         |
 * | N 天前    | N 天前       | N days ago        |
 */
export function formatRelativeDay(
  dayMs: number,
  nowMs: number,
  lang: AppLanguage,
): string {
  const day = startOfLocalDay(dayMs)
  const now = startOfLocalDay(nowMs)
  const diff = Math.round((day - now) / DAY_MS)

  if (diff === 0) return formatDayLabel('today', lang)
  if (diff === 1) return formatDayLabel('tomorrow', lang)
  if (diff === -1) return formatDayLabel('yesterday', lang)
  if (diff > 0) return formatDayLabel('inDays', lang, diff)
  return formatDayLabel('daysAgo', lang, -diff)
}

function formatDayLabel(kind: 'today' | 'tomorrow' | 'yesterday' | 'inDays' | 'daysAgo', lang: AppLanguage, n?: number): string {
  if (lang === 'zh') {
    if (kind === 'today') return '今天'
    if (kind === 'tomorrow') return '明天'
    if (kind === 'yesterday') return '昨天'
    if (kind === 'inDays') return `${n} 天后`
    return `${n} 天前`
  }
  if (kind === 'today') {
    if (lang === 'en') return 'Today'
    if (lang === 'es') return 'Hoy'
    if (lang === 'fr') return "Aujourd'hui"
    if (lang === 'ar') return 'اليوم'
    if (lang === 'ru') return 'Сегодня'
    return 'Today'
  }
  if (kind === 'tomorrow') {
    if (lang === 'en') return 'Tomorrow'
    if (lang === 'es') return 'Mañana'
    if (lang === 'fr') return 'Demain'
    if (lang === 'ar') return 'غداً'
    if (lang === 'ru') return 'Завтра'
    return 'Tomorrow'
  }
  if (kind === 'yesterday') {
    if (lang === 'en') return 'Yesterday'
    if (lang === 'es') return 'Ayer'
    if (lang === 'fr') return 'Hier'
    if (lang === 'ar') return 'أمس'
    if (lang === 'ru') return 'Вчера'
    return 'Yesterday'
  }
  if (kind === 'inDays') {
    if (lang === 'en') return `in ${n} days`
    if (lang === 'es') return `en ${n} días`
    if (lang === 'fr') return `dans ${n} jours`
    if (lang === 'ar') return `بعد ${n} أيام`
    if (lang === 'ru') return `через ${n} дн.`
    return `in ${n} days`
  }
  // daysAgo
  if (lang === 'en') return `${n} days ago`
  if (lang === 'es') return `hace ${n} días`
  if (lang === 'fr') return `il y a ${n} jours`
  if (lang === 'ar') return `قبل ${n} أيام`
  if (lang === 'ru') return `${n} дн. назад`
  return `${n} days ago`
}
