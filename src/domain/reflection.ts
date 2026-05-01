import type { Category, CategoryId } from './category'
import type { DataMaturity } from './maturity'

// ── Input types (domain-friendly, no hook dependency) ────────

export interface StatsSnapshot {
  total: number                       // total net effective hours
  byCategory: Record<string, number>  // hours per category id
}

export interface ReflectionParams {
  current: StatsSnapshot
  previous: StatsSnapshot | null
  categories: readonly Category[]
  maturity: DataMaturity
  language: 'zh' | 'en'
}

// ── Tail quotes pool ────────────────────────────────────────

const ZH_QUOTES = [
  '记录让不可见变得可见。每一个数字背后，是一个小时的选择。',
  '时间统计不是关于效率，是关于诚实。对自己诚实。',
  '柳比歇夫记录了 56 年。每一天，每件事，不评价，只记录。',
  '数字不会说话，但它们让选择变得清晰。',
]

const EN_QUOTES = [
  'The record makes the invisible visible. Behind every number is an hour chosen.',
  'Time accounting is not about efficiency. It is about honesty — with yourself.',
  'Lyubishchev tracked for 56 years. Every day, every event. No judgment, just facts.',
  'Numbers do not speak — but they make choices visible.',
]

function pickQuote(language: 'zh' | 'en'): string {
  const pool = language === 'zh' ? ZH_QUOTES : EN_QUOTES
  // Deterministic "random" based on content, not Math.random() — keeps domain pure
  return pool[0]
}

// ── Helpers ─────────────────────────────────────────────────

const ALL_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']
const TYPE_I: CategoryId[] = ['accent', 'sky']
function catName(categories: readonly Category[], id: string, lang: 'zh' | 'en'): string {
  return categories.find((c) => c.id === id)?.name[lang] ?? id
}

function fmtH(hours: number): string {
  return hours.toFixed(1)
}

// ── Main ────────────────────────────────────────────────────

