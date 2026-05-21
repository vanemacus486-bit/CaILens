/**
 * # 理想日程模板（Ideal Schedule Template）
 *
 * 需求三：从"实际周"到"标准周"的对照机制。
 *
 * 将标准周视图升级为用户可编辑的理想日程模板，
 * 并自动计算每日/每周的贴合度。
 *
 * ## 约束类型
 *
 * - **强约束**（hard）：必须遵守的时段，如就寝时间、起床时间
 * - **软约束**（soft）：倾向性的时段安排，如"希望上午做核心工作"
 *
 * ## 贴合度计算
 *
 * 对每个时段：
 * - 强约束：实际事件在该时段内的分钟数 / 时段总分钟数 × 100%
 * - 软约束：实际事件与约束类型的匹配程度
 */

import type { EventColor } from './event'

// ── 类型定义 ────────────────────────────────────────────────────

export type ConstraintType = 'hard' | 'soft'

export interface IdealTimeSlot {
  id: string
  /** 星期几：0=周一 … 6=周日 */
  weekday: number
  /** 开始小时（本地，0-23） */
  startHour: number
  /** 结束小时（本地，0-23，exclusive） */
  endHour: number
  /** 期望的活动类别 */
  categoryId: EventColor | null
  /** 期望的活动标题（可选，如"睡前的放松阅读"） */
  activityLabel?: string
  /** 约束强度 */
  constraintType: ConstraintType
}

export interface IdealWeekTemplate {
  /** 模板 ID（singleton 'default'） */
  id: string
  /** 7 天的时段列表 */
  slots: IdealTimeSlot[]
  /** 模板名称 */
  name: string
  updatedAt: number
}

export interface SlotFitting {
  slot: IdealTimeSlot
  /** 贴合度 0-100 */
  score: number
  /** 该时段实际填了多少分钟 */
  actualMinutes: number
  /** 该时段总长（分钟） */
  totalMinutes: number
  /** 偏离描述 */
  deviation: string
}

export interface DayFitting {
  weekday: number
  slots: SlotFitting[]
  /** 当日平均贴合度 */
  averageScore: number
  /** 当日硬约束达标率 */
  hardConstraintRate: number
}

export interface WeekFitting {
  days: DayFitting[]
  /** 周平均贴合度 */
  averageScore: number
  /** 硬约束达标率（所有硬约束时段的平均分） */
  hardConstraintRate: number
  /** 软约束平均分 */
  softConstraintRate: number
}

// ── 默认模板 ───────────────────────────────────────────────────

/** 创建默认的理想周模板 */
export function createDefaultTemplate(): IdealWeekTemplate {
  const slots: IdealTimeSlot[] = []

  const weekdays = [0, 1, 2, 3, 4, 5, 6]
  let idCounter = 0

  for (const wd of weekdays) {
    // 就寝时段（跨午夜，显示为次日凌晨）
    // 用 23-24 表示 23:00-00:00，00-07 表示睡眠
    slots.push({
      id: `sleep-${wd}`,
      weekday: wd,
      startHour: 23,
      endHour: 24,
      categoryId: 'stone',
      activityLabel: '准备就寝',
      constraintType: 'hard',
    })

    // 睡眠块（次日凌晨）
    const nextWd = (wd + 1) % 7
    slots.push({
      id: `sleep-mid-${wd}`,
      weekday: nextWd,
      startHour: 0,
      endHour: 7,
      categoryId: 'stone',
      activityLabel: '睡眠',
      constraintType: 'hard',
    })

    // 起床-早间时段
    slots.push({
      id: `morning-${wd}`,
      weekday: wd,
      startHour: 7,
      endHour: 9,
      categoryId: 'sand',
      activityLabel: '晨间流程',
      constraintType: 'soft',
    })

    // 核心工作时段
    slots.push({
      id: `core-am-${wd}`,
      weekday: wd,
      startHour: 9,
      endHour: 12,
      categoryId: 'accent',
      activityLabel: '核心工作',
      constraintType: 'soft',
    })

    // 午间
    slots.push({
      id: `lunch-${wd}`,
      weekday: wd,
      startHour: 12,
      endHour: 13,
      categoryId: 'rose',
      activityLabel: '午休',
      constraintType: 'soft',
    })

    // 下午
    slots.push({
      id: `core-pm-${wd}`,
      weekday: wd,
      startHour: 14,
      endHour: 17,
      categoryId: 'sage',
      activityLabel: '次要工作',
      constraintType: 'soft',
    })

    // 晚间
    slots.push({
      id: `evening-${wd}`,
      weekday: wd,
      startHour: 18,
      endHour: 22,
      categoryId: 'rose',
      activityLabel: '晚间自由',
      constraintType: 'soft',
    })

    idCounter++
  }

  return {
    id: 'default',
    slots,
    name: '默认模板',
    updatedAt: Date.now(),
  }
}

// ── 贴合度计算 ─────────────────────────────────────────────────

/**
 * 判断一个事件是否与某个理想时段重叠，并返回重叠分钟数。
 */
