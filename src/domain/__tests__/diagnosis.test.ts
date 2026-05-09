import { describe, it, expect } from 'vitest'
import {
  classifyStatus,
  scaleBudgetToPeriod,
  computeBudgetStatuses,
  generateDiagnosis,
  computeDistribution,
  computeDelta,
} from '../diagnosis'
import type { Category, CategoryId } from '../category'

// ── Helpers ───────────────────────────────────────────────

function makeCats(): Category[] {
  return [
    { id: 'accent', name: { zh: '主要矛盾', en: 'Core Focus' }, color: 'accent', weeklyBudget: 20, folders: [] },
    { id: 'sage',   name: { zh: '次要矛盾', en: 'Support Tasks' }, color: 'sage', weeklyBudget: 10, folders: [] },
    { id: 'sand',   name: { zh: '庶务时间', en: 'Chores & Admin' }, color: 'sand', weeklyBudget: 5, folders: [] },
    { id: 'sky',    name: { zh: '个人提升', en: 'Personal Growth' }, color: 'sky', weeklyBudget: 5, folders: [] },
    { id: 'rose',   name: { zh: '休息娱乐', en: 'Rest & Leisure' }, color: 'rose', weeklyBudget: 5, folders: [] },
    { id: 'stone',  name: { zh: '睡眠时长', en: 'Sleep' }, color: 'stone', weeklyBudget: 70, folders: [] },
  ]
}

function makeByCategory(overrides: Partial<Record<CategoryId, number>> = {}): Record<string, number> {
  return {
    accent: overrides.accent ?? 0,
    sage: overrides.sage ?? 0,
    sand: overrides.sand ?? 0,
    sky: overrides.sky ?? 0,
    rose: overrides.rose ?? 0,
    stone: overrides.stone ?? 0,
  }
}

// ── classifyStatus ─────────────────────────────────────────

describe('classifyStatus', () => {
  it('returns surplus when budget is 0', () => {
    expect(classifyStatus(5, 0)).toBe('surplus')
  })

  it('returns not_started when actual is 0 and budget > 0', () => {
    expect(classifyStatus(0, 10)).toBe('not_started')
  })

  it('returns severe_deficit when actual < 40% of budget', () => {
    expect(classifyStatus(3, 10)).toBe('severe_deficit')
  })

  it('returns deficit when actual is 40–90% of budget', () => {
    expect(classifyStatus(5, 10)).toBe('deficit')
    expect(classifyStatus(8, 10)).toBe('deficit')
  })

  it('returns on_target when actual is 90–110% of budget', () => {
    expect(classifyStatus(9, 10)).toBe('on_target')
    expect(classifyStatus(10, 10)).toBe('on_target')
    expect(classifyStatus(11, 10)).toBe('on_target')
  })

  it('returns surplus when actual > 110% of budget', () => {
    expect(classifyStatus(12, 10)).toBe('surplus')
    expect(classifyStatus(20, 10)).toBe('surplus')
  })
})

// ── scaleBudgetToPeriod ────────────────────────────────────

describe('scaleBudgetToPeriod', () => {
  it('scales weekly budget to 7 days unchanged', () => {
    expect(scaleBudgetToPeriod(20, 7)).toBe(20)
  })

  it('scales to 14 days as double', () => {
    expect(scaleBudgetToPeriod(20, 14)).toBe(40)
  })

  it('scales to 1 day as 1/7', () => {
    expect(scaleBudgetToPeriod(20, 1)).toBeCloseTo(2.857, 2)
  })
})

// ── computeBudgetStatuses ──────────────────────────────────

describe('computeBudgetStatuses', () => {
  it('computes statuses for all categories (week period)', () => {
    const cats = makeCats()
    const byCat = makeByCategory({ accent: 29, stone: 26 })

    const result = computeBudgetStatuses(byCat, cats, 7)

    expect(result).toHaveLength(6)
    // Sorted by deviation ascending: worst deficit first
    expect(result[0].categoryId).toBe('stone')  // 26-70 = -44, worst
    expect(result[5].categoryId).toBe('accent')  // 29-20 = +9, best

    const stone = result[0]
    expect(stone.deviation).toBe(-44)
    expect(stone.status).toBe('severe_deficit')

    const accent = result[5]
    expect(accent.deviation).toBe(9)
    expect(accent.status).toBe('surplus')
  })

  it('marks not_started when actual is 0 and budget exists', () => {
    const cats = makeCats()
    const byCat = makeByCategory({})

    const result = computeBudgetStatuses(byCat, cats, 7)

    for (const bs of result) {
      if (bs.weeklyBudget > 0) {
        expect(bs.status).toBe('not_started')
      }
    }
  })

  it('handles zero weekly budget gracefully', () => {
    const cats = makeCats()
    cats[0] = { ...cats[0], weeklyBudget: 0 }
    const byCat = makeByCategory({ accent: 10 })

    const result = computeBudgetStatuses(byCat, cats, 7)

    const accent = result.find((r) => r.categoryId === 'accent')
    expect(accent!.scaledBudget).toBe(0)
    expect(accent!.status).toBe('surplus')
    expect(accent!.deviationPct).toBe(999)
  })
})