export function generateWeeklyReflection(params: ReflectionParams): string[] {
  const { current, previous, categories, maturity, language } = params
  const zh = language === 'zh'
  const total = current.total

  // ── Cold: just one sentence ────────────────────────────────
  if (maturity.maturityLevel === 'cold' || total === 0) {
    return zh
      ? [`本周净有效时间为 ${fmtH(total)}h。继续记录，数据会逐渐浮现。`]
      : [`Net effective time this period: ${fmtH(total)}h. Keep tracking — insights will emerge.`]
  }

  const sentences: string[] = []

  // ── Sentence 1: total + delta ──────────────────────────────
  if (previous && previous.total > 0) {
    const delta = total - previous.total
    const dir = delta >= 0
      ? (zh ? '增加' : 'up')
      : (zh ? '减少' : 'down')
    sentences.push(zh
      ? `本周净有效时间 ${fmtH(total)}h，比上期${dir}了 ${fmtH(Math.abs(delta))}h。`
      : `Net effective time: ${fmtH(total)}h — ${dir} by ${fmtH(Math.abs(delta))}h vs. last period.`)
  } else {
    sentences.push(zh
      ? `本周净有效时间为 ${fmtH(total)}h。`
      : `Net effective time this period: ${fmtH(total)}h.`)
  }

  // ── Sentence 2: top category ───────────────────────────────
  let topId = 'accent'
  let topHrs = 0
  for (const id of ALL_IDS) {
    const hrs = current.byCategory[id] || 0
    if (hrs > topHrs) { topHrs = hrs; topId = id }
  }
  if (topHrs > 0) {
    const name = catName(categories, topId, language)
    const pct = total > 0 ? Math.round((topHrs / total) * 100) : 0
    sentences.push(zh
      ? `${name} 以 ${fmtH(topHrs)}h（${pct}%）占据最多时间，是本周最主要的投入方向。`
      : `${name} led at ${fmtH(topHrs)}h (${pct}%), the single largest allocation.`)
  }

  // ── Sentence 3: budget-based insight ──────────────────────
  // Rule: over-budget >= 50% must be mentioned
  // Rule: zero actual with budget > 0 must be mentioned
  const severeOver: string[] = []
  const zeroRecord: string[] = []
  let typeIBudgetTotal = 0
  let typeIIBudgetTotal = 0
  let typeIActualTotal = 0
  let typeIIActualTotal = 0

  for (const cat of categories) {
    const actual = current.byCategory[cat.id] || 0
    const budget = cat.weeklyBudget
    if (budget > 0 && actual > budget * 1.5) {
      severeOver.push(cat.id)
    }
    if (budget > 0 && actual === 0) {
      zeroRecord.push(cat.id)
    }
    if (TYPE_I.includes(cat.id)) {
      typeIBudgetTotal += budget
      typeIActualTotal += actual
    } else {
      typeIIBudgetTotal += budget
      typeIIActualTotal += actual
    }
  }

  if (severeOver.length > 0) {
    const name = catName(categories, severeOver[0], language)
    const cat = categories.find((c) => c.id === severeOver[0])
    const actual = current.byCategory[severeOver[0]] || 0
    const budget = cat?.weeklyBudget ?? 0
    const over = actual - budget
    sentences.push(zh
      ? `${name} 超预算 +${fmtH(over)}h（实际 ${fmtH(actual)}h / 预算 ${fmtH(budget)}h），是本周最大的预算溢出。`
      : `${name} over budget by ${fmtH(over)}h (actual ${fmtH(actual)}h / budget ${fmtH(budget)}h), the largest overrun.`)
  }

  if (zeroRecord.length > 0) {
    const name = catName(categories, zeroRecord[0], language)
    const cat = categories.find((c) => c.id === zeroRecord[0])
    const budget = cat?.weeklyBudget ?? 0
    sentences.push(zh
      ? `${name} 本周无记录（预算 ${fmtH(budget)}h），时间去了别处。`
      : `${name} had zero hours recorded (budget ${fmtH(budget)}h) — time went elsewhere.`)
  }

  // 📊 Sentence 4: Type I vs Type II ratio ────────────────────
  if (typeIIBudgetTotal > 0 && typeIIActualTotal > 0 && typeIActualTotal > 0) {
    const ratio = typeIIActualTotal / typeIActualTotal
    const budgetRatio = typeIIBudgetTotal / typeIBudgetTotal
    if (ratio > budgetRatio * 1.3) {
      sentences.push(zh
        ? `主要矛盾与次要矛盾比例为 1:${ratio.toFixed(1)}，大于预算规划的 1:${budgetRatio.toFixed(1)}，核心专注度下降。`
        : `Core-to-support ratio is 1:${ratio.toFixed(1)}, exceeding the planned 1:${budgetRatio.toFixed(1)} — core focus declined.`)
    } else if (ratio < budgetRatio * 0.7) {
      sentences.push(zh
        ? `主要矛盾占比超过预期（1:${ratio.toFixed(1)} vs 预算 1:${budgetRatio.toFixed(1)}），核心集中度良好。`
        : `Core ratio exceeds plan (1:${ratio.toFixed(1)} vs budget 1:${budgetRatio.toFixed(1)}) — strong core focus.`)
    }
  }

  // ── Sentence 5: biggest gainer vs previous ─────────────────
  if (previous) {
    let gainerId = ''
    let gainerDelta = 0
    for (const id of ALL_IDS) {
      const delta = (current.byCategory[id] || 0) - (previous.byCategory[id] || 0)
      if (delta > gainerDelta) { gainerDelta = delta; gainerId = id }
    }
    if (gainerDelta > 0) {
      const name = catName(categories, gainerId, language)
      sentences.push(zh
        ? `${name} 增长了 ${fmtH(gainerDelta)}h，是变化最显著的方向。`
        : `${name} rose by ${fmtH(gainerDelta)}h, the most notable shift.`)
    }
  }

  // ── Tail quote ─────────────────────────────────────────────
  sentences.push(pickQuote(language))

  return sentences
}
