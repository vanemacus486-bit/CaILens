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
    const results = await this.adapter.events.query({
      where: { key: 'startTime', op: 'below', value: end },
      filter: (e) => e.endTime > start,
    })
    return results.sort((a, b) => a.startTime - b.startTime)
  }

  async getById(id: string): Promise<CalendarEvent | undefined> {
    return this.adapter.events.get(id)
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
    await this.adapter.events.delete(id)
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
    return this.adapter.events.getAll()
  }

  async search(query: string, limit = 50): Promise<CalendarEvent[]> {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const results = await this.adapter.events.query({
      filter: (e) => {
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
          e.typedData?.type === 'meal' &&
          e.typedData.mealOrder === mealOrder,
      )
      .sort((a, b) => b.startTime - a.startTime)

    return meals[0] ?? null
  }
}
