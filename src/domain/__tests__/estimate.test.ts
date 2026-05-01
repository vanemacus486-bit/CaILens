import { describe, it, expect } from 'vitest'
import { computeDeviations, detectSystematicBias } from '../estimate'
import type { WeeklyEstimate } from '../estimate'

function est(categoryId: string, hours: number): WeeklyEstimate {
  return {
    id: crypto.randomUUID(),
    weekStart: 0,
    categoryId: categoryId as any,
    estimatedHours: hours,
    createdAt: 0,
  }
}

// ── computeDeviations ─────────────────────────────────────

describe('computeDeviations', () => {
  it('empty estimates returns empty array', () => {
    const r = computeDeviations([], {})
    expect(r).toHaveLength(0)
  })

  it('computes deviation for matching categories', () => {
    const estimates = [est('accent', 10), est('sage', 5)]
    const actuals = { accent: 12, sage: 4 }
    const r = computeDeviations(estimates, actuals)

    expect(r).toHaveLength(2)
    expect(r[0].deviation).toBe(2)     // 12 - 10
    expect(r[0].deviationPct).toBe(20) // 2/10 * 100
    expect(r[1].deviation).toBe(-1)    // 4 - 5
    expect(r[1].deviationPct).toBe(-20)
  })

  it('category not in actuals gets zero actual', () => {
    const estimates = [est('accent', 10)]
    const r = computeDeviations(estimates, {})
    expect(r[0].actual).toBe(0)
    expect(r[0].deviation).toBe(-10)
    expect(r[0].deviationPct).toBe(-100)
  })

  it('zero estimate with actual > 0 caps at 999%', () => {
    const estimates = [est('accent', 0)]
    const actuals = { accent: 5 }
    const r = computeDeviations(estimates, actuals)
    expect(r[0].deviationPct).toBe(999)
  })

  it('zero estimate with zero actual gives 0%', () => {
    const estimates = [est('accent', 0)]
    const r = computeDeviations(estimates, {})
    expect(r[0].deviationPct).toBe(0)
  })
})

// ── detectSystematicBias ──────────────────────────────────

describe('detectSystematicBias', () => {
  it('less than min weeks returns empty', () => {
    const history = [
      computeDeviations([est('accent', 10)], { accent: 15 }),
      computeDeviations([est('accent', 10)], { accent: 16 }),
    ]
    const r = detectSystematicBias(history, 3)
    expect(r).toHaveLength(0)
  })

  it('detects systematic underestimate (actual > estimated across 3 weeks)', () => {
    const history = [
      computeDeviations([est('accent', 10)], { accent: 15 }),   // +50%
      computeDeviations([est('accent', 10)], { accent: 14 }),   // +40%
      computeDeviations([est('accent', 10)], { accent: 16 }),   // +60%
    ]
    const r = detectSystematicBias(history, 3)
    expect(r).toHaveLength(1)
    expect(r[0].categoryId).toBe('accent')
    expect(r[0].biasType).toBe('underestimate')
  })

  it('detects systematic overestimate (actual < estimated across 3 weeks)', () => {
    const history = [
      computeDeviations([est('sage', 10)], { sage: 5 }),   // -50%
      computeDeviations([est('sage', 10)], { sage: 6 }),   // -40%
      computeDeviations([est('sage', 10)], { sage: 4 }),   // -60%
    ]
    const r = detectSystematicBias(history, 3)
    expect(r).toHaveLength(1)
    expect(r[0].biasType).toBe('overestimate')
  })

  it('within-threshold deviations are not flagged', () => {
    const history = [
      computeDeviations([est('accent', 10)], { accent: 11 }),   // +10%
      computeDeviations([est('accent', 10)], { accent: 12 }),   // +20%
      computeDeviations([est('accent', 10)], { accent: 9 }),    // -10%
    ]
    const r = detectSystematicBias(history, 3)
    expect(r).toHaveLength(0)
  })
})
