import { getDayStart, getDayEnd } from './time'

export const MINUTES_PER_DAY = 24 * 60

/**
 * 将 UTC ms 时间戳映射到「分钟轴」上的位置。
 *
 * 分钟轴是一根连续的线性坐标轴，覆盖整个 visibleDateRange：
 *   dayIndex * 1440 + minutesInDay
 *
 * 周一 00:00 → 0，周一 23:59 → 1439，周二 00:00 → 1440 … 周日 23:59 → 10079。
 *
 * 跨越午夜只是分钟轴的加减法，不需要任何特殊分支。
 *
 * 如果时间落在 visibleDateRange 之外，返回 clamp 后的值而非 null，
 * 保证拖拽操作不会因指针略微超出网格而中断。
 */
export function timeToMinuteAxis(
  time: number,
  visibleDateRange: Date[],
): number {
  const firstDayStart = getDayStart(visibleDateRange[0])
  const lastDayEnd = getDayEnd(visibleDateRange[visibleDateRange.length - 1])

  if (time < firstDayStart) return 0
  if (time >= lastDayEnd) return visibleDateRange.length * MINUTES_PER_DAY

  for (let i = 0; i < visibleDateRange.length; i++) {
    const dayStart = getDayStart(visibleDateRange[i])
    const dayEnd = getDayEnd(visibleDateRange[i])
    if (time >= dayStart && time < dayEnd) {
      return i * MINUTES_PER_DAY + (time - dayStart) / 60_000
    }
  }

  return 0
}

/**
 * 将分钟轴位置映射回 UTC ms 时间戳。
 * axis 超出范围时 clamp 到首/末天，不抛异常。
 */
export function minuteAxisToTime(
  axis: number,
  visibleDateRange: Date[],
): number {
  const dayCount = visibleDateRange.length
  const maxAxis = dayCount * MINUTES_PER_DAY
  const clamped = Math.max(0, Math.min(maxAxis, axis))
  const dayIndex = Math.min(dayCount - 1, Math.floor(clamped / MINUTES_PER_DAY))
  const minutesInDay = clamped - dayIndex * MINUTES_PER_DAY

  const dayStart = getDayStart(visibleDateRange[dayIndex])
  return dayStart + minutesInDay * 60_000
}

/** 从分钟轴位置提取天索引（0-based） */
export function minuteAxisToDayIndex(axis: number, dayCount: number): number {
  return Math.max(0, Math.min(dayCount - 1, Math.floor(axis / MINUTES_PER_DAY)))
}

/** 从分钟轴位置提取当天内的分钟数 [0, 1440) */
export function minuteAxisToMinutesInDay(axis: number): number {
  return ((axis % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}
