import { describe, it, expect } from 'vitest'
import type { CalendarEvent } from '../event'
import {
  parseHm,
  nextTriggerAt,
  bedtimeToDaily,
  averageMainSleepBedtimeHm,
  hasMainSleepLoggedTonight,
} from '../sleepReminder'

// ── 辅助 ────────────────────────────────────────────────────

/** 本地时间 → UTC ms（本地午夜对齐） */
function at(y: number, m1: number, d: number, h = 0, min = 0): number {
  return new Date(y, m1 - 1, d, h, min).getTime()
}

let seq = 0
function ev(
  title: string,
  start: number,
  end: number,
  extra: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: `e${seq++}`,
    title,
    startTime: start,
    endTime: end,
    color: 'accent',
    categoryId: 'accent',
    createdAt: start,
    updatedAt: start,
    ...extra,
  }
}

function mainSleepEv(title: string, start: number, end: number): CalendarEvent {
  return ev(title, start, end, {
    typedKey: 'sleep',
    typedData: {
      type: 'sleep',
      sleepType: 'main',
      quality: 3,
      bedtime: start,
      wakeTime: end,
    },
  })
}

// ── parseHm ─────────────────────────────────────────────────

describe('parseHm', () => {
  it('parses valid time', () => {
    expect(parseHm('23:30')).toEqual({ h: 23, m: 30 })
    expect(parseHm('00:00')).toEqual({ h: 0, m: 0 })
    expect(parseHm('07:05')).toEqual({ h: 7, m: 5 })
  })

  it('returns null for invalid input', () => {
    expect(parseHm('')).toBeNull()
    expect(parseHm('abc')).toBeNull()
    expect(parseHm('25:00')).toBeNull()
    expect(parseHm('12:60')).toBeNull()
    expect(parseHm('12')).toBeNull()
    expect(parseHm('-1:30')).toBeNull()
  })
})

// ── nextTriggerAt ───────────────────────────────────────────

describe('nextTriggerAt', () => {
  it('returns today when trigger is still ahead', () => {
    // now = 2026-06-01 22:00, bedtime=23:30, lead=30 ⇒ trigger=23:00
    const now = at(2026, 6, 1, 22, 0)
    const result = nextTriggerAt(now, '23:30', 30)
    expect(result).toBe(at(2026, 6, 1, 23, 0))
  })

  it('returns tomorrow when trigger already passed', () => {
    // now = 2026-06-02 00:30, bedtime=23:30, lead=30 ⇒ trigger=23:00 — 今天已过 ⇒ 明天 23:00
    const now = at(2026, 6, 2, 0, 30)
    const result = nextTriggerAt(now, '23:30', 30)
    expect(result).toBe(at(2026, 6, 2, 23, 0))
  })

  it('handles leadMinutes crossing midnight', () => {
    // bedtime=00:15, lead=30 ⇒ 提醒在 23:45（前一天）
    // now = 2026-06-01 23:00，还没过 23:45 ⇒ 今天 23:45
    const now = at(2026, 6, 1, 23, 0)
    const result = nextTriggerAt(now, '00:15', 30)
    expect(result).toBe(at(2026, 6, 1, 23, 45))
  })

  it('leadMinutes crossing midnight, already past trigger → take next day', () => {
    // now = 2026-06-02 00:00, bedtime=00:15, lead=30 ⇒ 提醒 23:45（昨天已过）⇒ 今天(6/2) 23:45
    const now = at(2026, 6, 2, 0, 0)
    const result = nextTriggerAt(now, '00:15', 30)
    expect(result).toBe(at(2026, 6, 2, 23, 45))
  })

  it('returns fallback for invalid bedtime', () => {
    const now = at(2026, 6, 1, 12, 0)
    const result = nextTriggerAt(now, 'invalid', 0)
    // fallback = now + DAY_MS
    expect(result).toBe(now + 86_400_000)
  })
})

// ── bedtimeToDaily ──────────────────────────────────────────

describe('bedtimeToDaily', () => {
  it('subtracts leadMinutes normally', () => {
    // 23:30 - 30min = 23:00
    expect(bedtimeToDaily('23:30', 30)).toEqual({ hour: 23, minute: 0 })
  })

  it('wraps around midnight when leadMinutes crosses', () => {
    // 00:15 - 30min = 23:45
    expect(bedtimeToDaily('00:15', 30)).toEqual({ hour: 23, minute: 45 })
  })

  it('zero leadMinutes returns same time', () => {
    expect(bedtimeToDaily('23:00', 0)).toEqual({ hour: 23, minute: 0 })
  })

  it('handles exact midnight', () => {
    // 00:00 - 15min = 23:45
    expect(bedtimeToDaily('00:00', 15)).toEqual({ hour: 23, minute: 45 })
  })

  it('returns fallback for invalid input', () => {
    expect(bedtimeToDaily('invalid', 30)).toEqual({ hour: 23, minute: 30 })
  })
})

// ── averageMainSleepBedtimeHm ───────────────────────────────

