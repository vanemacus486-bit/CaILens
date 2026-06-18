/**
 * # 每日生活上下文（Daily Context）
 *
 * 记录影响作息但不属于"时间块"的生活变量。
 * 子域：饮食、穿搭。（卫生已改为类型化事件，见 domain/hygieneActivity.ts）
 *
 * **设计原则：**
 * - 饮食聚合自现有 MealData (typedData on events)，非全新录入
 * - 穿搭为新增独立记录
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
