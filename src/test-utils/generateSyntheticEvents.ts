import type { CalendarEvent } from '@/domain/event'
import type { CategoryId } from '@/domain/category'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import type { EventColor } from '@/domain/event'

/**
 * Mulberry32 — 确定性的 32 位 PRNG（seed 相同则序列相同）。
 * 返回 [0, 1) 的浮点数。
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 返回 [lo, hi) 的随机整数 */
function randInt(rng: () => number, lo: number, hi: number): number {
  return Math.floor(rng() * (hi - lo)) + lo
}

/** 从一个固定数组中随机选一个 */
function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[randInt(rng, 0, arr.length)]
}

const EVENT_TITLES: Record<CategoryId, readonly string[]> = {
  accent:  ['编程', '写文档', 'Debug', 'Code Review', '设计架构'],
  sage:    ['阅读', '学习日语', '看书', '记笔记', '刷题'],
  sand:    ['开会', '回复邮件', '写作', '做 PPT', '汇报'],
  sky:     ['跑步', '散步', '健身', '做瑜伽', '打羽毛球'],
  rose:    ['吃饭', '做饭', '洗碗', '买菜', '聚餐'],
  stone:   ['睡觉', '午休', '打盹', '失眠'],
}

const CATEGORY_IDS: readonly CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

/** 确定性的创建/更新时间戳 —— 种子 + 计数器决定，不依赖 Date.now() */
function synthTime(seed: number, id: number): number {
  return 1_700_000_000_000 + ((seed * 100_003 + id * 7) % 1_000_000_000)
}

/**
 * 生成确定性的合成事件数据。
 *
 * @param years  跨越的年数（从 "今天" 往回推）
 * @param perDay 每天平均事件数（泊松分布近似）
 * @param seed   随机种子，相同 seed 产生完全相同的事件流
 *
 * 特性：
 * - 约 1% 的事件是跨天睡眠（22:00→次日 07:00）
 * - 约 0.1% 的事件是超长事件（>7 天，模拟 ICS 导入的假期）
 * - 事件的时间戳分布在一天的各个时段
 * - 每个事件都有合理的 categoryId, color（两者一致），及其他必备字段
 */
export function generateSyntheticEvents(
  years: number,
  perDay: number,
  seed: number = 42,
): CalendarEvent[] {
  const rng = mulberry32(seed)
  const BASE_NOW = 1_700_000_000_000 + seed * 1_000_000
  const now = BASE_NOW
  const dayMs = 86_400_000
  const totalDays = Math.ceil(years * 365.25)
  const rangeStart = now - totalDays * dayMs
  const events: CalendarEvent[] = []
  let idCounter = 0

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const dayStart = rangeStart + dayOffset * dayMs
    // 每天的事件数 = 泊松模拟：perDay ± 随机波动
    const count = Math.max(0, Math.round(perDay + (rng() - 0.5) * 2))
    if (count === 0) continue

    for (let i = 0; i < count; i++) {
      const catId = pick(rng, CATEGORY_IDS)
      // 大部分事件时长在 5 分钟 ~ 3 小时之间
      const durationMs = randInt(rng, 5 * 60_000, 3 * 3_600_000)
      // 时间在 06:00 ~ 23:59 之间随机
      const hour = randInt(rng, 6, 23)
      const minute = randInt(rng, 0, 60)
      const startTime = dayStart + hour * 3_600_000 + minute * 60_000
      const endTime = startTime + durationMs

      // 约 1% 是跨天睡眠事件
      const isCrossDay = rng() < 0.01
      // 约 0.1% 是超长事件
      const isLongEvent = rng() < 0.001

      if (isCrossDay) {
        events.push(makeSleepEvent(rng, seed, rangeStart, dayOffset, catId, idCounter++))
      } else if (isLongEvent) {
        events.push(makeLongEvent(rng, seed, rangeStart, dayOffset, catId, idCounter++))
      } else {
        events.push({
          id: `synth-${seed}-${idCounter++}`,
          title: pick(rng, EVENT_TITLES[catId]),
          startTime,
          endTime,
          color: catId as EventColor,
          categoryId: catId,
          createdAt: synthTime(seed, idCounter),
          updatedAt: synthTime(seed, idCounter),
        })
      }
    }
  }

  // 确保按 startTime 排序（外部查询期望的排序）
  events.sort((a, b) => a.startTime - b.startTime)
  return events
}

function makeSleepEvent(
  rng: () => number,
  seed: number,
  rangeStart: number,
  dayOffset: number,
  catId: CategoryId,
  id: number,
): CalendarEvent {
  // 睡眠通常发生在晚上 22:00～00:00 入睡，次日 06:00～08:00 起床
  const bedHour = randInt(rng, 22, 24)
  const bedMin = randInt(rng, 0, 60)
  const wakeHour = randInt(rng, 6, 8)
  const wakeMin = randInt(rng, 0, 60)

  const dayMs = 86_400_000
  const dayStart = rangeStart + dayOffset * dayMs

  return {
    id: `synth-sleep-${id}`,
    title: '睡觉',
    startTime: dayStart + bedHour * 3_600_000 + bedMin * 60_000,
    endTime: dayStart + dayMs + wakeHour * 3_600_000 + wakeMin * 60_000,
    color: catId as EventColor,
    categoryId: catId,
    typedKey: 'sleep',
    typedData: {
      type: 'sleep',
      sleepType: 'main',
      bedtime: dayStart + bedHour * 3_600_000 + bedMin * 60_000,
      wakeTime: dayStart + dayMs + wakeHour * 3_600_000 + wakeMin * 60_000,
      quality: randInt(rng, 1, 6) as 1 | 2 | 3 | 4 | 5,
    },
    createdAt: synthTime(seed, id),
    updatedAt: synthTime(seed, id),
  }
}

function makeLongEvent(
  rng: () => number,
  seed: number,
  rangeStart: number,
  dayOffset: number,
  catId: CategoryId,
  id: number,
): CalendarEvent {
  const dayMs = 86_400_000
  const dayStart = rangeStart + dayOffset * dayMs
  // 超长事件：7 ~ 14 天（7 为保底，用 >= 语义）
  const durationDays = randInt(rng, 7, 14)

  return {
    id: `synth-long-${id}`,
    title: '假期',
    startTime: dayStart + 9 * 3_600_000, // 09:00
    endTime: dayStart + 9 * 3_600_000 + durationDays * dayMs,
    color: catId as EventColor,
    categoryId: catId,
    createdAt: synthTime(seed, id),
    updatedAt: synthTime(seed, id),
  }
}