function overlapMinutes(
  eventStart: number, eventEnd: number,
  slotStartHour: number, slotEndHour: number,
  dayStart: number,
): number {
  const slotStart = dayStart + slotStartHour * 3_600_000
  const slotEnd = dayStart + slotEndHour * 3_600_000

  const overlapStart = Math.max(eventStart, slotStart)
  const overlapEnd = Math.min(eventEnd, slotEnd)
  const ms = overlapEnd - overlapStart

  return ms > 0 ? ms / 60_000 : 0
}

/**
 * 获取某天的开始（本地时区 00:00）。
 */
function getLocalDayStart(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * 计算一天中按星期几的贴合度。
 *
 * @param dateTs      那天任意时间戳
 * @param dayEvents   当天的事件列表（已在日边界内）
 * @param dayTemplate 当天的理想时段列表（按 weekday 过滤后的 slots）
 */
export function computeDayFitting(
  dateTs: number,
  dayEvents: ReadonlyArray<{ startTime: number; endTime: number; categoryId: EventColor }>,
  daySlots: IdealTimeSlot[],
): DayFitting {
  const dayStart = getLocalDayStart(dateTs)
  const weekday = (new Date(dateTs).getDay() + 6) % 7

  const slotFittings: SlotFitting[] = daySlots.map((slot) => {
    const totalMinutes = (slot.endHour - slot.startHour) * 60

    // 计算实际事件在该时段内的分钟数
    let actualMinutes = 0
    for (const event of dayEvents) {
      const om = overlapMinutes(
        event.startTime, event.endTime,
        slot.startHour, slot.endHour,
        dayStart,
      )
      actualMinutes += om
    }

    // 贴合度计算
    let score: number
    let deviation: string

    if (slot.constraintType === 'hard') {
      // 硬约束：时间覆盖率
      const rawScore = totalMinutes > 0 ? (actualMinutes / totalMinutes) * 100 : 0
      score = Math.min(rawScore, 100)
      deviation = score >= 80
        ? '' // 达标
        : `仅覆盖 ${Math.round(actualMinutes)}/${totalMinutes} 分钟`
    } else {
      // 软约束：检查实际活动类别是否匹配
      if (totalMinutes === 0) {
        score = 100
        deviation = ''
      } else {
        const matchingMinutes = dayEvents
          .filter((e) => slot.categoryId === null || e.categoryId === slot.categoryId)
          .reduce((sum, e) => sum + overlapMinutes(
            e.startTime, e.endTime,
            slot.startHour, slot.endHour,
            dayStart,
          ), 0)

        const rawScore = totalMinutes > 0 ? (matchingMinutes / totalMinutes) * 100 : 0
        score = Math.min(rawScore, 100)
        deviation = score < 50
          ? `${Math.round(matchingMinutes)}/${totalMinutes} 分钟符合预期类型`
          : ''
      }
    }

    return { slot, score: Math.round(score), actualMinutes: Math.round(actualMinutes), totalMinutes, deviation }
  })

  const hardScores = slotFittings.filter((s) => s.slot.constraintType === 'hard').map((s) => s.score)
  const averageScore = slotFittings.length > 0
    ? Math.round(slotFittings.reduce((s, f) => s + f.score, 0) / slotFittings.length)
    : 0
  const hardConstraintRate = hardScores.length > 0
    ? Math.round(hardScores.reduce((s, sc) => s + sc, 0) / hardScores.length)
    : 0

  return { weekday, slots: slotFittings, averageScore, hardConstraintRate }
}

/**
 * 计算一周的贴合度。
 *
 * @param weekStart      周一开始时间戳（UTC ms）
 * @param weekEvents     周内所有事件
 * @param template       理想周模板
 */
export function computeWeekFitting(
  weekStart: number,
  weekEvents: ReadonlyArray<{ startTime: number; endTime: number; categoryId: EventColor }>,
  template: IdealWeekTemplate,
): WeekFitting {
  const days: DayFitting[] = []

  for (let i = 0; i < 7; i++) {
    const dateTs = weekStart + i * 86_400_000
    const daySlots = template.slots.filter((s) => s.weekday === i)
    const dayEvents = weekEvents.filter((e) => {
      const eDayStart = getLocalDayStart(e.startTime)
      const targetDayStart = getLocalDayStart(dateTs)
      return Math.abs(eDayStart - targetDayStart) < 86_400_000
    })

    const fitting = computeDayFitting(dateTs, dayEvents, daySlots)
    days.push(fitting)
  }

  const allScores = days.flatMap((d) => d.slots.map((s) => s.score))
  const hardScores = days.flatMap((d) =>
    d.slots.filter((s) => s.slot.constraintType === 'hard').map((s) => s.score),
  )
  const softScores = days.flatMap((d) =>
    d.slots.filter((s) => s.slot.constraintType === 'soft').map((s) => s.score),
  )

  return {
    days,
    averageScore: allScores.length > 0
      ? Math.round(allScores.reduce((s, sc) => s + sc, 0) / allScores.length)
      : 0,
    hardConstraintRate: hardScores.length > 0
      ? Math.round(hardScores.reduce((s, sc) => s + sc, 0) / hardScores.length)
      : 0,
    softConstraintRate: softScores.length > 0
      ? Math.round(softScores.reduce((s, sc) => s + sc, 0) / softScores.length)
      : 0,
  }
}
