import type { Category, CategoryId } from './category'

// ── Status classification ──────────────────────────────────

export type DeficitStatus =
  | 'severe_deficit'  // actual < 40% of budget
  | 'deficit'         // actual 40–90% of budget
  | 'not_started'     // actual = 0, budget > 0
  | 'on_target'       // actual 90–110% of budget
  | 'surplus'         // actual > 110% of budget (or budget = 0)

export function classifyStatus(actual: number, scaledBudget: number): DeficitStatus {
  if (scaledBudget === 0) return 'surplus'
  if (actual === 0) return 'not_started'
  const ratio = actual / scaledBudget
  if (ratio < 0.4) return 'severe_deficit'
  if (ratio < 0.9) return 'deficit'
  if (ratio <= 1.1) return 'on_target'
  return 'surplus'
}

// ── Budget status per category ─────────────────────────────

export interface BudgetStatus {
  categoryId: CategoryId
  weeklyBudget: number
  scaledBudget: number
  actual: number
  deviation: number      // actual - scaledBudget (negative = deficit)
  deviationPct: number   // rounded pct of |deviation|/scaledBudget
  status: DeficitStatus
}

export function scaleBudgetToPeriod(weeklyBudget: number, periodDays: number): number {
  return weeklyBudget * (periodDays / 7)
}

export function computeBudgetStatuses(
  byCategory: Record<string, number>,
  categories: readonly Category[],
  periodDays: number,
): BudgetStatus[] {
  const result: BudgetStatus[] = []

  for (const cat of categories) {
    const scaledBudget = scaleBudgetToPeriod(cat.weeklyBudget, periodDays)
    const actual = byCategory[cat.id] ?? 0
    const deviation = actual - scaledBudget
    const deviationPct = scaledBudget > 0
      ? Math.round((Math.abs(deviation) / scaledBudget) * 100)
      : (actual > 0 ? 999 : 0)
    const status = classifyStatus(actual, scaledBudget)

    result.push({
      categoryId: cat.id,
      weeklyBudget: cat.weeklyBudget,
      scaledBudget,
      actual,
      deviation,
      deviationPct,
      status,
    })
  }

  // Sort by deviation ascending (worst deficit first)
  result.sort((a, b) => a.deviation - b.deviation)
  return result
}

// ── Diagnosis insight items ────────────────────────────────

export interface DiagnosisItem {
  type: 'worst' | 'best' | 'question'
  categoryId: CategoryId
  titleZh: string
  titleEn: string
  descZh: string
  descEn: string
}

export interface DiagnosisResult {
  items: [DiagnosisItem, DiagnosisItem, DiagnosisItem]
  budgetStatuses: BudgetStatus[]
  totalActual: number
  totalBudget: number
}

function catName(categories: readonly Category[], id: CategoryId, lang: 'zh' | 'en'): string {
  return categories.find((c) => c.id === id)?.name?.[lang] ?? id
}

function fmtH(h: number): string {
  return h.toFixed(1)
}

/**
 * Generate the 3 diagnosis insight items.
 */
