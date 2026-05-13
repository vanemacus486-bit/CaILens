import { describe, it, expect } from 'vitest'
import {
  timeToMinuteAxis,
  minuteAxisToTime,
  minuteAxisToDayIndex,
  minuteAxisToMinutesInDay,
  MINUTES_PER_DAY,
} from '../minuteAxis'
import { getWeekDays, getWeekStart } from '../time'

function weekDays(): Date[] {
  return getWeekDays(getWeekStart(new Date('2026-05-11T00:00:00Z'), 1))
}

describe('timeToMinuteAxis', () => {
  it('周一 00:00 → 0', () => {
    const days = weekDays()
    expect(timeToMinuteAxis(days[0].getTime(), days)).toBe(0)
  })

  it('周一 12:00 → 720', () => {
    const days = weekDays()
    expect(timeToMinuteAxis(days[0].getTime() + 12 * 3600_000, days)).toBe(720)
  })

  it('周一 23:59 → 1439', () => {
    const days = weekDays()
    expect(timeToMinuteAxis(days[0].getTime() + 23 * 3600_000 + 59 * 60_000, days)).toBe(1439)
  })

  it('周二 00:00 → 1440', () => {
    const days = weekDays()
    expect(timeToMinuteAxis(days[1].getTime(), days)).toBe(1440)
  })

  it('周二 08:00 → 1920', () => {
    const days = weekDays()
    expect(timeToMinuteAxis(days[1].getTime() + 8 * 3600_000, days)).toBe(1920)
  })

  it('周日 23:59 → 10079', () => {
    const days = weekDays()
    const sunday = days[6]
    expect(
      timeToMinuteAxis(sunday.getTime() + 23 * 3600_000 + 59 * 60_000, days),
    ).toBe(10079)
  })

  it('超出左边界 → clamp 到 0', () => {
    const days = weekDays()
    expect(timeToMinuteAxis(days[0].getTime() - 86400_000, days)).toBe(0)
  })

  it('超出右边界 → clamp 到 10080', () => {
    const days = weekDays()
    expect(
      timeToMinuteAxis(days[6].getTime() + 48 * 3600_000, days),
    ).toBe(7 * MINUTES_PER_DAY)
  })
})

describe('minuteAxisToTime', () => {
  it('与 timeToMinuteAxis 的往返一致性', () => {
    const days = weekDays()
    // 测试每个整点
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      for (let hour = 0; hour < 24; hour++) {
        const time = days[dayIdx].getTime() + hour * 3600_000
        const axis = timeToMinuteAxis(time, days)
        const roundtrip = minuteAxisToTime(axis, days)
        expect(roundtrip).toBe(time)
      }
    }
  })

  it('axis=0 → 周一 00:00', () => {
    const days = weekDays()
    expect(minuteAxisToTime(0, days)).toBe(days[0].getTime())
  })

  it('axis=1440 → 周二 00:00', () => {
    const days = weekDays()
    expect(minuteAxisToTime(1440, days)).toBe(days[1].getTime())
  })

  it('axis=1920 → 周二 08:00', () => {
    const days = weekDays()
    expect(minuteAxisToTime(1920, days)).toBe(days[1].getTime() + 8 * 3600_000)
  })

  it('axis 超出范围 → clamp 到末天', () => {
    const days = weekDays()
    const maxAxis = 7 * MINUTES_PER_DAY
    expect(minuteAxisToTime(maxAxis + 999, days)).toBe(
      days[6].getTime() + 24 * 3600_000,
    )
  })

  it('负数 axis → clamp 到首天 00:00', () => {
    const days = weekDays()
    expect(minuteAxisToTime(-100, days)).toBe(days[0].getTime())
  })
})

describe('minuteAxisToDayIndex', () => {
  it('0 → day 0', () => {
    expect(minuteAxisToDayIndex(0, 7)).toBe(0)
  })
  it('1439 → day 0', () => {
    expect(minuteAxisToDayIndex(1439, 7)).toBe(0)
  })
  it('1440 → day 1', () => {
    expect(minuteAxisToDayIndex(1440, 7)).toBe(1)
  })
  it('10080 → clamp 到 day 6', () => {
    expect(minuteAxisToDayIndex(10080, 7)).toBe(6)
  })
  it('负数 → clamp 到 day 0', () => {
    expect(minuteAxisToDayIndex(-500, 7)).toBe(0)
  })
})

describe('minuteAxisToMinutesInDay', () => {
  it('0 → 0', () => {
    expect(minuteAxisToMinutesInDay(0)).toBe(0)
  })
  it('720 → 720', () => {
    expect(minuteAxisToMinutesInDay(720)).toBe(720)
  })
  it('1440 → 0', () => {
    expect(minuteAxisToMinutesInDay(1440)).toBe(0)
  })
  it('1441 → 1', () => {
    expect(minuteAxisToMinutesInDay(1441)).toBe(1)
  })
  it('–60 → 1380', () => {
    // 负数取模：-60 % 1440 = -60, +1440 = 1380
    expect(minuteAxisToMinutesInDay(-60)).toBe(1380)
  })
})
