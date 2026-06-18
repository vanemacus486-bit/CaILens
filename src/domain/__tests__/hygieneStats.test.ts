/**
 * # hygieneStats 测试
 *
 * 覆盖：groupHygieneByDay（typedData 优先、标题兜底、范围过滤、已删活动回退）
 */

import { describe, it, expect } from 'vitest'
import { groupHygieneByDay } from '../hygieneStats'
import { DEFAULT_HYGIENE_ACTIVITIES } from '../hygieneActivity'
import type { CalendarEvent, HygieneData } from '../event'
import { dateRange } from '../dateRange'

// ── 构造事件 ──────────────────────────────────────────────

function ev(id: string, startTime: number, title: string, typedData?: HygieneData): CalendarEvent {
  return {
    id,
    title,
    startTime,
    endTime: startTime + 600_000,
    color: 'sand',
    categoryId: 'sand',
    typedKey: typedData ? 'hygiene' : null,
    typedData,
    createdAt: 0,
    updatedAt: 0,
  }
}

// ── groupHygieneByDay ─────────────────────────────────────

describe('groupHygieneByDay', () => {
  const d15_08 = new Date(2026, 5, 15, 8, 0).getTime()
  const d15_22 = new Date(2026, 5, 15, 22, 0).getTime()
  const d16_09 = new Date(2026, 5, 16, 9, 0).getTime()
  const d01_08 = new Date(2026, 5, 1, 8, 0).getTime()
  const range = dateRange(new Date(2026, 5, 15).getTime(), new Date(2026, 5, 22).getTime())

  it('reads typed hygiene events and title-keyword fallback, ignores others', () => {
    const events = [
      // typedData 优先：标题"洗澡"但 typedData 为刷牙 → 归刷牙
      ev('a', d15_08, '洗澡', { type: 'hygiene', activity: 'brush_teeth' }),
      // 普通事件按标题兜底 → 洗澡
      ev('b', d15_22, '洗澡'),
      // 非卫生 → 排除
      ev('c', d16_09, '写代码'),
      // 范围外 → 排除
      ev('d', d01_08, '洗澡'),
    ]
    const result = groupHygieneByDay(events, range, DEFAULT_HYGIENE_ACTIVITIES, true)
    const byDate = Object.fromEntries(result.map((r) => [r.date, r.items]))

    expect(result).toHaveLength(7) // includeEmpty 填满整周
    expect(byDate['2026-06-15'].map((i) => i.activityId)).toEqual(['brush_teeth', 'shower'])
    expect(byDate['2026-06-15'][0].name).toBe('刷牙')   // 名称取活动名
    expect(byDate['2026-06-15'][0].title).toBe('洗澡')  // 原标题保留
    expect(byDate['2026-06-16']).toEqual([])
    expect(result.every((r) => r.items.every((i) => i.eventId !== 'd'))).toBe(true)
  })

  it('omits empty days when includeEmpty is false', () => {
    const events = [ev('a', d15_08, '洗澡')]
    const result = groupHygieneByDay(events, range, DEFAULT_HYGIENE_ACTIVITIES, false)
    expect(result).toHaveLength(1)
    expect(result[0].items[0].activityId).toBe('shower')
  })

  it('still shows events whose activity id was removed from config', () => {
    const minimal = DEFAULT_HYGIENE_ACTIVITIES.filter((a) => a.id === 'brush_teeth')
    const events = [ev('x', d15_08, '随手冲个凉', { type: 'hygiene', activity: 'shower' })]
    const result = groupHygieneByDay(events, range, minimal, false)
    expect(result).toHaveLength(1)
    expect(result[0].items[0].activityId).toBe('shower')
    expect(result[0].items[0].name).toBe('随手冲个凉') // 活动已删 → 回退事件标题
    expect(result[0].items[0].colorKey).toBe('sand')   // 颜色回退中性
  })
})
