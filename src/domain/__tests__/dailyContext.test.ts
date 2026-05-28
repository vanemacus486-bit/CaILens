/**
 * # dailyContext 纯函数测试
 *
 * 覆盖：aggregateNutrientStatus, computeHygieneScore,
 *       computeHygieneBaseline, computeBMI
 */

import { describe, it, expect } from 'vitest'
import {
  aggregateNutrientStatus,
  computeHygieneScore,
  computeHygieneBaseline,
  computeBMI,
  HYGIENE_ACTIVITY_SCORES,
  HYGIENE_MAX_DAILY_SCORE,
  SUGAR_DAILY_LIMIT,
  CAFFEINE_DAILY_LIMIT,
} from '../dailyContext'

// ── aggregateNutrientStatus ───────────────────────────────

describe('aggregateNutrientStatus', () => {
  it('returns all zeros for empty meals', () => {
    const result = aggregateNutrientStatus([])
    expect(result.sugarCount).toBe(0)
    expect(result.caffeineCount).toBe(0)
    expect(result.vegetableCount).toBe(0)
    expect(result.proteinCount).toBe(0)
    expect(result.nightSnackCount).toBe(0)
    expect(result.mealCount).toBe(0)
    expect(result.sugarExceeded).toBe(false)
    expect(result.caffeineExceeded).toBe(false)
    expect(result.vegetableInsufficient).toBe(true) // no veg → insufficient
    expect(result.proteinInsufficient).toBe(true)    // no protein → insufficient
  })

  it('counts sugar and caffeine tags correctly', () => {
    const result = aggregateNutrientStatus([
      { foodTags: ['sugar', 'caffeine', 'protein'], mealOrder: 'breakfast' },
      { foodTags: ['sugar', 'fried'], mealOrder: 'lunch' },
    ])
    expect(result.sugarCount).toBe(2)
    expect(result.caffeineCount).toBe(1)
    expect(result.vegetableCount).toBe(0)
    expect(result.proteinCount).toBe(1)
    expect(result.mealCount).toBe(2)
    expect(result.sugarExceeded).toBe(true) // 2 > SUGAR_DAILY_LIMIT(1)
  })

  it('flags sugar exceeded when count exceeds limit', () => {
    const tags = Array.from({ length: SUGAR_DAILY_LIMIT + 1 }).map(() => 'sugar' as const)
    const result = aggregateNutrientStatus([
      { foodTags: tags, mealOrder: 'lunch' },
    ])
    expect(result.sugarExceeded).toBe(true)
  })

  it('flags caffeine exceeded when count exceeds limit', () => {
    const tags = Array.from({ length: CAFFEINE_DAILY_LIMIT + 1 }).map(() => 'caffeine' as const)
    const result = aggregateNutrientStatus([
      { foodTags: tags, mealOrder: 'breakfast' },
    ])
    expect(result.caffeineExceeded).toBe(true)
  })

  it('counts night snacks', () => {
    const result = aggregateNutrientStatus([
      { foodTags: [], mealOrder: 'night_snack' },
      { foodTags: [], mealOrder: 'night_snack' },
    ])
    expect(result.nightSnackCount).toBe(2)
    expect(result.mealCount).toBe(1) // same type dedup
  })

  it('aggregates across multiple meals with same order', () => {
    const result = aggregateNutrientStatus([
      { foodTags: ['protein'], mealOrder: 'lunch' },
      { foodTags: ['protein', 'vegetable'], mealOrder: 'dinner' },
    ])
    expect(result.mealCount).toBe(2)
    expect(result.proteinCount).toBe(2)
    expect(result.vegetableCount).toBe(1)
    expect(result.vegetableInsufficient).toBe(false)
  })
})

// ── computeHygieneScore ───────────────────────────────────

describe('computeHygieneScore', () => {
  it('returns 0 for empty activities', () => {
    expect(computeHygieneScore([])).toBe(0)
  })

  it('sums scores for multiple activities', () => {
    const score = computeHygieneScore(['shower', 'brush_teeth'])
    expect(score).toBe(HYGIENE_ACTIVITY_SCORES.shower + HYGIENE_ACTIVITY_SCORES.brush_teeth)
  })

  it('caps at HYGIENE_MAX_DAILY_SCORE', () => {
    const all: Array<keyof typeof HYGIENE_ACTIVITY_SCORES> = [
      'shower', 'brush_teeth', 'skincare', 'shave', 'hair_wash', 'nail_care',
    ]
    const score = computeHygieneScore(all)
    expect(score).toBeLessThanOrEqual(HYGIENE_MAX_DAILY_SCORE)
    expect(score).toBe(90)
  })

  it('ignores unknown activities', () => {
    // @ts-expect-error — testing unknown activity
    const score = computeHygieneScore(['shower', 'unknown_activity'])
    expect(score).toBe(HYGIENE_ACTIVITY_SCORES.shower)
  })
})

// ── computeHygieneBaseline ─────────────────────────────────

describe('computeHygieneBaseline', () => {
  it('returns default baseline when no history', () => {
    const baseline = computeHygieneBaseline([], 7)
    expect(baseline).toBe(HYGIENE_MAX_DAILY_SCORE * 0.6)
  })

  it('computes moving average minus decay', () => {
    const history = [
      { date: '2025-01-01', score: 80 },
      { date: '2025-01-02', score: 60 },
      { date: '2025-01-03', score: 70 },
    ]
    const avg = (80 + 60 + 70) / 3
    const expected = Math.max(0, avg - 5) // HYGIENE_DAILY_DECAY = 5
    const baseline = computeHygieneBaseline(history, 7)
    expect(baseline).toBeCloseTo(expected, 1)
  })

  it('uses only recent window', () => {
    const history = [
      { date: '2025-01-01', score: 100 },
      { date: '2025-01-02', score: 10 },
      { date: '2025-01-03', score: 10 },
    ]
    const baseline = computeHygieneBaseline(history, 2) // last 2
    const avg = (10 + 10) / 2
    expect(baseline).toBeCloseTo(Math.max(0, avg - 5), 1)
  })
})

// ── computeBMI ────────────────────────────────────────────

describe('computeBMI', () => {
  it('computes correct BMI', () => {
    const bmi = computeBMI(70, 175)
    expect(bmi).toBeCloseTo(22.9, 1) // 70 / (1.75^2) = 22.86
  })

  it('returns 0 for invalid input', () => {
    expect(computeBMI(0, 175)).toBe(0)
    expect(computeBMI(70, 0)).toBe(0)
    expect(computeBMI(-1, 175)).toBe(0)
  })

  it('rounds to 1 decimal place', () => {
    const bmi = computeBMI(72, 168)
    const expected = Math.round((72 / (1.68 * 1.68)) * 10) / 10
    expect(bmi).toBe(expected)
  })
})
