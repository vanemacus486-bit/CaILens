/**
 * # dailyContext 纯函数测试
 *
 * 覆盖：aggregateNutrientStatus
 */

import { describe, it, expect } from 'vitest'
import {
  aggregateNutrientStatus,
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
