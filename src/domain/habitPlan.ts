/**
 * # habitPlan — 习惯调节计划领域类型 + 检测
 *
 * 「分阶段地减少 / 增加某些活动的时间，并检测是否达标」。
 *
 * - 一条 **stream**（流）= 一组关键词（子串匹配事件标题）+ 方向（减少 / 增加）。
 *   关键词匹配规则与全 app 分类一致（见 domain/icsImport 的 classifyEvent）：
 *   大小写不敏感子串，多词 OR。
 * - **phase**（阶段）按 `phaseLengthDays` 顺序推进，每阶段给每条 stream 一个
 *   目标「小时/天」。减少 → 上限（实测 ≤ 目标即达标）；增加 → 下限（≥ 即达标）。
 * - 检测：按本地日汇总命中事件时长 → 当前阶段日均 vs 目标 → 达标 + 连续达标天数。
 *
 * 纯类型 + 纯函数，零副作用，不依赖 React / Dexie / 浏览器 API。
 * ID 由外部（store/repository 的 IdGenerator）注入，本模块不生成 ID。
 */

import type { CalendarEvent, EventColor } from './event'

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

// ── 类型 ────────────────────────────────────────────────────

export type StreamDirection = 'decrease' | 'increase'

export interface PlanStream {
  id: string
  /** 显示名，如「刷手机」 */
  label: string
  /** 子串匹配 event.title（大小写不敏感，多词 OR），如 ['刷手机','抖音','小红书'] */
  terms: string[]
  direction: StreamDirection
  /** 着色；null 用默认 accent */
  color: EventColor | null
}

export interface PlanPhase {
  id: string
  /** 阶段名，如「宽松」「收紧」「目标」 */
  label: string
  /** streamId → 目标小时/天。减少=上限，增加=下限。缺省视为 0 */
  targets: Record<string, number>
}

export type HabitPlanStatus = 'active' | 'done' | 'archived'

export interface HabitPlan {
  id: string
  title: string
  status: HabitPlanStatus
  /** 计划起始（UTC ms，须对齐到本地午夜，由 store 保证） */
  startDate: number
  /** 每阶段天数；自动推进 */
  phaseLengthDays: number
  streams: PlanStream[]
  phases: PlanPhase[]
  createdAt: number
  updatedAt: number
  archivedAt?: number
}

// ── 工厂（供 store 构造，ID 外部注入） ──────────────────────

export interface CreateStreamInput {
  label: string
  terms?: string[]
  direction?: StreamDirection
  color?: EventColor | null
}

export function makeStream(id: string, input: CreateStreamInput): PlanStream {
  return {
    id,
    label: input.label,
    terms: input.terms ?? [],
    direction: input.direction ?? 'decrease',
    color: input.color ?? null,
  }
}

export function makePhase(id: string, label: string, targets: Record<string, number> = {}): PlanPhase {
  return { id, label, targets }
}

// ── 纯工具 ──────────────────────────────────────────────────

