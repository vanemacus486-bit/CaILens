import type { CategoryId } from './category'

// ── Types ──────────────────────────────────────────────────

export interface WeeklyEstimate {
  id: string              // crypto.randomUUID()
  weekStart: number       // UTC ms, Monday 00:00
  categoryId: CategoryId
  estimatedHours: number
  createdAt: number       // UTC ms
}

export interface EstimateDeviation {
  categoryId: CategoryId
  estimated: number
  actual: number
  deviation: number       // actual - estimated (positive = underestimated)
  deviationPct: number    // (deviation / estimated) * 100, capped at ±999
}

export type BiasType = 'overestimate' | 'underestimate' | 'none'

export interface SystematicBias {
  categoryId: CategoryId
  biasType: BiasType
  consecutiveWeeks: number
}

// ── Pure functions ─────────────────────────────────────────

const BIAS_THRESHOLD = 0.3  // ±30%

/**
 * Compute per-category deviation between estimates and actuals.
 * `actualByCategory` is a Record<CategoryId, number> of actual hours.
 */
export function computeDeviations(
  estimates: readonly WeeklyEstimate[],
  actualByCategory: Record<string, number>,
): EstimateDeviation[] {
  const result: EstimateDeviation[] = []

  for (const est of estimates) {
    const actual = actualByCategory[est.categoryId] || 0
    const deviation = actual - est.estimatedHours
    const deviationPct = est.estimatedHours > 0
      ? Math.round((deviation / est.estimatedHours) * 100)
      : (actual > 0 ? 999 : 0)

    result.push({
      categoryId: est.categoryId,
      estimated: est.estimatedHours,
      actual,
      deviation,
      deviationPct,
    })
  }

  return result
}

/**
 * Detects systematic bias across consecutive weeks of estimate data.
 *
 * Returns bias if the same category has been consistently over- or under-estimated
 * for `minConsecutiveWeeks` (default 3) consecutive weeks.
 *
 * `history` should be an array of deviation arrays, one per week, ordered
 * from oldest to newest.
 */
export function detectSystematicBias(
  history: readonly (readonly EstimateDeviation[]) [],
  minConsecutiveWeeks = 3,
): SystematicBias[] {
  if (history.length < minConsecutiveWeeks) return []

  const recent = history.slice(-minConsecutiveWeeks)
  const result: SystematicBias[] = []

  // Check each category that appears in all recent weeks
  const catIds = new Set<string>()
  for (const week of recent) {
    for (const d of week) catIds.add(d.categoryId)
  }

  for (const catId of catIds) {
    let overCount = 0
    let underCount = 0

    for (const week of recent) {
      const d = week.find((w) => w.categoryId === catId)
      if (!d || d.estimated === 0) continue
      if (d.deviationPct < -BIAS_THRESHOLD * 100) overCount++    // actual < estimated → overestimated
      if (d.deviationPct > BIAS_THRESHOLD * 100) underCount++    // actual > estimated → underestimated
    }

    if (overCount >= minConsecutiveWeeks) {
      result.push({ categoryId: catId as CategoryId, biasType: 'overestimate', consecutiveWeeks: overCount })
    } else if (underCount >= minConsecutiveWeeks) {
      result.push({ categoryId: catId as CategoryId, biasType: 'underestimate', consecutiveWeeks: underCount })
    }
  }

  return result
}
