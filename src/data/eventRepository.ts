import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '@/domain/event'
import { type CailensDB, db as defaultDb } from './db'

export interface Clock {
  now(): number
}

export interface IdGenerator {
  generate(): string
}

export class EventRepository {
  private db: CailensDB
  private clock: Clock
  private idGen: IdGenerator

  constructor(
    db: CailensDB,
    clock: Clock = { now: () => Date.now() },
    idGen: IdGenerator = { generate: () => crypto.randomUUID() },
  ) {
    this.db    = db
    this.clock = clock
    this.idGen = idGen
  }

  async getByTimeRange(start: number, end: number): Promise<CalendarEvent[]> {
    const results = await this.db.events
      .where('startTime')
      .below(end)
      .and((e) => e.endTime > start)
      .toArray()
    return results.sort((a, b) => a.startTime - b.startTime)
  }

  async getById(id: string): Promise<CalendarEvent | undefined> {
    return this.db.events.get(id)
  }

  async create(input: CreateEventInput): Promise<CalendarEvent> {
    const now = this.clock.now()
    const event: CalendarEvent = {
      ...input,
      id: this.idGen.generate(),
      createdAt: now,
      updatedAt: now,
    }
    await this.db.events.add(event)
    return event
  }

  async update(input: UpdateEventInput): Promise<CalendarEvent> {
    const existing = await this.db.events.get(input.id)
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
    await this.db.events.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.events.delete(id)
  }
}

export const eventRepository = new EventRepository(defaultDb)
