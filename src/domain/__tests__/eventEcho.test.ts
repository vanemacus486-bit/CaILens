import { describe, it, expect } from 'vitest'
import { computeEventEcho } from '../eventEcho'
import type { CalendarEvent } from '../event'

// ── Helpers ──────────────────────────────────────────────

const HOUR = 3_600_000

function makeEvent(
  id: string,
  title: string,
  startTime: number,
  endTime: number,
): CalendarEvent {
  return {
    id,
    title,
    startTime,
    endTime,
    color: 'accent',
    categoryId: 'accent',
    createdAt: 0,
    updatedAt: 0,
  }
}

// Anchor: Monday 2024-03-04 00:00 local = some UTC timestamp
// We pick a known local-midnight anchor.
// For simplicity, use t=0 as a monday local midnight and build around it.
// Monday 2024-01-01 00:00 local = 1704067200000 UTC (but that depends on tz).
// Let's use t=0 as monday and t=86400000 as tuesday to stay tz-agnostic.
const MONDAY_MS = 0
const TUESDAY_MS = 86_400_000
const WEDNESDAY_MS = 2 * 86_400_000
const THURSDAY_MS = 3 * 86_400_000
const FRIDAY_MS = 4 * 86_400_000
const NEXT_MONDAY_MS = 7 * 86_400_000

const WEEK_START_MS = MONDAY_MS
const MONTH_START_MS = MONDAY_MS // same week = same month for simplicity

// ── Tests ────────────────────────────────────────────────

describe('computeEventEcho', () => {
  it('weekCount: 同名 3 条在同周 → 3', () => {
    const target = makeEvent('e1', '晨跑', WEDNESDAY_MS, WEDNESDAY_MS + HOUR)
    const candidates = [
      target,
      makeEvent('e2', '晨跑', MONDAY_MS, MONDAY_MS + HOUR),
      makeEvent('e3', '晨跑', FRIDAY_MS, FRIDAY_MS + HOUR),
    ]
    const result = computeEventEcho(target, candidates, WEEK_START_MS, MONTH_START_MS)
    expect(result.weekCount).toBe(3)
  })

  it('weekCount: 下周同名不计入本周', () => {
    const target = makeEvent('e1', '阅读', TUESDAY_MS, TUESDAY_MS + HOUR)
    const candidates = [
      target,
      makeEvent('e2', '阅读', NEXT_MONDAY_MS, NEXT_MONDAY_MS + HOUR),
    ]
    const result = computeEventEcho(target, candidates, WEEK_START_MS, MONTH_START_MS)
    expect(result.weekCount).toBe(1)
  })

  it('monthTotalMs: 上月同名不计入本月累计', () => {
    const lastMonthMs = MONDAY_MS - 30 * 86_400_000
    const target = makeEvent('e1', '写作', WEDNESDAY_MS, WEDNESDAY_MS + 2 * HOUR)
    const candidates = [
      target,
      makeEvent('e2', '写作', lastMonthMs, lastMonthMs + HOUR),
    ]
    const result = computeEventEcho(target, candidates, WEEK_START_MS, MONTH_START_MS)
    // 只计本月（>= monthStartMs 且 <= target.startTime）
    expect(result.monthTotalMs).toBe(2 * HOUR)
  })

  it('monthTotalMs: 本月多条同名求和', () => {
    const target = makeEvent('e1', '编码', FRIDAY_MS, FRIDAY_MS + 3 * HOUR)
    const candidates = [
      target,
      makeEvent('e2', '编码', MONDAY_MS, MONDAY_MS + 2 * HOUR),
      makeEvent('e3', '编码', TUESDAY_MS, TUESDAY_MS + HOUR),
    ]
    const result = computeEventEcho(target, candidates, WEEK_START_MS, MONTH_START_MS)
    expect(result.monthTotalMs).toBe(6 * HOUR)
  })

  it('daysSinceLast: 昨天 → 1', () => {
    const target = makeEvent('e1', '冥想', WEDNESDAY_MS, WEDNESDAY_MS + HOUR)
    const candidates = [
      target,
      makeEvent('e2', '冥想', TUESDAY_MS, TUESDAY_MS + HOUR),
    ]
    const result = computeEventEcho(target, candidates, WEEK_START_MS, MONTH_START_MS)
    expect(result.daysSinceLast).toBe(1)
  })

  it('daysSinceLast: 同天早些 → 0', () => {
    const target = makeEvent('e1', '午睡', WEDNESDAY_MS + 2 * HOUR, WEDNESDAY_MS + 3 * HOUR)
    const candidates = [
      target,
      makeEvent('e2', '午睡', WEDNESDAY_MS, WEDNESDAY_MS + HOUR),
    ]
    const result = computeEventEcho(target, candidates, WEEK_START_MS, MONTH_START_MS)
    expect(result.daysSinceLast).toBe(0)
  })

  it('daysSinceLast: 无 → null', () => {
    const target = makeEvent('e1', '瑜伽', WEDNESDAY_MS, WEDNESDAY_MS + HOUR)
    const result = computeEventEcho(target, [target], WEEK_START_MS, MONTH_START_MS)
    expect(result.daysSinceLast).toBeNull()
  })

  it('标题两侧空格仍匹配', () => {
    const target = makeEvent('e1', ' 晨跑 ', THURSDAY_MS, THURSDAY_MS + HOUR)
    const candidates = [
      target,
      makeEvent('e2', '晨跑', MONDAY_MS, MONDAY_MS + HOUR),
      makeEvent('e3', ' 晨跑 ', TUESDAY_MS, TUESDAY_MS + HOUR),
    ]
    const result = computeEventEcho(target, candidates, WEEK_START_MS, MONTH_START_MS)
    expect(result.weekCount).toBe(3)
  })

  it('target 之后的同名事件不影响 daysSinceLast 与 monthTotalMs', () => {
    const target = makeEvent('e1', '复盘', MONDAY_MS, MONDAY_MS + HOUR)
    const candidates = [
      target,
      makeEvent('e2', '复盘', FRIDAY_MS, FRIDAY_MS + HOUR), // future
    ]
    const result = computeEventEcho(target, candidates, WEEK_START_MS, MONTH_START_MS)
    expect(result.daysSinceLast).toBeNull() // no earlier event
    expect(result.monthTotalMs).toBe(HOUR) // only target itself
  })

  it('不同名事件不影响统计', () => {
    const target = makeEvent('e1', '跑步', WEDNESDAY_MS, WEDNESDAY_MS + HOUR)
    const candidates = [
      target,
      makeEvent('e2', '阅读', MONDAY_MS, MONDAY_MS + HOUR),
      makeEvent('e3', '跑步', TUESDAY_MS, TUESDAY_MS + HOUR),
    ]
    const result = computeEventEcho(target, candidates, WEEK_START_MS, MONTH_START_MS)
    expect(result.weekCount).toBe(2)
    expect(result.daysSinceLast).toBe(1)
  })
})
