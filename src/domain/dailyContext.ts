/**
 * # 每日生活上下文（Daily Context）
 *
 * 需求一：轻量级每日记录层，捕捉影响作息但不属于"时间块"的生活变量。
 *
 * ## 关键约束
 *
 * 每日记录耗时必须极短（目标 20 秒内）。
 * 所有字段均为可选——用户只需填写当天关注的变量。
 *
 * ## 字段说明
 *
 * - date: UTC 日期标识（当天 00:00 UTC ms），用于按天索引
 * - lastMealTime: 最后一餐的 UTC 毫秒时间戳（含时区偏移）
 * - lastMealType: 最后一餐类型描述（如"晚饭-重油"、"宵夜-水果"）
 * - socialIntensity: 社交接触强度（1=独处, 3=正常社交, 5=高密度社交）
 * - outdoorMinutes: 户外停留分钟数
 * - exerciseIntensity: 运动强度（1=无运动, 3=中等, 5=高强度训练）
 * - mood: 当日情绪基调（1=低落, 3=平稳, 5=很好）
 * - screenHours: 屏幕使用估时（小时）
 * - specialNote: 当日值得标记的特殊事项
 * - createdAt / updatedAt: 记录时间戳
 */

export type SocialIntensity = 1 | 2 | 3 | 4 | 5
export type ExerciseIntensity = 1 | 2 | 3 | 4 | 5
export type MoodLevel = 1 | 2 | 3 | 4 | 5

/**
 * 饮食类型描述——自由文本，不做固定枚举。
 * 常用值参考：'晚饭-重油', '晚饭-轻食', '宵夜', '水果', '无(断食)', '零食'
 */
export type MealDescription = string

export interface DailyContext {
  /** Primary key: 日期标识（UTC 日期 startOfDay ms），确保每天一条 */
  id: string
  /** UTC date start ms（冗余，方便按日期查询） */
  date: number

  // ── 饮食 ──────────────────────────────────────────────
  /** 最后一餐的 UTC 毫秒时间戳（含时区偏移，用于分析就寝时间与最后一餐的时间差） */
  lastMealTime?: number
  /** 最后一餐的类型描述 */
  lastMealType?: MealDescription

  // ── 社交 ──────────────────────────────────────────────
  /** 社交接触强度 1-5 */
  socialIntensity?: SocialIntensity

  // ── 户外 ──────────────────────────────────────────────
  /** 户外停留分钟数 */
  outdoorMinutes?: number

  // ── 运动 ──────────────────────────────────────────────
  /** 运动强度 1-5 */
  exerciseIntensity?: ExerciseIntensity

  // ── 情绪 ──────────────────────────────────────────────
  /** 当日情绪基调 1-5 */
  mood?: MoodLevel

  // ── 屏幕 ──────────────────────────────────────────────
  /** 屏幕使用估时（小时） */
  screenHours?: number

  // ── 特殊标记 ──────────────────────────────────────────
  /** 当日值得标记的特殊事项 */
  specialNote?: string

  createdAt: number
  updatedAt: number
}

export type CreateDailyContextInput = Omit<
  DailyContext,
  'id' | 'createdAt' | 'updatedAt'
>

export type UpdateDailyContextInput = Pick<DailyContext, 'id'> &
  Partial<Omit<DailyContext, 'id' | 'createdAt'>>
