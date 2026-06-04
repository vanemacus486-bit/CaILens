/**
 * # 每日生活上下文（Daily Context）
 *
 * 记录影响作息但不属于"时间块"的生活变量。
 * 五个子域：饮食、穿搭、卫生、娱乐、身体时序记录。
 *
 * **设计原则：**
 * - 饮食聚合自现有 MealData (typedData on events)，非全新录入
 * - 穿搭/卫生/娱乐为新增独立记录
 * - 所有记录以"天"为粒度，同一日期每子域最多一条
 * - 记录耗时目标 20 秒内（UI 层约束，domain 只定义结构）
 */

// ── 营养判定常量 ────────────────────────────────────────

/** 每日糖分标签出现次数上限（超过即判定超标） */
export const SUGAR_DAILY_LIMIT = 1
/** 每日咖啡因标签出现次数上限 */
export const CAFFEINE_DAILY_LIMIT = 1
/** 每日蔬菜标签出现次数下限（不足即判定不足） */
export const VEGETABLE_DAILY_MINIMUM = 1
/** 每日蛋白质标签出现次数下限 */
export const PROTEIN_DAILY_MINIMUM = 1

// ── 饮食 ─────────────────────────────────────────────────

export interface NutrientStatus {
  /** 当日糖分摄入次数 */
  sugarCount: number
  /** 糖分是否超标（> SUGAR_DAILY_LIMIT） */
  sugarExceeded: boolean
  /** 当日咖啡因摄入次数 */
  caffeineCount: number
  /** 咖啡因是否超标 */
  caffeineExceeded: boolean
  /** 当日蔬菜出现次数 */
  vegetableCount: number
  /** 蔬菜是否不足 */
  vegetableInsufficient: boolean
  /** 当日蛋白质出现次数 */
  proteinCount: number
  /** 蛋白质是否不足 */
  proteinInsufficient: boolean
  /** 当日宵夜次数 */
  nightSnackCount: number
  /** 当日总用餐次数（早+午+晚+宵夜 的去重餐次） */
  mealCount: number
}

/**
 * 从当日所有 MealData 聚合营养素状态。
 */
export function aggregateNutrientStatus(
  meals: ReadonlyArray<{ foodTags: readonly string[]; mealOrder: string }>,
): NutrientStatus {
  let sugarCount = 0
  let caffeineCount = 0
  let vegetableCount = 0
  let proteinCount = 0
  let nightSnackCount = 0
  const mealOrders = new Set<string>()

  for (const meal of meals) {
    mealOrders.add(meal.mealOrder)
    if (meal.mealOrder === 'night_snack') nightSnackCount++

    for (const tag of meal.foodTags) {
      if (tag === 'sugar') sugarCount++
      if (tag === 'caffeine') caffeineCount++
      if (tag === 'vegetable') vegetableCount++
      if (tag === 'protein') proteinCount++
    }
  }

  return {
    sugarCount,
    sugarExceeded: sugarCount > SUGAR_DAILY_LIMIT,
    caffeineCount,
    caffeineExceeded: caffeineCount > CAFFEINE_DAILY_LIMIT,
    vegetableCount,
    vegetableInsufficient: vegetableCount < VEGETABLE_DAILY_MINIMUM,
    proteinCount,
    proteinInsufficient: proteinCount < PROTEIN_DAILY_MINIMUM,
    nightSnackCount,
    mealCount: mealOrders.size,
  }
}

// ── 穿搭 ─────────────────────────────────────────────────

export type OutfitCategory = 'top' | 'bottom' | 'shoes' | 'accessory'

export interface OutfitItem {
  category: OutfitCategory
  /** 单品描述，如"黑色卫衣"、"牛仔裤" */
  label: string
}

export interface DailyOutfit {
  id: string
  /** 日期 YYYY-MM-DD */
  date: string
  /** 当日各穿搭单品 */
  items: OutfitItem[]
  /** 自由备注，如"下雨天"、"约会" */
  note?: string
}

// ── 卫生 ─────────────────────────────────────────────────

