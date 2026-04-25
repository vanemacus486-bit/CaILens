import Dexie, { type Table } from 'dexie'
import type { CalendarEvent } from '@/domain/event'

export class CailensDB extends Dexie {
  events!: Table<CalendarEvent, string>

  constructor() {
    super('cailens')
    this.version(1).stores({
      events: 'id, startTime',
    })
  }
}

export const db = new CailensDB()
