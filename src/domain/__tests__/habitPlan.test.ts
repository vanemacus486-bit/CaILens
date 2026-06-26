import { describe, it, expect } from 'vitest'
import type { CalendarEvent } from '../event'
import {
  type HabitPlan,
  type PlanStream,
  eventMatchesStream,
  streamHoursByDay,
  currentPhaseIndex,
  daysLeftInCurrentPhase,
  phaseWindow,
  evaluateStream,
  evaluatePlan,
  streamWeeklySeries,
  startOfLocalWeek,
} from '../habitPlan'

// Local-time helpers (match startOfLocalDay, which uses local midnight)
const at = (y: number, m1: number, d: number, h = 0, min = 0) =>
  new Date(y, m1 - 1, d, h, min).getTime()

let seq = 0
function ev(title: string, start: number, end: number, extra: Partial<CalendarEvent> = {}): CalendarEvent {
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

const s1: PlanStream = { id: 's1', label: 'phone', terms: ['刷手机', '抖音'], direction: 'decrease', color: null }
const s2: PlanStream = { id: 's2', label: 'read', terms: ['阅读'], direction: 'increase', color: null }

function makePlan(): HabitPlan {
  return {
    id: 'p1',
    title: '少刷多读',
    status: 'active',
    startDate: at(2026, 6, 1),
    phaseLengthDays: 7,
    streams: [s1, s2],
    phases: [
      { id: 'ph0', label: '宽松', targets: { s1: 3, s2: 0.5 } },
      { id: 'ph1', label: '收紧', targets: { s1: 2, s2: 1 } },
      { id: 'ph2', label: '目标', targets: { s1: 1, s2: 1.5 } },
    ],
    createdAt: 0,
    updatedAt: 0,
  }
}

describe('eventMatchesStream', () => {
  it('matches a case-insensitive substring of any term', () => {
    expect(eventMatchesStream('晚上刷手机', ['刷手机'])).toBe(true)
    expect(eventMatchesStream('刷抖音半小时', ['刷手机', '抖音'])).toBe(true)
    expect(eventMatchesStream('Read KINDLE', ['kindle'])).toBe(true)
  })
  it('does not match unrelated titles or empty terms', () => {
    expect(eventMatchesStream('吃晚饭', ['刷手机'])).toBe(false)
    expect(eventMatchesStream('刷手机', [])).toBe(false)
    expect(eventMatchesStream('', ['刷手机'])).toBe(false)
  })
})

describe('streamHoursByDay', () => {
  it('sums matching event hours into the local day', () => {
    const events = [
      ev('刷手机', at(2026, 6, 1, 10), at(2026, 6, 1, 12)), // 2h
      ev('刷抖音', at(2026, 6, 1, 20), at(2026, 6, 1, 21)), // 1h
      ev('吃饭', at(2026, 6, 1, 12), at(2026, 6, 1, 13)),   // no match
    ]
    const map = streamHoursByDay(events, s1.terms, at(2026, 6, 1), at(2026, 6, 2))
    expect(map.get(at(2026, 6, 1))).toBeCloseTo(3)
  })

  it('splits a cross-midnight event across both days', () => {
    const events = [ev('刷手机', at(2026, 6, 1, 23), at(2026, 6, 2, 1))] // 2h over midnight
    const map = streamHoursByDay(events, s1.terms, at(2026, 6, 1), at(2026, 6, 3))
    expect(map.get(at(2026, 6, 1))).toBeCloseTo(1)
    expect(map.get(at(2026, 6, 2))).toBeCloseTo(1)
  })

  it('skips soft-deleted events', () => {
    const events = [ev('刷手机', at(2026, 6, 1, 10), at(2026, 6, 1, 12), { deletedAt: at(2026, 6, 1, 13) })]
    const map = streamHoursByDay(events, s1.terms, at(2026, 6, 1), at(2026, 6, 2))
    expect(map.size).toBe(0)
  })
})

describe('currentPhaseIndex / phaseWindow / daysLeft', () => {
  const plan = makePlan()
  it('clamps before start to phase 0', () => {
    expect(currentPhaseIndex(plan, at(2026, 5, 30))).toBe(0)
  })
  it('advances by phaseLengthDays', () => {
    expect(currentPhaseIndex(plan, at(2026, 6, 1))).toBe(0)
    expect(currentPhaseIndex(plan, at(2026, 6, 7))).toBe(0)
    expect(currentPhaseIndex(plan, at(2026, 6, 8))).toBe(1)
    expect(currentPhaseIndex(plan, at(2026, 6, 15))).toBe(2)
  })
  it('clamps past the last phase', () => {
    expect(currentPhaseIndex(plan, at(2026, 7, 1))).toBe(2)
  })
  it('computes the phase window', () => {
    expect(phaseWindow(plan, 1)).toEqual({ start: at(2026, 6, 8), end: at(2026, 6, 15) })
  })
  it('counts days left in the current phase', () => {
    expect(daysLeftInCurrentPhase(plan, at(2026, 6, 1))).toBe(7)
    expect(daysLeftInCurrentPhase(plan, at(2026, 6, 7))).toBe(1)
  })
})

describe('evaluateStream — direction & target', () => {
  const plan = makePlan()

  it('decrease is on-track when daily average is at or below the ceiling', () => {
    const now = at(2026, 6, 3, 12)
    const events = [
      ev('刷手机', at(2026, 6, 1, 10), at(2026, 6, 1, 12)), // 2h
      ev('刷抖音', at(2026, 6, 2, 10), at(2026, 6, 2, 12)), // 2h
      ev('刷手机', at(2026, 6, 3, 9), at(2026, 6, 3, 11)),  // 2h
    ]
    const p = evaluateStream(plan, s1, events, now)
    expect(p.target).toBe(3)
    expect(p.actualPerDay).toBeCloseTo(2) // 6h / 3 days
    expect(p.onTrack).toBe(true)
  })

  it('decrease is off-track when over the ceiling', () => {
    const now = at(2026, 6, 3, 12)
    const events = [
      ev('刷手机', at(2026, 6, 1, 8), at(2026, 6, 1, 14)), // 6h
      ev('刷手机', at(2026, 6, 2, 8), at(2026, 6, 2, 14)), // 6h
      ev('刷手机', at(2026, 6, 3, 8), at(2026, 6, 3, 11)), // 3h
    ]
    const p = evaluateStream(plan, s1, events, now)
    expect(p.actualPerDay).toBeCloseTo(5) // 15h / 3
    expect(p.onTrack).toBe(false)
  })

  it('increase is on-track at or above the floor', () => {
    const now = at(2026, 6, 3, 12)
    const events = [
      ev('阅读', at(2026, 6, 1, 20), at(2026, 6, 1, 21)), // 1h
      ev('阅读', at(2026, 6, 2, 20), at(2026, 6, 2, 21)), // 1h
    ]
    const p = evaluateStream(plan, s2, events, now)
    expect(p.target).toBe(0.5)
    expect(p.actualPerDay).toBeCloseTo(2 / 3)
    expect(p.onTrack).toBe(true)
  })

  it('reads the target from the *current* phase', () => {
    const now = at(2026, 6, 9, 12) // phase 1 「收紧」
    const p = evaluateStream(plan, s1, [], now)
    expect(p.target).toBe(2)
  })
})

describe('evaluateStream — streak', () => {
  const plan = makePlan()
  const compliantDays = [
    ev('刷手机', at(2026, 6, 1, 10), at(2026, 6, 1, 12)), // 2h
    ev('刷手机', at(2026, 6, 2, 10), at(2026, 6, 2, 12)), // 2h
    ev('刷手机', at(2026, 6, 3, 10), at(2026, 6, 3, 12)), // 2h
  ]

  it('counts consecutive compliant days up to today', () => {
    const now = at(2026, 6, 4, 12)
    const events = [...compliantDays, ev('刷手机', at(2026, 6, 4, 8), at(2026, 6, 4, 10))] // 2h today
    expect(evaluateStream(plan, s1, events, now).currentStreak).toBe(4)
  })

  it('does not break the streak when today is not yet compliant', () => {
    const now = at(2026, 6, 4, 12)
    const events = [...compliantDays, ev('刷手机', at(2026, 6, 4, 5), at(2026, 6, 4, 10))] // 5h today (over)
    // today over the ceiling, but it's still in progress → streak counts 06-01..03
    expect(evaluateStream(plan, s1, events, now).currentStreak).toBe(3)
  })

  it('breaks the streak on a past non-compliant day', () => {
    const now = at(2026, 6, 4, 12)
    const events = [
      ev('刷手机', at(2026, 6, 1, 10), at(2026, 6, 1, 12)), // 2h
      ev('刷手机', at(2026, 6, 2, 10), at(2026, 6, 2, 12)), // 2h
      ev('刷手机', at(2026, 6, 3, 6), at(2026, 6, 3, 12)),  // 6h (over) — breaks here
      ev('刷手机', at(2026, 6, 4, 8), at(2026, 6, 4, 10)),  // 2h today
    ]
    expect(evaluateStream(plan, s1, events, now).currentStreak).toBe(1)
  })
})

describe('streamWeeklySeries', () => {
  it('buckets matching hours by week and sets target = phase target × 7', () => {
    const plan = makePlan()
    const now = at(2026, 6, 3, 12) // phase 0 「宽松」, s1 target 3/day
    const thisWeek = startOfLocalWeek(now)
    const lastWeek = thisWeek - 7 * 86_400_000
    const events = [
      ev('刷手机', thisWeek + 2 * 86_400_000 + 10 * 3_600_000, thisWeek + 2 * 86_400_000 + 12 * 3_600_000), // 2h this week
      ev('刷手机', lastWeek + 86_400_000 + 10 * 3_600_000, lastWeek + 86_400_000 + 13 * 3_600_000),         // 3h last week
    ]
    const series = streamWeeklySeries(plan, s1, events, now, 2)
    expect(series).toHaveLength(2)
    expect(series[0].weekStart).toBe(lastWeek)
    expect(series[1].weekStart).toBe(thisWeek)
    expect(series[0].actual).toBeCloseTo(3)
    expect(series[1].actual).toBeCloseTo(2)
    expect(series[1].target).toBeCloseTo(21) // 3/day × 7
  })
})

describe('evaluatePlan', () => {
  it('aggregates current-phase progress for every stream', () => {
    const plan = makePlan()
    const now = at(2026, 6, 2, 12)
    const events = [
      ev('刷手机', at(2026, 6, 1, 10), at(2026, 6, 1, 12)),
      ev('阅读', at(2026, 6, 1, 20), at(2026, 6, 1, 21)),
    ]
    const prog = evaluatePlan(plan, events, now)
    expect(prog.phaseIndex).toBe(0)
    expect(prog.phaseLabel).toBe('宽松')
    expect(prog.streams.map((s) => s.streamId)).toEqual(['s1', 's2'])
  })
})