/** 可记录的卫生活动类型 */
export type HygieneActivity =
  | 'shower'      // 洗澡
  | 'brush_teeth' // 刷牙
  | 'skincare'    // 护肤
  | 'shave'       // 刮胡子
  | 'hair_wash'   // 洗头
  | 'nail_care'   // 修剪指甲


export const HYGIENE_ACTIVITY_LABELS: Record<HygieneActivity, { zh: string; en: string }> = {
  shower:     { zh: '洗澡',     en: 'Shower' },
  brush_teeth: { zh: '刷牙',    en: 'Brush Teeth' },
  skincare:   { zh: '护肤',     en: 'Skincare' },
  shave:      { zh: '刮胡子',   en: 'Shave' },
  hair_wash:  { zh: '洗头',     en: 'Hair Wash' },
  nail_care:  { zh: '修剪指甲', en: 'Nail Care' },
}

/** 每个卫生活动的分数权重 */
export const HYGIENE_ACTIVITY_SCORES: Record<HygieneActivity, number> = {
  shower:      20,
  brush_teeth: 15,
  skincare:    20,
  shave:       10,
  hair_wash:   15,
  nail_care:   10,
}

/** 单日最高卫生分数 */
export const HYGIENE_MAX_DAILY_SCORE = 100

/** 每日衰减率（基准线每天下降的分数） */
export const HYGIENE_DAILY_DECAY = 5

/** 固定基准线（图表参考线用） */
export const HYGIENE_BASELINE = 50

export interface DailyHygiene {
  id: string
  /** 日期 YYYY-MM-DD */
  date: string
  /** 当日完成的卫生活动 */
  activities: HygieneActivity[]
  /** 当日卫生总分（根据 activities 计算） */
  score: number
}

/**
 * 根据当日活动列表计算卫生分数。
 * 各活动分数累加，上限 HYGIENE_MAX_DAILY_SCORE。
 */
export function computeHygieneScore(activities: readonly HygieneActivity[]): number {
  const total = activities.reduce(
    (sum, act) => sum + (HYGIENE_ACTIVITY_SCORES[act] ?? 0),
    0,
  )
  return Math.min(total, HYGIENE_MAX_DAILY_SCORE)
}

/**
 * 计算基准线。
 * 策略：最近 N 天卫生分数的移动平均，每天衰减 HYGIENE_DAILY_DECAY。
 * 若无历史数据，返回 HYGIENE_MAX_DAILY_SCORE × 0.6 作为默认基线。
 */
export function computeHygieneBaseline(
  history: ReadonlyArray<{ date: string; score: number }>,
  windowDays = 7,
): number {
  if (history.length === 0) return HYGIENE_MAX_DAILY_SCORE * 0.6

  const recent = history.slice(-windowDays)
  const avg = recent.reduce((sum, d) => sum + d.score, 0) / recent.length

  // 基线 = 移动平均 - 衰减
  return Math.max(0, avg - HYGIENE_DAILY_DECAY)
}

/**
 * 计算跨天连续卫生分数（用于折线图时序展示）。
 * 策略：从 0 开始，每天衰减 HYGIENE_DAILY_DECAY，加上当日卫生分，不低于 0。
 */
export function computeRunningHygieneScore(
  records: ReadonlyArray<DailyHygiene>,
): Array<{ date: string; score: number }> {
  const sorted = [...records].sort(
    (a, b) => a.date.localeCompare(b.date),
  )

  let running = 0
  const timeline: Array<{ date: string; score: number }> = []

  for (const day of sorted) {
    // 每日衰减
    running = Math.max(0, running - HYGIENE_DAILY_DECAY)
    // 加上当日活动分
    running += computeHygieneScore(day.activities)
    // 不超出上限
    running = Math.min(running, HYGIENE_MAX_DAILY_SCORE)

    timeline.push({ date: day.date, score: Math.round(running) })
  }

  return timeline
}

// ── 聚合类型 ─────────────────────────────────────────────

/** 每日上下文聚合（各子域数据汇总到一天） */
export interface DailyContextSummary {
  date: string
  diet: NutrientStatus | null
  outfit: DailyOutfit | null
  hygiene: DailyHygiene | null
}
