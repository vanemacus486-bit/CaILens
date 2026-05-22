/**
 * # DateRange — 半开时间范围值对象
 *
 * 统一项目中散落的 `[start: number, end: number]` 裸元组。
 * 所有范围均为半开区间 [start, end)：start 闭区间，end 开区间。
 * 时间戳均为 UTC 毫秒。
 */

// ── 类型 ────────────────────────────────────────────────────

export interface DateRange {
  /** 起始时间 UTC ms（闭区间） */
  readonly start: number
  /** 结束时间 UTC ms（开区间） */
  readonly end: number
}

// ── 工厂 ────────────────────────────────────────────────────

/** 创建 DateRange，若 start > end 则自动交换 */
export function dateRange(start: number, end: number): DateRange {
  return start <= end ? { start, end } : { start: end, end: start }
}

/** 从 UTC 毫秒时间戳创建以该时刻所在自然日为边界的 24 小时范围 */
export function dayRange(dayStart: number): DateRange {
  return { start: dayStart, end: dayStart + 86_400_000 }
}

/** 从周起始时间戳创建 7 天范围 */
export function weekRange(weekStart: number): DateRange {
  return { start: weekStart, end: weekStart + 7 * 86_400_000 }
}

// ── 查询 ────────────────────────────────────────────────────

/** 时间戳是否在范围内（半开：start ≤ ts < end） */
export function contains(range: DateRange, ts: number): boolean {
  return ts >= range.start && ts < range.end
}

/** 两个范围是否有交集 */
export function overlaps(a: DateRange, b: DateRange): boolean {
  return a.start < b.end && b.start < a.end
}

/** 范围的毫秒时长 */
export function durationMs(range: DateRange): number {
  return Math.max(0, range.end - range.start)
}

// ── 裁剪 ────────────────────────────────────────────────────

/**
 * 将事件裁剪到指定范围。若事件完全在范围外则返回 null。
 * 返回新对象，不修改原事件。
 */
export interface Clippable {
  startTime: number
  endTime: number
}

export function clipToRange<T extends Clippable>(
  item: T,
  range: DateRange,
): (T & { startTime: number; endTime: number }) | null {
  const start = Math.max(item.startTime, range.start)
  const end = Math.min(item.endTime, range.end)
  if (end <= start) return null
  return { ...item, startTime: start, endTime: end }
}