export function generateDiagnosis(
  byCategory: Record<string, number>,
  categories: readonly Category[],
  periodDays: number,
  language: 'zh' | 'en',
  previousByCategory?: Record<string, number>,
): DiagnosisResult {
  const zh = language === 'zh'
  const budgetStatuses = computeBudgetStatuses(byCategory, categories, periodDays)

  let totalActual = 0
  let totalBudget = 0
  for (const bs of budgetStatuses) {
    totalActual += bs.actual
    totalBudget += bs.scaledBudget
  }

  // ── Worst: biggest deficit in hours ──
  let worst: BudgetStatus | null = null
  for (const bs of budgetStatuses) {
    if (bs.deviation < 0 && (!worst || bs.deviation < worst.deviation)) {
      worst = bs
    }
  }
  // Fallback: smallest deviation (least over-budget) if no deficit
  if (!worst) {
    for (const bs of budgetStatuses) {
      if (!worst || bs.deviation < worst.deviation) worst = bs
    }
  }

  const worstItem: DiagnosisItem = (() => {
    const name = catName(categories, worst!.categoryId, language)
    const pctDone = worst!.scaledBudget > 0
      ? Math.round((worst!.actual / worst!.scaledBudget) * 100)
      : 0
    return {
      type: 'worst',
      categoryId: worst!.categoryId,
      titleZh: '你这周最大的问题：',
      titleEn: 'Biggest concern this week:',
      descZh: zh
        ? `${name} 欠缺 ${fmtH(Math.abs(worst!.deviation))}h（仅完成目标 ${pctDone}%）`
        : `${name}: ${fmtH(Math.abs(worst!.deviation))}h short (only ${pctDone}% of target)`,
      descEn: zh
        ? `${name} 欠缺 ${fmtH(Math.abs(worst!.deviation))}h（仅完成目标 ${pctDone}%）`
        : `${name}: ${fmtH(Math.abs(worst!.deviation))}h short (only ${pctDone}% of target)`,
    }
  })()

  // ── Best: biggest surplus in hours ──
  let best: BudgetStatus | null = null
  for (const bs of budgetStatuses) {
    if (bs.deviation > 0 && (!best || bs.deviation > best.deviation)) {
      best = bs
    }
  }
  // Fallback: closest to target
  if (!best) {
    let minDist = Infinity
    for (const bs of budgetStatuses) {
      const dist = Math.abs(bs.deviation)
      if (dist < minDist) { minDist = dist; best = bs }
    }
  }

  const bestItem: DiagnosisItem = (() => {
    const name = catName(categories, best!.categoryId, language)
    const overPct = best!.scaledBudget > 0
      ? Math.round((best!.deviation / best!.scaledBudget) * 100)
      : 0
    return {
      type: 'best',
      categoryId: best!.categoryId,
      titleZh: '你这周做得最好的：',
      titleEn: 'Best performer this week:',
      descZh: zh
        ? `${name} 投入 ${fmtH(best!.actual)}h（${best!.deviation >= 0 ? '超额' : '接近'} ${Math.abs(overPct)}%）`
        : `${name}: ${fmtH(best!.actual)}h (${best!.deviation >= 0 ? 'over' : 'near'} ${Math.abs(overPct)}% of target)`,
      descEn: zh
        ? `${name} 投入 ${fmtH(best!.actual)}h（${best!.deviation >= 0 ? '超额' : '接近'} ${Math.abs(overPct)}%）`
        : `${name}: ${fmtH(best!.actual)}h (${best!.deviation >= 0 ? 'over' : 'near'} ${Math.abs(overPct)}% of target)`,
    }
  })()

  // ── Question: zero-hours category, or persistent pattern ──
  const zeroCats: BudgetStatus[] = budgetStatuses.filter(
    (bs) => bs.status === 'not_started' && bs.weeklyBudget > 0,
  )
  // Also check persistent deficit when previous data exists
  let questionTarget: BudgetStatus | null = null
  let isPersistent = false

  if (zeroCats.length > 0) {
    questionTarget = zeroCats[0]
  } else if (previousByCategory) {
    // Find a category that was also below budget last period
    for (const bs of budgetStatuses) {
      if (bs.deviation < 0 && bs.deviationPct > 20) {
        const prevActual = previousByCategory[bs.categoryId] ?? 0
        if (prevActual < bs.scaledBudget * 0.9) {
          questionTarget = bs
          isPersistent = true
          break
        }
      }
    }
  }

  // Fallback: most interesting anomaly (highest deviationPct)
  if (!questionTarget) {
    let maxPct = 0
    for (const bs of budgetStatuses) {
      if (bs.deviationPct > maxPct && bs.scaledBudget > 0) {
        maxPct = bs.deviationPct
        questionTarget = bs
      }
    }
  }

  // Last resort: pick the first budgetStatus that has scaledBudget > 0
  if (!questionTarget) {
    questionTarget = budgetStatuses.find((bs) => bs.scaledBudget > 0) ?? budgetStatuses[0]
  }

  const questionItem: DiagnosisItem = (() => {
    const target = questionTarget!
    const name = catName(categories, target.categoryId, language)
    const prevActual = previousByCategory?.[target.categoryId] ?? -1
    if (target.actual === 0 && target.weeklyBudget > 0) {
      return {
        type: 'question',
        categoryId: questionTarget!.categoryId,
        titleZh: '一个值得思考的问题：',
        titleEn: 'Something to reflect on:',
        descZh: zh
          ? `${name} 0h —— 是这周特殊，还是常态？`
          : `${name} 0h — a one-off, or becoming the norm?`,
        descEn: zh
          ? `${name} 0h —— 是这周特殊，还是常态？`
          : `${name} 0h — a one-off, or becoming the norm?`,
      }
    }
    if (isPersistent && prevActual > 0) {
      return {
        type: 'question',
        categoryId: questionTarget!.categoryId,
        titleZh: '一个值得思考的问题：',
        titleEn: 'Something to reflect on:',
        descZh: zh
          ? `${name} 已连续 ${fmtH(Math.abs(questionTarget!.deviation))}h 低于预算，是否在调整优先级？`
          : `${name} has been ${fmtH(Math.abs(questionTarget!.deviation))}h under budget for consecutive periods — shifting priorities?`,
        descEn: zh
          ? `${name} 已连续 ${fmtH(Math.abs(questionTarget!.deviation))}h 低于预算，是否在调整优先级？`
          : `${name} has been ${fmtH(Math.abs(questionTarget!.deviation))}h under budget for consecutive periods — shifting priorities?`,
      }
    }
    return {
      type: 'question',
      categoryId: questionTarget!.categoryId,
      titleZh: '一个值得思考的问题：',
      titleEn: 'Something to reflect on:',
      descZh: zh
        ? `${name} 偏差幅度达 ${questionTarget!.deviationPct}%，是否在规划预期内？`
        : `${name} deviation is ${questionTarget!.deviationPct}% — within your expectations?`,
      descEn: zh
        ? `${name} 偏差幅度达 ${questionTarget!.deviationPct}%，是否在规划预期内？`
        : `${name} deviation is ${questionTarget!.deviationPct}% — within your expectations?`,
    }
  })()

  return {
    items: [worstItem, bestItem, questionItem],
    budgetStatuses,
    totalActual,
    totalBudget,
  }
}

