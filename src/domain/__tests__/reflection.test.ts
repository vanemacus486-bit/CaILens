import { describe, it, expect } from 'vitest'
import { generateWeeklyReflection } from '../reflection'
import type { StatsSnapshot, ReflectionParams } from '../reflection'
import type { Category } from '../category'
import type { DataMaturity } from '../maturity'

// ── Helpers ───────────────────────────────────────────────

function makeCats(overrides?: Partial<Record<string, Partial<Category>>>): Category[] {
  const base: Category[] = [
    { id: 'accent', name: { zh: '主要矛盾', en: 'Core Focus' }, color: 'accent', weeklyBudget: 20, folders: [] },
    { id: 'sage',   name: { zh: '次要矛盾', en: 'Support Tasks' }, color: 'sage', weeklyBudget: 10, folders: [] },
    { id: 'sand',   name: { zh: '庶务时间', en: 'Chores & Admin' }, color: 'sand', weeklyBudget: 5, folders: [] },
    { id: 'sky',    name: { zh: '个人提升', en: 'Personal Growth' }, color: 'sky', weeklyBudget: 5, folders: [] },
    { id: 'rose',   name: { zh: '休息娱乐', en: 'Rest & Leisure' }, color: 'rose', weeklyBudget: 5, folders: [] },
    { id: 'stone',  name: { zh: '睡眠时长', en: 'Sleep' }, color: 'stone', weeklyBudget: 3, folders: [] },
  ]
  if (!overrides) return base
  return base.map((c) => {
    const o = overrides[c.id]
    return o ? { ...c, ...o } : c
  })
}

function makeSnapshot(byCategory: Record<string, number>): StatsSnapshot {
  const total = Object.values(byCategory).reduce((s, v) => s + v, 0)
  return { total, byCategory }
}

function mature(): DataMaturity {
  return { daysRecorded: 30, consecutiveDays: 14, maturityLevel: 'mature' }
}

function cold(): DataMaturity {
  return { daysRecorded: 1, consecutiveDays: 1, maturityLevel: 'cold' }
}

function params(overrides: Partial<ReflectionParams>): ReflectionParams {
  return {
    current: makeSnapshot({ accent: 15, sage: 8, sand: 4, sky: 3, rose: 2, stone: 0 }),
    previous: null,
    categories: makeCats(),
    maturity: mature(),
    language: 'zh',
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────

describe('generateWeeklyReflection', () => {
  it('cold maturity returns single sentence', () => {
    const r = generateWeeklyReflection(params({ maturity: cold() }))
    expect(r).toHaveLength(1)
    expect(r[0]).toContain('净有效时间')
  })

  it('cold maturity in English returns single sentence', () => {
    const r = generateWeeklyReflection(params({ maturity: cold(), language: 'en' }))
    expect(r).toHaveLength(1)
    expect(r[0]).toContain('Net effective time')
  })

  it('zero total in cold returns single sentence', () => {
    const r = generateWeeklyReflection(params({
      maturity: cold(),
      current: makeSnapshot({}),
    }))
    expect(r).toHaveLength(1)
    expect(r[0]).toContain('0.0h')
  })

  it('mature returns multiple sentences including tail quote', () => {
    const r = generateWeeklyReflection(params({}))
    expect(r.length).toBeGreaterThanOrEqual(3)
    // Last sentence should be the tail quote
    expect(r[r.length - 1]).toBeTruthy()
  })

  it('includes total hours sentence', () => {
    const r = generateWeeklyReflection(params({}))
    expect(r.some((s) => s.includes('32.0h'))).toBe(true)
  })

  it('mentions top category', () => {
    const r = generateWeeklyReflection(params({}))
    expect(r.some((s) => s.includes('主要矛盾'))).toBe(true)
  })

  it('mentions delta when previous exists', () => {
    const prev = makeSnapshot({ accent: 10, sage: 5, sand: 4, sky: 3, rose: 2, stone: 0 })
    const r = generateWeeklyReflection(params({ previous: prev }))
    expect(r.some((s) => s.includes('增加'))).toBe(true)
  })

  it('mentions severe over-budget category (>=50%)', () => {
    // sand: budget 5, actual 11 → 120% over → >=50%
    const r = generateWeeklyReflection(params({
      current: makeSnapshot({ accent: 5, sage: 3, sand: 11, sky: 1, rose: 1, stone: 0 }),
    }))
    expect(r.some((s) => s.includes('庶务时间') && s.includes('超预算'))).toBe(true)
  })

  it('mentions zero-record category with budget', () => {
    // accent has budget 20 but actual 0
    const cur = makeSnapshot({ accent: 0, sage: 8, sand: 4, sky: 3, rose: 2, stone: 0 })
    const r = generateWeeklyReflection(params({
      current: cur,
      // accent budget stays at 20
    }))
    // Find the accent category
    const accentCat = makeCats().find((c) => c.id === 'accent')!
    expect(r.some((s) => s.includes('主要矛盾') && s.includes('无记录'))).toBe(true)
  })

  it('mentions Type I vs Type II ratio when imbalanced', () => {
    // Type I: accent+sky = 5h; Type II: sage+sand+rose+stone = 27h
    // Budget ratio: Type I=25, Type II=23 → ~1:0.92
    // Actual ratio: 1:5.4 → way above budget ratio
    const r = generateWeeklyReflection(params({
      current: makeSnapshot({ accent: 3, sage: 10, sand: 8, sky: 2, rose: 6, stone: 1 }),
    }))
    expect(r.some((s) => s.includes('主要矛盾') || s.includes('core'))).toBe(true)
    expect(r.some((s) => s.includes('比例') || s.includes('ratio'))).toBe(true)
  })

  it('works in English', () => {
    const r = generateWeeklyReflection(params({ language: 'en' }))
    expect(r.length).toBeGreaterThanOrEqual(3)
    expect(r.some((s) => s.includes('Core Focus'))).toBe(true)
    expect(r.some((s) => s.includes('32.0h'))).toBe(true)
  })

  it('no budget-based sentences when all within budget', () => {
    const cur = makeSnapshot({ accent: 10, sage: 5, sand: 2, sky: 3, rose: 3, stone: 1 })
    const r = generateWeeklyReflection(params({ current: cur }))
    // Should not mention "超预算" or "over budget" since all are within budget
    expect(r.every((s) => !s.includes('超预算') && !s.includes('over budget'))).toBe(true)
  })
})
