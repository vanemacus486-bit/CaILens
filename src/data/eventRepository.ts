import type { CalendarEvent, CreateEventInput, EventColor, UpdateEventInput } from '@/domain/event'
import type { CategoryId } from '@/domain/category'
import type { StorageAdapter } from './adapters/StorageAdapter'

export interface Clock {
  now(): number
}

export interface IdGenerator {
  generate(): string
}

export class EventRepository {
  private adapter: StorageAdapter
  private clock: Clock
  private idGen: IdGenerator

  constructor(
    adapter: StorageAdapter,
    clock: Clock = { now: () => Date.now() },
    idGen: IdGenerator = { generate: () => crypto.randomUUID() },
  ) {
    this.adapter = adapter
    this.clock   = clock
    this.idGen   = idGen
  }

  async getByTimeRange(start: number, end: number): Promise<CalendarEvent[]> {
    // 两段查询并集，避免扫描全部历史。
    //
    // Q1（主查询）：startTime between [start − MAX_SPAN, end)
    //   → 过滤 endTime > start && !deletedAt
    //   覆盖当天、跨天睡眠等绝大多数事件（MAX_SPAN = 14 天）
    //
    // Q2（兜尾）：捕获 startTime < start − MAX_SPAN 却仍延续到 start 之后的
    //   超长事件（如 ICS 导入的多周条目）。谓词固定，但走哪个索引代价悬殊：
    //   - start 接近当下（周视图）：endTime > start 的事件很少 → 扫 endTime 索引；
    //   - start 在很久以前（复盘拉 3 年）：endTime > start 几乎是全表，
    //     而「比窗口更早开始」的历史事件反而少 → 扫 startTime 索引。
    //   两种扫法结果集相同，只是索引侧不同。若选错（宽范围走 endTime 索引），
    //   复盘加载会比不优化还多扫一遍全表——这是踩过的真实回归。
    const MAX_SPAN = 14 * 86_400_000
    const OLD_START_THRESHOLD = 90 * 86_400_000

    const tailQuery = (): Promise<CalendarEvent[]> => {
      // 窗口下界已顶到纪元附近，不存在更早的事件
      if (start <= MAX_SPAN) return Promise.resolve([])
      if (this.clock.now() - start > OLD_START_THRESHOLD) {
        return this.adapter.events.query({
          where: { key: 'startTime', op: 'below', value: start - MAX_SPAN },
          filter: (e) => !e.deletedAt && e.endTime > start,
        })
      }
      return this.adapter.events.query({
        where: { key: 'endTime', op: 'above', value: start },
        filter: (e) => !e.deletedAt && e.startTime < start - MAX_SPAN,
      })
    }

    const [q1, q2] = await Promise.all([
      this.adapter.events.query({
        where: { key: 'startTime', op: 'between', value: [start - MAX_SPAN, end] },
        filter: (e) => !e.deletedAt && e.endTime > start,
      }),
      tailQuery(),
    ])

    // 按 id 去重合并
    const seen = new Set<string>()
    const merged: CalendarEvent[] = []
    for (const e of [...q1, ...q2]) {
      if (!seen.has(e.id)) {
        seen.add(e.id)
        merged.push(e)
      }
    }
    merged.sort((a, b) => a.startTime - b.startTime)
    return merged
  }

  async getById(id: string): Promise<CalendarEvent | undefined> {
    const e = await this.adapter.events.get(id)
    return e?.deletedAt ? undefined : e
  }

  async create(input: CreateEventInput): Promise<CalendarEvent> {
    const now = this.clock.now()
    const event: CalendarEvent = {
      ...input,
      id: this.idGen.generate(),
      createdAt: now,
      updatedAt: now,
    }
    await this.adapter.events.put(event)
    return event
  }

