import type { CategoryId } from './category'

export type EventColor = 'accent' | 'sage' | 'sand' | 'sky' | 'rose' | 'stone'

export const EVENT_COLORS: readonly EventColor[] = [
  'accent', 'sage', 'sand', 'sky', 'rose', 'stone',
] as const

export const EVENT_COLOR_LABELS: Record<EventColor, string> = {
  accent: 'Orange',
  sage:   'Sage',
  sand:   'Sand',
  sky:    'Sky',
  rose:   'Rose',
  stone:  'Stone',
}

// ── 类型化数据 ────────────────────────────────────────────────

/** 主睡眠、小睡或失眠 */
export type SleepSubType = 'main' | 'nap' | 'insomnia'

export interface SleepData {
  type: 'sleep'
  sleepType: SleepSubType
  /** 睡眠质量 1-5 */
  quality?: 1 | 2 | 3 | 4 | 5
  hasNightmare?: boolean
  hasAwakening?: boolean
  /** 入睡时间 (与 event.startTime 等价，冗余便于独立查询) */
  bedtime: number
  /** 起床时间 (与 event.endTime 等价) */
  wakeTime: number
}

export type MealOrder = 'breakfast' | 'lunch' | 'dinner' | 'night_snack'
export type MealSource = 'home' | 'takeout' | 'dine_in' | 'convenience'

export const MEAL_TAG_OPTIONS = [
  'protein', 'staple', 'vegetable', 'fruit',
  'caffeine', 'sugar', 'alcohol', 'fried',
] as const

export type MealTag = (typeof MEAL_TAG_OPTIONS)[number]

export const MEAL_TAG_LABELS: Record<MealTag, string> = {
  protein:    '蛋白质',
  staple:     '主食',
  vegetable:  '蔬菜',
  fruit:      '水果',
  caffeine:   '咖啡因',
  sugar:      '糖分',
  alcohol:    '酒精',
  fried:      '油炸',
}

export const MEAL_TAG_LABELS_EN: Record<MealTag, string> = {
  protein:    'Protein',
  staple:     'Staple',
  vegetable:  'Vegetable',
  fruit:      'Fruit',
  caffeine:   'Caffeine',
  sugar:      'Sugar',
  alcohol:    'Alcohol',
  fried:      'Fried',
}

export const MEAL_ORDER_LABELS: Record<MealOrder, string> = {
  breakfast:   '早餐',
  lunch:       '午餐',
  dinner:      '晚餐',
  night_snack: '宵夜',
}

export const MEAL_ORDER_LABELS_EN: Record<MealOrder, string> = {
  breakfast:   'Breakfast',
  lunch:       'Lunch',
  dinner:      'Dinner',
  night_snack: 'Night Snack',
}

export const MEAL_SOURCE_LABELS: Record<MealSource, string> = {
  home:        '自做',
  takeout:     '外卖',
  dine_in:     '堂食',
  convenience: '便利店',
}

export const MEAL_SOURCE_LABELS_EN: Record<MealSource, string> = {
  home:        'Home',
  takeout:     'Takeout',
  dine_in:     'Dine-in',
  convenience: 'Convenience',
}

export interface MealData {
  type: 'meal'
  mealOrder: MealOrder
  foodTags: MealTag[]
  source: MealSource
}

/** 卫生活动事件：按真实时间点记录（与饮食 MealData 同构）。
 *  activity 为用户自定义卫生活动的 id（见 domain/hygieneActivity） */
export interface HygieneData {
  type: 'hygiene'
  activity: string
}

export type TypedEventData = SleepData | MealData | HygieneData

export function isSleepData(data: TypedEventData): data is SleepData {
  return data.type === 'sleep'
}

export function isMealData(data: TypedEventData): data is MealData {
  return data.type === 'meal'
}

export function isHygieneData(data: TypedEventData): data is HygieneData {
  return data.type === 'hygiene'
}

/** 根据时长自动判定睡眠类型：< 2h 为小睡 */
export function inferSleepType(durationMinutes: number): SleepSubType {
  return durationMinutes < 120 ? 'nap' : 'main'
}

export interface CalendarEvent {
  id: string
  title: string
  startTime: number   // UTC ms
  endTime: number     // UTC ms
  color: EventColor
  categoryId: CategoryId
  projectId?: string
  description?: string
  location?: string
  /** 类型化事件标识（"meal"/"sleep"/"hygiene"/null），便于快速筛选 */
  typedKey?: 'meal' | 'sleep' | 'hygiene' | null
  /** 类型化事件数据（Sleep / Meal / Hygiene），无此字段则为普通事件 */
  typedData?: TypedEventData
  /** 关联的目标 ID（长期目标树中的节点） */
  goalId?: string | null
  /** 软删除时间戳（UTC ms）；非空则视为已删除，不在普通查询中返回 */
  deletedAt?: number
  createdAt: number   // UTC ms
  updatedAt: number   // UTC ms
}

export type CreateEventInput = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateEventInput = Pick<CalendarEvent, 'id'> &
  Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>

/** 快速创建类型化事件的输入（简化：不要求 typedData 之外的全字段） */
export type CreateTypedEventInput = {
  title: string
  startTime: number
  endTime: number
  color: EventColor
  categoryId: CategoryId
  typedData: TypedEventData
  description?: string
}

// ── 子记录（独立存储，一对一关联 Event） ──────────────────

export interface MealRecord {
  id: string
  eventId: string
  mealOrder: MealOrder
  foodTags: MealTag[]
  source: MealSource
  createdAt: number
}

export type SleepAbnormality = 'dreaming' | 'awakening' | 'insomnia' | 'sound_sleep'

export interface SleepRecord {
  id: string
  eventId: string
  quality: 1 | 2 | 3 | 4 | 5
  subType: SleepSubType
  abnormalities: SleepAbnormality[]
  createdAt: number
}