describe('averageMainSleepBedtimeHm', () => {
  it('returns null for no data', () => {
    expect(averageMainSleepBedtimeHm([], 14, at(2026, 6, 15, 12, 0))).toBeNull()
  })

  it('ignores naps and insomnia', () => {
    const now = at(2026, 6, 15, 12, 0)
    const events: CalendarEvent[] = [
      ev('nap', at(2026, 6, 14, 14, 0), at(2026, 6, 14, 15, 0), {
        typedKey: 'sleep',
        typedData: { type: 'sleep', sleepType: 'nap', bedtime: at(2026, 6, 14, 14, 0), wakeTime: at(2026, 6, 14, 15, 0) },
      }),
      ev('insomnia', at(2026, 6, 14, 2, 0), at(2026, 6, 14, 4, 0), {
        typedKey: 'sleep',
        typedData: { type: 'sleep', sleepType: 'insomnia', bedtime: at(2026, 6, 14, 2, 0), wakeTime: at(2026, 6, 14, 4, 0) },
      }),
    ]
    expect(averageMainSleepBedtimeHm(events, 14, now)).toBeNull()
  })

  it('computes average across multiple nights (no wrap)', () => {
    const now = at(2026, 6, 15, 12, 0)
    const events: CalendarEvent[] = [
      mainSleepEv('sleep', at(2026, 6, 14, 23, 0), at(2026, 6, 15, 7, 0)),
      mainSleepEv('sleep', at(2026, 6, 13, 23, 30), at(2026, 6, 14, 7, 0)),
      mainSleepEv('sleep', at(2026, 6, 12, 22, 30), at(2026, 6, 13, 6, 30)),
    ]
    // 23:00→1380, 23:30→1410, 22:30→1350 → avg=(1380+1410+1350)/3=1380 → 23:00
    expect(averageMainSleepBedtimeHm(events, 14, now)).toBe('23:00')
  })

  it('handles wrap-around (times before 18:00 treated as next day)', () => {
    const now = at(2026, 6, 15, 12, 0)
    const events: CalendarEvent[] = [
      // 01:00 → wrapped=1500 (01:00+1440)
      mainSleepEv('sleep', at(2026, 6, 15, 1, 0), at(2026, 6, 15, 8, 0)),
      // 23:00 → wrapped=1380
      mainSleepEv('sleep', at(2026, 6, 14, 23, 0), at(2026, 6, 15, 7, 0)),
    ]
    // 1500 + 1380 = 2880 / 2 = 1440 → 还原：1440-1440=0 → 00:00
    expect(averageMainSleepBedtimeHm(events, 14, now)).toBe('00:00')
  })

  it('respects the days window', () => {
    const now = at(2026, 6, 15, 12, 0)
    const events: CalendarEvent[] = [
      mainSleepEv('sleep', at(2026, 6, 14, 23, 0), at(2026, 6, 15, 7, 0)),
      // Too old (31 days ago)
      mainSleepEv('sleep', at(2026, 5, 15, 23, 0), at(2026, 5, 16, 7, 0)),
    ]
    expect(averageMainSleepBedtimeHm(events, 14, now)).toBe('23:00')
  })
})

// ── hasMainSleepLoggedTonight ───────────────────────────────

describe('hasMainSleepLoggedTonight', () => {
  it('returns true when main sleep is logged in tonight window', () => {
    const now = at(2026, 6, 15, 22, 0) // 今晚 22:00
    const events = [
      mainSleepEv('sleep', at(2026, 6, 15, 23, 30), at(2026, 6, 16, 7, 0)),
    ]
    expect(hasMainSleepLoggedTonight(events, now)).toBe(true)
  })

  it('returns false when only nap is logged', () => {
    const now = at(2026, 6, 15, 22, 0)
    const events = [
      ev('nap', at(2026, 6, 15, 14, 0), at(2026, 6, 15, 15, 0), {
        typedKey: 'sleep',
        typedData: { type: 'sleep', sleepType: 'nap', bedtime: at(2026, 6, 15, 14, 0), wakeTime: at(2026, 6, 15, 15, 0) },
      }),
    ]
    expect(hasMainSleepLoggedTonight(events, now)).toBe(false)
  })

  it('returns false when sleep was last night not tonight', () => {
    const now = at(2026, 6, 15, 22, 0)
    const events = [
      mainSleepEv('sleep', at(2026, 6, 14, 23, 0), at(2026, 6, 15, 7, 0)),
    ]
    expect(hasMainSleepLoggedTonight(events, now)).toBe(false)
  })

  it('returns true for sleep logged just after midnight (still tonight window)', () => {
    const now = at(2026, 6, 16, 1, 0) // 凌晨 1 点
    const events = [
      mainSleepEv('sleep', at(2026, 6, 16, 0, 30), at(2026, 6, 16, 8, 0)),
    ]
    // 0:30 在 today+18h ~ today+36h 窗口内
    expect(hasMainSleepLoggedTonight(events, now)).toBe(true)
  })

  it('returns false when no sleep events at all', () => {
    const now = at(2026, 6, 15, 22, 0)
    expect(hasMainSleepLoggedTonight([], now)).toBe(false)
  })
})
