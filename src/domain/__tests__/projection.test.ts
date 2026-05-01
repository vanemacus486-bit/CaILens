import { describe, it, expect } from 'vitest'
import { computeAnnualProjection, LYUBISHCHEV_BENCHMARK } from '../projection'

describe('computeAnnualProjection', () => {
  it('week: 10h Type I → 520h annual', () => {
    const r = computeAnnualProjection(10, 5, 'week')
    expect(r.typeIAnnual).toBe(520)
    expect(r.typeIIAnnual).toBe(260)
  })

  it('month: 20h Type I → 240h annual', () => {
    const r = computeAnnualProjection(20, 10, 'month')
    expect(r.typeIAnnual).toBe(240)
    expect(r.typeIIAnnual).toBe(120)
  })

  it('quarter: 50h Type I → 200h annual', () => {
    const r = computeAnnualProjection(50, 30, 'quarter')
    expect(r.typeIAnnual).toBe(200)
    expect(r.typeIIAnnual).toBe(120)
  })

  it('year: 100h → 100h (1x)', () => {
    const r = computeAnnualProjection(100, 80, 'year')
    expect(r.typeIAnnual).toBe(100)
    expect(r.typeIIAnnual).toBe(80)
  })

  it('ratio is rounded percentage of benchmark', () => {
    // Half of benchmark → 50%
    const half = LYUBISHCHEV_BENCHMARK / 2
    const r = computeAnnualProjection(half / 52, 0, 'week')
    expect(r.ratio).toBe(50)
  })

  it('zero hours → zero projection', () => {
    const r = computeAnnualProjection(0, 0, 'week')
    expect(r.typeIAnnual).toBe(0)
    expect(r.typeIIAnnual).toBe(0)
    expect(r.ratio).toBe(0)
  })

  it('benchmark is 2200h', () => {
    expect(LYUBISHCHEV_BENCHMARK).toBe(2200)
  })
})
