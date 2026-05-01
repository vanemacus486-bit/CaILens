export type PeriodMultiplier = 'week' | 'month' | 'quarter' | 'year'

const MULTIPLIERS: Record<PeriodMultiplier, number> = {
  week: 52,
  month: 12,
  quarter: 4,
  year: 1,
}

/** Lyubishchev's 1966 benchmark: ~2200h of Type I (creative core) work per year */
export const LYUBISHCHEV_BENCHMARK = 2200

export interface AnnualProjection {
  typeIAnnual: number
  typeIIAnnual: number
  benchmark: number
  ratio: number  // typeIAnnual / benchmark * 100, rounded to nearest integer
}

/**
 * Projects annual Type I / Type II hours from a single period's data.
 *
 * `periodType` determines the multiplier (week=52, month=12, quarter=4, year=1).
 * `typeIHours` and `typeIIHours` are the period's totals.
 */
export function computeAnnualProjection(
  typeIHours: number,
  typeIIHours: number,
  periodType: PeriodMultiplier,
): AnnualProjection {
  const mult = MULTIPLIERS[periodType]
  const typeIAnnual = typeIHours * mult
  const typeIIAnnual = typeIIHours * mult
  const ratio = Math.round((typeIAnnual / LYUBISHCHEV_BENCHMARK) * 100)

  return {
    typeIAnnual,
    typeIIAnnual,
    benchmark: LYUBISHCHEV_BENCHMARK,
    ratio,
  }
}