// ── generateDiagnosis ──────────────────────────────────────

describe('generateDiagnosis', () => {
  it('returns 3 insight items', () => {
    const cats = makeCats()
    const byCat = makeByCategory({ accent: 29, stone: 26, sky: 0 })

    const result = generateDiagnosis(byCat, cats, 7, 'zh')

    expect(result.items).toHaveLength(3)
    expect(result.items[0].type).toBe('worst')
    expect(result.items[1].type).toBe('best')
    expect(result.items[2].type).toBe('question')
  })

  it('identifies worst as biggest deficit in hours', () => {
    const cats = makeCats()
    const byCat = makeByCategory({ accent: 29, sage: 4, stone: 26 })

    const result = generateDiagnosis(byCat, cats, 7, 'zh')

    // Worst: stone (26-70 = -44)
    expect(result.items[0].categoryId).toBe('stone')
  })

  it('identifies best as biggest surplus in hours', () => {
    const cats = makeCats()
    const byCat = makeByCategory({ accent: 29, sage: 4, stone: 26 })

    const result = generateDiagnosis(byCat, cats, 7, 'zh')

    // Best: accent (29-20 = +9)
    expect(result.items[1].categoryId).toBe('accent')
  })

  it('flags zero-hours category in question item', () => {
    // Only sky has zero hours — others have data matching budget
    const cats = makeCats()
    const byCat = makeByCategory({ accent: 20, sage: 9, sand: 4.5, sky: 0, rose: 4.5, stone: 65 })

    const result = generateDiagnosis(byCat, cats, 7, 'zh')

    expect(result.items[2].type).toBe('question')
    // The question should reference the zero-hours category
    expect(result.items[2].descZh).toContain('0h')
  })

  it('works with en language', () => {
    const cats = makeCats()
    const byCat = makeByCategory({ accent: 29, stone: 26 })

    const result = generateDiagnosis(byCat, cats, 7, 'en')

    expect(result.items[0].titleEn).toBeTruthy()
    expect(result.items[1].titleEn).toBeTruthy()
    expect(result.items[2].titleEn).toBeTruthy()
  })

  it('computes totalActual and totalBudget', () => {
    const cats = makeCats()
    const byCat = makeByCategory({ accent: 20, sage: 10, sand: 5, sky: 5, rose: 5, stone: 70 })

    const result = generateDiagnosis(byCat, cats, 7, 'zh')

    expect(result.totalActual).toBe(115)
    expect(result.totalBudget).toBeCloseTo(115)
  })
})

// ── computeDistribution ────────────────────────────────────

describe('computeDistribution', () => {
  it('returns weekday profiles from history', () => {
    const byHourSlot: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    byHourSlot[0][9] = 2 // Monday 9am: 2 hours
    byHourSlot[2][14] = 1.5 // Wednesday 2pm: 1.5 hours

    const history: number[][][] = [byHourSlot]

    const result = computeDistribution(byHourSlot, history, 0)

    expect(result.profiles).toHaveLength(7)
    expect(result.profiles[0].avgHours).toBeGreaterThan(0)
    expect(result.mostSimilarDay).not.toBeNull()
  })

  it('returns null for empty history', () => {
    const byHourSlot: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    const result = computeDistribution(byHourSlot, [], 0)

    expect(result.profiles).toHaveLength(0)
    expect(result.mostSimilarDay).toBeNull()
    expect(result.similarityScore).toBe(0)
  })
})

// ── computeDelta ───────────────────────────────────────────

describe('computeDelta', () => {
  it('returns up when current > previous', () => {
    const r = computeDelta(30, 20, [25, 20, 30])
    expect(r.direction).toBe('up')
    expect(r.deltaHours).toBe(10)
    expect(r.deltaPct).toBe(50)
    expect(r.sparklineData).toEqual([25, 20, 30])
  })

  it('returns down when current < previous', () => {
    const r = computeDelta(15, 20, [25, 20, 15])
    expect(r.direction).toBe('down')
    expect(r.deltaHours).toBe(-5)
  })

  it('returns flat when change is small', () => {
    const r = computeDelta(20.3, 20, [25, 20, 20.3])
    expect(r.direction).toBe('flat')
  })

  it('handles null previous', () => {
    const r = computeDelta(30, null, [30])
    expect(r.deltaHours).toBe(0)
    expect(r.deltaPct).toBe(0)
    expect(r.direction).toBe('flat')
  })
})