  async update(input: UpdateEventInput): Promise<CalendarEvent> {
    const existing = await this.adapter.events.get(input.id)
    if (existing === undefined) {
      throw new Error(`Event not found: ${input.id}`)
    }
    const updated: CalendarEvent = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: this.clock.now(),
    }
    await this.adapter.events.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.adapter.events.get(id)
    if (!existing) return
    await this.adapter.events.put({ ...existing, deletedAt: this.clock.now(), updatedAt: this.clock.now() })
  }

  async bulkCreate(inputs: CreateEventInput[]): Promise<CalendarEvent[]> {
    if (inputs.length === 0) return []
    const now = this.clock.now()
    const events: CalendarEvent[] = inputs.map((input) => ({
      ...input,
      id: this.idGen.generate(),
      createdAt: now,
      updatedAt: now,
    }))
    await this.adapter.events.bulkPut(events)
    return events
  }

  async bulkUpdateTimes(updates: { id: string; startTime: number; endTime: number }[]): Promise<void> {
    if (updates.length === 0) return
    const now = this.clock.now()
    await this.adapter.events.transaction('rw', async () => {
      const ids = updates.map((u) => u.id)
      const existing = await this.adapter.events.bulkGet(ids)
      const patched = existing.flatMap((e, i) => {
        if (e === undefined) return []
        return [{ ...e, startTime: updates[i].startTime, endTime: updates[i].endTime, updatedAt: now }]
      })
      await this.adapter.events.bulkPut(patched)
    })
  }

  async getAll(): Promise<CalendarEvent[]> {
    const all = await this.adapter.events.getAll()
    return all.filter((e) => !e.deletedAt)
  }

  async search(query: string, limit = 50): Promise<CalendarEvent[]> {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const results = await this.adapter.events.query({
      filter: (e) => {
        if (e.deletedAt) return false
        if (e.title.toLowerCase().includes(q)) return true
        if (e.description && e.description.toLowerCase().includes(q)) return true
        if (e.location && e.location.toLowerCase().includes(q)) return true
        return false
      },
      limit,
    })

    return results.sort((a, b) => b.startTime - a.startTime)
  }

  async bulkUpdateCategories(
    updates: { id: string; color: EventColor; categoryId: CategoryId }[],
  ): Promise<void> {
    if (updates.length === 0) return
    const now = this.clock.now()
    await this.adapter.events.transaction('rw', async () => {
      const ids = updates.map((u) => u.id)
      const existing = await this.adapter.events.bulkGet(ids)
      const patched = existing.flatMap((e, i) => {
        if (e === undefined) return []
        return { ...e, color: updates[i].color, categoryId: updates[i].categoryId, updatedAt: now }
      })
      await this.adapter.events.bulkPut(patched)
    })
  }

  async bulkUpdateTitles(
    updates: { id: string; title: string }[],
  ): Promise<void> {
    if (updates.length === 0) return
    const now = this.clock.now()
    await this.adapter.events.transaction('rw', async () => {
      const ids = updates.map((u) => u.id)
      const existing = await this.adapter.events.bulkGet(ids)
      const patched = existing.flatMap((e, i) => {
        if (e === undefined) return []
        return { ...e, title: updates[i].title, updatedAt: now }
      })
      await this.adapter.events.bulkPut(patched)
    })
  }

  async getLatest(): Promise<CalendarEvent | null> {
    const results = await this.adapter.events.query({
      orderBy: 'endTime',
      orderDir: 'desc',
      filter: (e) => !e.deletedAt,
      limit: 1,
    })
    return results[0] ?? null
  }

  /**
   * 获取最近一条同餐次的 Meal 事件。
   * 用于继承上次同餐次的默认值（食物标签、来源）。
   */
  async getLastMealByOrder(mealOrder: string): Promise<CalendarEvent | null> {
    const all = await this.adapter.events.getAll()
    const meals = all
      .filter(
        (e) =>
          !e.deletedAt &&
          e.typedData?.type === 'meal' &&
          e.typedData.mealOrder === mealOrder,
      )
      .sort((a, b) => b.startTime - a.startTime)

    return meals[0] ?? null
  }
}
