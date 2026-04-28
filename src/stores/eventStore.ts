import { addDays } from 'date-fns'
import { create } from 'zustand'
import { eventRepository } from '@/data/eventRepository'
import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '@/domain/event'
import { getDayStart, shiftEventsByWeeks } from '@/domain/time'

interface EventState {
  events: CalendarEvent[]
  loadWeek: (weekStart: Date) => Promise<void>
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent>
  updateEvent: (input: UpdateEventInput) => Promise<CalendarEvent>
  deleteEvent: (id: string) => Promise<void>
  shiftCurrentWeek: (direction: -1 | 1) => Promise<void>
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
}))
