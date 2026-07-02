import { bench, describe, beforeAll } from 'vitest'
import { generateSyntheticEvents } from '@/test-utils/generateSyntheticEvents'
import { computeBucket } from '@/hooks/useStatsAggregation'
import { computeDailyGrid } from '@/components/stats/YearHeatmap'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import { CailensDB } from '@/data/db'
import { IndexedDBAdapter } from '@/data/adapters/IndexedDBAdapter'
import { EventRepository } from '@/data/eventRepository'

// ── 3 年 × 30 条/天的合成数据（约 3.3 万条） ──────────────────
const SEED = 42
const YEARS = 3
const PER_DAY = 30
const now = Date.now()
const oneDayMs = 86_400_000

const events = generateSyntheticEvents(YEARS, PER_DAY, SEED)

// 为 computeDailyGrid 创建轻量 categories 数据结构
const categories = DEFAULT_CATEGORIES.map((c) => ({
  ...c,
  createdAt: now,
  updatedAt: now,
}))

// 当前周窗口
const weekStart = now - (now % (7 * oneDayMs)) - 6 * oneDayMs // 本周一 00:00 UTC
const weekEnd = weekStart + 7 * oneDayMs

// 3 年窗口
const rangeStart = now - Math.ceil(YEARS * 365.25) * oneDayMs
const rangeEnd = now

// ── EventRepository 基准（需要 fake-indexeddb） ──────────────
let repoForBench: EventRepository

beforeAll(async () => {
  const db = new CailensDB(`perf-bench-${SEED}`)
  const adapter = new IndexedDBAdapter(db)
  repoForBench = new EventRepository(adapter)

  // 使用 bulkPut 批量写入合成事件
  const BATCH_SIZE = 2000
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    await adapter.events.bulkPut(events.slice(i, i + BATCH_SIZE))
  }
})

// ── 基准 1: computeBucket × 14 连续日（模拟趋势视图） ────────
describe('computeBucket × 14 days (trend view)', () => {
  const dayMs = 86_400_000

  bench('14 consecutive computeBucket calls', () => {
    for (let i = 13; i >= 0; i--) {
      const dayStart = weekStart - i * dayMs
      const dayEnd = dayStart + dayMs
      computeBucket(events, dayStart, dayEnd)
    }
  })
})

// ── 基准 2: computeDailyGrid 365 天 ─────────────────────────
describe('computeDailyGrid 365 days', () => {
  const yearStart = now - 365 * oneDayMs

  bench('computeDailyGrid for full year', () => {
    computeDailyGrid(events, categories, yearStart, now)
  })
})

// ── 基准 3: EventRepository.getByTimeRange（当前周） ──────
describe('EventRepository.getByTimeRange (current week)', () => {
  bench('getByTimeRange for current week window', async () => {
    await repoForBench.getByTimeRange(weekStart, weekEnd)
  })
})