/** 时间戳 → 本地午夜时间戳 */
export function startOfLocalDay(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** 标题是否命中 stream 关键词（大小写不敏感子串，多词 OR） */
export function eventMatchesStream(title: string, terms: readonly string[]): boolean {
  if (!title || terms.length === 0) return false
  const lower = title.toLowerCase()
  return terms.some((t) => t.length > 0 && lower.includes(t.toLowerCase()))
}

// ── 时长汇总 ────────────────────────────────────────────────

/**
 * 命中事件按本地日累加小时 → Map<本地午夜ts, 小时>。
 * 跨日事件按比例分摊到涉及的每一天。已软删事件（deletedAt）跳过。
 */
export function streamHoursByDay(
  events: readonly CalendarEvent[],
  terms: readonly string[],
  rangeStart: number,
  rangeEnd: number,
): Map<number, number> {
  const map = new Map<number, number>()
  if (terms.length === 0) return map

  for (const e of events) {
    if (e.deletedAt) continue
    if (!eventMatchesStream(e.title, terms)) continue

    const start = Math.max(e.startTime, rangeStart)
    const end = Math.min(e.endTime, rangeEnd)
    if (start >= end) continue

    let cursor = start
    while (cursor < end) {
      const dayStart = startOfLocalDay(cursor)
      const dayEnd = dayStart + DAY_MS
      const sliceEnd = Math.min(end, dayEnd)
      const hours = (sliceEnd - cursor) / HOUR_MS
      if (hours > 0) map.set(dayStart, (map.get(dayStart) ?? 0) + hours)
      cursor = dayEnd
    }
  }
  return map
}

// ── 阶段 ────────────────────────────────────────────────────

/** 当前阶段下标（钳制在 [0, phases.length-1]；未开始 → 0） */
export function currentPhaseIndex(plan: HabitPlan, now: number): number {
  if (plan.phases.length <= 1 || plan.phaseLengthDays <= 0) return 0
  const today = startOfLocalDay(now)
  const elapsedDays = Math.floor((today - plan.startDate) / DAY_MS)
  if (elapsedDays < 0) return 0
  const idx = Math.floor(elapsedDays / plan.phaseLengthDays)
  return Math.min(Math.max(idx, 0), plan.phases.length - 1)
}

/** 第 idx 阶段的时间窗 [start, end)（UTC ms） */
export function phaseWindow(plan: HabitPlan, idx: number): { start: number; end: number } {
  const start = plan.startDate + idx * plan.phaseLengthDays * DAY_MS
  return { start, end: start + plan.phaseLengthDays * DAY_MS }
}

/** 当前阶段还剩几天（含今天；已结束 → 0） */
export function daysLeftInCurrentPhase(plan: HabitPlan, now: number): number {
  const idx = currentPhaseIndex(plan, now)
  const { end } = phaseWindow(plan, idx)
  const today = startOfLocalDay(now)
  return Math.max(0, Math.round((end - today) / DAY_MS))
}

// ── 达标检测 ────────────────────────────────────────────────

export interface StreamProgress {
  streamId: string
  direction: StreamDirection
  /** 当前阶段目标，小时/天 */
  target: number
  /** 当前阶段已过天数内的日均，小时/天 */
  actualPerDay: number
  /** 是否达标（减少 → actual ≤ target；增加 → actual ≥ target） */
  onTrack: boolean
  /** 连续达标天数（截至今天；今天未过完不算断） */
  currentStreak: number
}

/** 单日是否达标 */
function dayCompliant(direction: StreamDirection, hours: number, target: number): boolean {
  return direction === 'decrease' ? hours <= target : hours >= target
}

/**
 * 连续达标天数：从今天往前数 [start, today] 内连续满足的天数。
 * 今天若尚未过完（hours 偏低对 increase 不利）→ 今天不达标也不中断，从昨天算起。
 */
function streakOf(
  hoursByDay: Map<number, number>,
  direction: StreamDirection,
  target: number,
  start: number,
  today: number,
): number {
  let streak = 0
  for (let day = today; day >= start; day -= DAY_MS) {
    const hours = hoursByDay.get(day) ?? 0
    if (dayCompliant(direction, hours, target)) {
      streak++
    } else if (day === today) {
      continue // 今天未达标不中断（可能还没记完）
    } else {
      break
    }
  }
  return streak
}

/** 评估一条 stream 在当前阶段的进度 */
export function evaluateStream(
  plan: HabitPlan,
  stream: PlanStream,
  events: readonly CalendarEvent[],
  now: number,
): StreamProgress {
  const idx = currentPhaseIndex(plan, now)
  const phase = plan.phases[idx]
  const target = phase?.targets[stream.id] ?? 0
  const { start, end } = phaseWindow(plan, idx)
  const today = startOfLocalDay(now)
  const upper = Math.min(end, now)

  const hoursByDay = streamHoursByDay(events, stream.terms, start, upper)
  let total = 0
  for (const v of hoursByDay.values()) total += v

  const elapsedDays = Math.min(
    Math.floor((today - start) / DAY_MS) + 1,
    plan.phaseLengthDays,
  )
  const actualPerDay = elapsedDays > 0 ? total / elapsedDays : 0

  return {
    streamId: stream.id,
    direction: stream.direction,
    target,
    actualPerDay,
    onTrack: dayCompliant(stream.direction, actualPerDay, target),
    currentStreak: streakOf(hoursByDay, stream.direction, target, start, today),
  }
}

export interface PlanProgress {
  phaseIndex: number
  phaseLabel: string
  daysLeftInPhase: number
  streams: StreamProgress[]
}

/** 评估整个计划（当前阶段各 stream 进度） */
export function evaluatePlan(
  plan: HabitPlan,
  events: readonly CalendarEvent[],
  now: number,
): PlanProgress {
  const idx = currentPhaseIndex(plan, now)
  return {
    phaseIndex: idx,
    phaseLabel: plan.phases[idx]?.label ?? '',
    daysLeftInPhase: daysLeftInCurrentPhase(plan, now),
    streams: plan.streams.map((s) => evaluateStream(plan, s, events, now)),
  }
}

// ── 周趋势（日常侧看板） ────────────────────────────────────

/** 时间戳 → 本地周一 0 点（周起始，与 app 周视图一致） */
export function startOfLocalWeek(ts: number): number {
  const d0 = startOfLocalDay(ts)
  const dow = new Date(d0).getDay() // 0=周日 … 6=周六
  const diff = (dow + 6) % 7 // 距上一个周一的天数
  return d0 - diff * DAY_MS
}

export interface WeekPoint {
  weekStart: number
  /** 实测：当周命中时长（小时） */
  actual: number
  /** 该周所属阶段的目标（小时/周 = 目标小时/天 × 7） */
  target: number
}

/**
 * 一条 stream 的近 `weeks` 周 actual-vs-target 序列（供日常趋势图）。
 * 目标按周所属阶段取，故是随阶段升/降的阶梯。
 */
export function streamWeeklySeries(
  plan: HabitPlan,
  stream: PlanStream,
  events: readonly CalendarEvent[],
  now: number,
  weeks = 8,
): WeekPoint[] {
  const thisWeek = startOfLocalWeek(now)
  const out: WeekPoint[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = thisWeek - i * 7 * DAY_MS
    const we = ws + 7 * DAY_MS
    const byDay = streamHoursByDay(events, stream.terms, ws, we)
    let actual = 0
    for (const v of byDay.values()) actual += v
    const idx = currentPhaseIndex(plan, ws)
    const perDay = plan.phases[idx]?.targets[stream.id] ?? 0
    out.push({ weekStart: ws, actual, target: perDay * 7 })
  }
  return out
}
