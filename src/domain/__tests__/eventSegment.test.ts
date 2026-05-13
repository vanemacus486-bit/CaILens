import { describe, it, expect } from 'vitest'
import { splitEventIntoSegments, buildSegmentsByDay } from '../eventSegment'
import type { CalendarEvent } from '../event'
import { getWeekDays, getWeekStart } from '../time'

function makeEvent(
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: 'evt-1',
    title: 'Test',
    startTime: 0,
    endTime: 0,
    color: 'stone',
    categoryId: 'stone',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

/** 周一 00:00 UTC */
function monday(): Date {
  return getWeekStart(new Date('2026-05-11T00:00:00Z'), 1)
}

function weekDays(): Date[] {
  return getWeekDays(monday())
}

describe('splitEventIntoSegments', () => {
  it('单天事件产生一个 segment', () => {
    const days = weekDays()
    const event = makeEvent({
      startTime: days[0].getTime() + 10 * 3600_000, // 周一 10:00
      endTime: days[0].getTime() + 12 * 3600_000, // 周一 12:00
    })
    const segs = splitEventIntoSegments(event, days)
    expect(segs).toHaveLength(1)
    expect(segs[0].dayIndex).toBe(0)
    expect(segs[0].isFirstSegment).toBe(true)
    expect(segs[0].isLastSegment).toBe(true)
    expect(segs[0].segmentStart).toBe(event.startTime)
    expect(segs[0].segmentEnd).toBe(event.endTime)
  })

  it('跨午夜事件产生两个 segment', () => {
    const days = weekDays()
    // 周一 23:00 → 周二 08:00
    const event = makeEvent({
      startTime: days[0].getTime() + 23 * 3600_000,
      endTime: days[1].getTime() + 8 * 3600_000,
    })
    const segs = splitEventIntoSegments(event, days)
    expect(segs).toHaveLength(2)

    // 第一段：周一
    expect(segs[0].dayIndex).toBe(0)
    expect(segs[0].isFirstSegment).toBe(true)
    expect(segs[0].isLastSegment).toBe(false)
    expect(segs[0].segmentStart).toBe(event.startTime)
    expect(segs[0].segmentEnd).toBe(days[0].getTime() + 24 * 3600_000)

    // 第二段：周二
    expect(segs[1].dayIndex).toBe(1)
    expect(segs[1].isFirstSegment).toBe(false)
    expect(segs[1].isLastSegment).toBe(true)
    expect(segs[1].segmentStart).toBe(days[1].getTime())
    expect(segs[1].segmentEnd).toBe(event.endTime)
  })

  it('跨三天事件产生三个 segment', () => {
    const days = weekDays()
    // 周一 22:00 → 周四 06:00
    const event = makeEvent({
      startTime: days[0].getTime() + 22 * 3600_000,
      endTime: days[3].getTime() + 6 * 3600_000,
    })
    const segs = splitEventIntoSegments(event, days)
    expect(segs).toHaveLength(4)

    // 首段
    expect(segs[0].isFirstSegment).toBe(true)
    expect(segs[0].isLastSegment).toBe(false)
    // 中间段（周二、周三）
    expect(segs[1].isFirstSegment).toBe(false)
    expect(segs[1].isLastSegment).toBe(false)
    expect(segs[2].isFirstSegment).toBe(false)
    expect(segs[2].isLastSegment).toBe(false)
    // 末段（周四）
    expect(segs[3].isFirstSegment).toBe(false)
    expect(segs[3].isLastSegment).toBe(true)
  })

  it('事件完全在 visibleDateRange 之外返回空数组', () => {
    const days = weekDays()
    const event = makeEvent({
      startTime: days[0].getTime() - 48 * 3600_000,
      endTime: days[0].getTime() - 24 * 3600_000,
    })
    expect(splitEventIntoSegments(event, days)).toHaveLength(0)
  })

  it('事件起始恰好在天的边界', () => {
    const days = weekDays()
    const dayStart = days[1].getTime() // 周二 00:00
    const event = makeEvent({
      startTime: dayStart,
      endTime: dayStart + 2 * 3600_000,
    })
    const segs = splitEventIntoSegments(event, days)
    expect(segs).toHaveLength(1)
    expect(segs[0].dayIndex).toBe(1)
    expect(segs[0].isFirstSegment).toBe(true)
  })
})

describe('buildSegmentsByDay', () => {
  it('将事件按天分组', () => {
    const days = weekDays()
    const e1 = makeEvent({
      id: 'e1',
      startTime: days[0].getTime() + 10 * 3600_000,
      endTime: days[0].getTime() + 12 * 3600_000,
    })
    const e2 = makeEvent({
      id: 'e2',
      startTime: days[1].getTime() + 14 * 3600_000,
      endTime: days[1].getTime() + 16 * 3600_000,
    })
    const map = buildSegmentsByDay([e1, e2], days)

    expect(map.get(0)).toHaveLength(1)
    expect(map.get(0)![0].eventId).toBe('e1')
    expect(map.get(1)).toHaveLength(1)
    expect(map.get(1)![0].eventId).toBe('e2')
    // 其他天为空
    for (let i = 2; i < 7; i++) {
      expect(map.get(i)).toHaveLength(0)
    }
  })

  it('跨天事件的 segments 分布在多天', () => {
    const days = weekDays()
    const event = makeEvent({
      id: 'cross',
      startTime: days[0].getTime() + 23 * 3600_000,
      endTime: days[2].getTime() + 2 * 3600_000,
    })
    const map = buildSegmentsByDay([event], days)

    expect(map.get(0)).toHaveLength(1)
    expect(map.get(1)).toHaveLength(1)
    expect(map.get(2)).toHaveLength(1)
  })
})
