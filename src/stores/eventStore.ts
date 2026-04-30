import { addDays } from 'date-fns'
import { create } from 'zustand'
import { eventRepository } from '@/data/eventRepository'
import type { CalendarEvent, CreateEventInput, EventColor, UpdateEventInput } from '@/domain/event'
import { type CategoryId, addKeywordIfValid } from '@/domain/category'
import { parseIcs, classifyEvent } from '@/domain/icsImport'
import type { ImportResult, ImportedEvent } from '@/domain/icsImport'
import { useCategoryStore } from './categoryStore'
import { getDayStart, shiftEventsByWeeks } from '@/domain/time'

interface EventState {
  events: CalendarEvent[]
  rangeEvents: CalendarEvent[]
  loadWeek: (weekStart: Date) => Promise<void>
  loadRange: (start: number, end: number) => Promise<void>
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent>
  updateEvent: (input: UpdateEventInput) => Promise<CalendarEvent>
  deleteEvent: (id: string) => Promise<void>
  shiftCurrentWeek: (direction: -1 | 1) => Promise<void>
  importEvents: (icsText: string, categoryId: CategoryId) => Promise<ImportResult>
  importParsedEvents: (parsedEvents: ImportedEvent[], categoryId: CategoryId) => Promise<void>
  reclassifyAllEvents: () => Promise<void>
}

export const useEventStore = create<EventState>()((set, get) => ({
  events: [],
  rangeEvents: [],

  loadWeek: async (weekStart) => {
    const start = getDayStart(weekStart)
    const end   = getDayStart(addDays(weekStart, 7))  // exclusive: start of next Monday
    const events = await eventRepository.getByTimeRange(start, end)
    set({ events })
  },

  loadRange: async (start, end) => {
    const rangeEvents = await eventRepository.getByTimeRange(start, end)
    set({ rangeEvents })
  },

  createEvent: async (input) => {
    const event = await eventRepository.create(input)
    set((state) => ({ events: [...state.events, event] }))

    // Auto-add event title as keyword to the first folder → reclassify
    if (event.title && event.categoryId) {
      const catState = useCategoryStore.getState()
      const cat = catState.categories.find((c) => c.id === event.categoryId)
      if (cat && cat.folders.length > 0) {
        const first = cat.folders[0]
        const updated = addKeywordIfValid(first.keywords, event.title)
        if (updated) {
          const newFolders = cat.folders.map((f, i) => i === 0 ? { ...f, keywords: updated } : f)
          await catState.updateCategoryFolders(event.categoryId, newFolders)
          await get().reclassifyAllEvents()
        }
      }
    }

    return event
  },

  updateEvent: async (input) => {
    const prevEvent = get().events.find((e) => e.id === input.id)
    const event = await eventRepository.update(input)
    set((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e)),
    }))

    // Auto-add keyword to first folder when categoryId changes → reclassify
    const targetId = input.categoryId ?? input.color
    if (targetId && event.title && prevEvent && prevEvent.categoryId !== targetId) {
      const catState = useCategoryStore.getState()
      const cat = catState.categories.find((c) => c.id === targetId)
      if (cat && cat.folders.length > 0) {
        const first = cat.folders[0]
        const updatedKeywords = addKeywordIfValid(first.keywords, event.title)
        if (updatedKeywords) {
          const newFolders = cat.folders.map((f, i) => i === 0 ? { ...f, keywords: updatedKeywords } : f)
          await catState.updateCategoryFolders(targetId, newFolders)
          await get().reclassifyAllEvents()
        }
      }
    }

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

  importParsedEvents: async (parsedEvents, categoryId) => {
    if (parsedEvents.length === 0) return

    const { categories } = useCategoryStore.getState()

    const inputs: CreateEventInput[] = parsedEvents.map((e) => {
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
