import { addDays } from 'date-fns'
import { create } from 'zustand'
import { eventRepository } from '@/data/eventRepository'
import type { CalendarEvent, CreateEventInput, EventColor, UpdateEventInput } from '@/domain/event'
import { type CategoryId } from '@/domain/category'
import { parseIcs, classifyEvent } from '@/domain/icsImport'
import type { ImportResult } from '@/domain/icsImport'
import { useCategoryStore } from './categoryStore'
import { getDayStart, shiftEventsByWeeks } from '@/domain/time'

interface EventState {
  events: CalendarEvent[]
  loadWeek: (weekStart: Date) => Promise<void>
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent>
  updateEvent: (input: UpdateEventInput) => Promise<CalendarEvent>
  deleteEvent: (id: string) => Promise<void>
  shiftCurrentWeek: (direction: -1 | 1) => Promise<void>
  importEvents: (icsText: string, categoryId: CategoryId) => Promise<ImportResult>
  reclassifyAllEvents: () => Promise<void>
}

export const useEventStore = create<EventState>()((set) => ({
  events: [],

  loadWeek: async (weekStart) => {
    const start = getDayStart(weekStart)
    const end   = getDayStart(addDays(weekStart, 7))  // exclusive: start of next Monday
    const events = await eventRepository.getByTimeRange(start, end)
    set({ events })
  },

  createEvent: async (input) => {
    const event = await eventRepository.create(input)
    set((state) => ({ events: [...state.events, event] }))
    return event
  },

  updateEvent: async (input) => {
    const event = await eventRepository.update(input)
    set((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e)),
    }))
    return event
  },

  deleteEvent: async (id) => {
    await eventRepository.delete(id)
    set((state) => ({ events: state.events.filter((e) => e.id !== id) }))
  },

  shiftCurrentWeek: async (direction) => {
    const { events } = useEventStore.getState()
    if (events.length === 0) return
    const shifted = shiftEventsByWeeks(events, direction)
    const updates = shifted.map((e) => ({ id: e.id, startTime: e.startTime, endTime: e.endTime }))
    await eventRepository.bulkUpdateTimes(updates)
    set({ events: shifted })
  },

  importEvents: async (icsText, categoryId) => {
    const result = parseIcs(icsText)
    if (result.events.length === 0) return result

    const { categories } = useCategoryStore.getState()

    const inputs: CreateEventInput[] = result.events.map((e) => {
      const matched = classifyEvent(e.title, categories)
      const catId = matched ?? categoryId
      return {
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        color: catId,
        categoryId: catId,
        description: e.description,
        location: e.location,
      }
    })

    const created = await eventRepository.bulkCreate(inputs)
    set((state) => ({ events: [...state.events, ...created] }))
    return result
  },

  reclassifyAllEvents: async () => {
    const allEvents = await eventRepository.getAll()
    if (allEvents.length === 0) return

    const { categories } = useCategoryStore.getState()

    const updates: { id: string; color: EventColor; categoryId: CategoryId }[] = []
    for (const event of allEvents) {
      const matched = classifyEvent(event.title, categories)
      if (matched && matched !== event.categoryId) {
        updates.push({ id: event.id, color: matched, categoryId: matched })
      }
    }

    if (updates.length === 0) return

    await eventRepository.bulkUpdateCategories(updates)

    set((state) => ({
      events: state.events.map((e) => {
        const update = updates.find((u) => u.id === e.id)
        return update ? { ...e, color: update.color, categoryId: update.categoryId } : e
      }),
    }))
  },
}))