// ── Weekday distribution / similarity ─────────────────────

export interface WeekdayProfile {
  dayIndex: number  // 0=Mon … 6=Sun
  labelZh: string
  labelEn: string
  avgHours: number
}

export interface DistributionResult {
  profiles: WeekdayProfile[]
  mostSimilarDay: WeekdayProfile | null
  similarityScore: number  // 0–1, 1 = identical
}

const DAY_LABELS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Compute per-weekday average profiles from history, and
 * find which weekday's average profile is most similar to
 * the given `currentDayIndex`'s hour distribution.
 */
export function computeDistribution(
  byHourSlot: number[][],        // current bucket's 7×24 grid
  historyByHourSlot: number[][][], // each history bucket's 7×24 grid
  currentDayIndex: number,       // 0=Mon … 6=Sun for "today"
): DistributionResult {
  // Compute average profile per weekday across all history
  const profiles: WeekdayProfile[] = []
  for (let d = 0; d < 7; d++) {
    let total = 0
    const count = historyByHourSlot.length
    if (count === 0) continue

    for (const hb of historyByHourSlot) {
      const dayTotal = (hb[d] ?? []).reduce((s, v) => s + v, 0)
      total += dayTotal
    }
    const avgHours = total / count
    profiles.push({
      dayIndex: d,
      labelZh: DAY_LABELS_ZH[d],
      labelEn: DAY_LABELS_EN[d],
      avgHours,
    })
  }

  if (profiles.length === 0) {
    return { profiles, mostSimilarDay: null, similarityScore: 0 }
  }

  // Build today's per-hour vector from the current bucket's day
  const todayVector = (byHourSlot[currentDayIndex] ?? []).slice()

  // Cosine similarity between today's vector and each weekday's average
  let bestDay = profiles[0]
  let bestScore = 0

  for (const prof of profiles) {
    const avgVector: number[] = []
    const count = historyByHourSlot.length
    for (let h = 0; h < 24; h++) {
      let sum = 0
      for (const hb of historyByHourSlot) {
        sum += (hb[prof.dayIndex] ?? [])[h] ?? 0
      }
      avgVector.push(count > 0 ? sum / count : 0)
    }

    const score = cosineSimilarity(todayVector, avgVector)
    if (score > bestScore) {
      bestScore = score
      bestDay = prof
    }
  }

  return {
    profiles,
    mostSimilarDay: bestDay,
    similarityScore: Math.round(bestScore * 100),
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const va = a[i] ?? 0
    const vb = b[i] ?? 0
    dot += va * vb
    magA += va * va
    magB += vb * vb
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

// ── Delta vs previous ──────────────────────────────────────

export interface DeltaResult {
  deltaHours: number
  deltaPct: number
  direction: 'up' | 'down' | 'flat'
  sparklineData: number[]  // total hours per period across history
}

export function computeDelta(
  currentTotal: number,
  previousTotal: number | null,
  historyTotals: number[],
): DeltaResult {
  const deltaHours = previousTotal !== null ? currentTotal - previousTotal : 0
  const deltaPct = previousTotal && previousTotal > 0
    ? Math.round((deltaHours / previousTotal) * 100)
    : 0
  const direction = deltaHours > 0.5 ? 'up' : deltaHours < -0.5 ? 'down' : 'flat'

  return {
    deltaHours,
    deltaPct,
    direction,
    sparklineData: historyTotals,
  }
}
