import { addDays } from 'date-fns'
import { create } from 'zustand'
import { getEventRepo } from '@/data/getRepositories'
import type { CalendarEvent, CreateEventInput, EventColor, UpdateEventInput } from '@/domain/event'
import type { CategoryId } from '@/domain/category'
import { parseIcs, classifyEvent } from '@/domain/icsImport'
import type { ImportResult, ImportedEvent } from '@/domain/icsImport'
import { useCategoryStore } from './categoryStore'
import { getDayStart, shiftEventsByWeeks } from '@/domain/time'
import { tryLearnAndReclassify } from '@/use-cases/classifyAndLearnKeyword'

// ── Event cache ──────────────────────────────────────────────
//
// 避免同一周/范围被重复从 DB 加载。任何写操作（create/update/delete/import）
// 清空全部缓存以保证一致性。

const _eventCache = new Map<string, CalendarEvent[]>()
const ALL_KEY = '__all__'

function weekKey(start: number): string {
  return `w:${start}`
}

function rangeKey(start: number, end: number): string {
  return `r:${start}-${end}`
}

function clearEventCache(): void {
  _eventCache.clear()
}

// ── Store ────────────────────────────────────────────────────

interface EventState {
  events: CalendarEvent[]
  rangeEvents: CalendarEvent[]
  allEvents: CalendarEvent[]
  isLoading: boolean
  loadError: string | null
  loadWeek: (weekStart: Date) => Promise<void>
  loadRange: (start: number, end: number) => Promise<void>
  loadAllEvents: () => Promise<void>
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent>
  updateEvent: (input: UpdateEventInput) => Promise<CalendarEvent>
  deleteEvent: (id: string) => Promise<void>
  shiftCurrentWeek: (direction: -1 | 1) => Promise<void>
  importEvents: (icsText: string, categoryId: CategoryId) => Promise<ImportResult>
  importParsedEvents: (parsedEvents: ImportedEvent[], resolveCategory: (event: ImportedEvent, index: number) => CategoryId) => Promise<void>
  reclassifyAllEvents: () => Promise<void>
  duplicateEvent: (id: string) => Promise<CalendarEvent>
}

export const useEventStore = create<EventState>()((set, get) => ({
  events: [],
  rangeEvents: [],
  allEvents: [],
  isLoading: true,
  loadError: null,

  loadWeek: async (weekStart) => {
    set({ isLoading: true, loadError: null })
    try {
      const start = getDayStart(weekStart)
      const end   = getDayStart(addDays(weekStart, 7))
      const key   = weekKey(start)

      let events = _eventCache.get(key)
      if (!events) {
        events = await getEventRepo().getByTimeRange(start, end)
        _eventCache.set(key, events)
      }

      set({ events, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load events'
      set({ isLoading: false, loadError: message })
    }
  },

  loadRange: async (start, end) => {
    set({ isLoading: true, loadError: null })
    try {
      const key = rangeKey(start, end)

      let rangeEvents = _eventCache.get(key)
      if (!rangeEvents) {
        rangeEvents = await getEventRepo().getByTimeRange(start, end)
        _eventCache.set(key, rangeEvents)
      }

      set({ rangeEvents, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load events'
      set({ isLoading: false, loadError: message })
    }
  },

  loadAllEvents: async () => {
    try {
      let allEvents = _eventCache.get(ALL_KEY)
      if (!allEvents) {
        allEvents = await getEventRepo().getByTimeRange(0, Date.now() + 365 * 24 * 60 * 60 * 1000)
        _eventCache.set(ALL_KEY, allEvents)
      }
      set({ allEvents })
    } catch {
      // silent — standard week will show empty buckets
    }
  },

  createEvent: async (input) => {
    const event = await getEventRepo().create(input)
    clearEventCache()
    set((state) => ({ events: [...state.events, event] }))

    // Auto-learn keyword from event title (delegated to use-case)
    if (event.title && event.categoryId) {
      const catState = useCategoryStore.getState()
      await tryLearnAndReclassify(event.title, event.categoryId, {
        getCategories: () => catState.categories,
        updateCategoryFolders: (id, folders) => catState.updateCategoryFolders(id, folders),
        reclassifyAllEvents: () => get().reclassifyAllEvents(),
      })
    }

    return event
  },

  updateEvent: async (input) => {
    const prevEvent = get().events.find((e) => e.id === input.id)
    const event = await getEventRepo().update(input)
    clearEventCache()
    set((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e)),
    }))

    // Auto-learn keyword when categoryId changes (delegated to use-case)
    const targetId = input.categoryId ?? input.color
    if (targetId && event.title && prevEvent && prevEvent.categoryId !== targetId) {
      const catState = useCategoryStore.getState()
      await tryLearnAndReclassify(event.title, targetId, {
        getCategories: () => catState.categories,
        updateCategoryFolders: (id, folders) => catState.updateCategoryFolders(id, folders),
        reclassifyAllEvents: () => get().reclassifyAllEvents(),
      })
    }

    return event
  },

  deleteEvent: async (id) => {
    await getEventRepo().delete(id)
    clearEventCache()
    set((state) => ({ events: state.events.filter((e) => e.id !== id) }))
  },

  shiftCurrentWeek: async (direction) => {
    const { events } = useEventStore.getState()
    if (events.length === 0) return
    const shifted = shiftEventsByWeeks(events, direction)
    const updates = shifted.map((e) => ({ id: e.id, startTime: e.startTime, endTime: e.endTime }))
    await getEventRepo().bulkUpdateTimes(updates)
    clearEventCache()
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

    const created = await getEventRepo().bulkCreate(inputs)
    clearEventCache()
    set((state) => ({ events: [...state.events, ...created] }))
    return result
  },

  importParsedEvents: async (parsedEvents, resolveCategory) => {
    if (parsedEvents.length === 0) return

    const inputs: CreateEventInput[] = parsedEvents.map((e, i) => {
      const catId = resolveCategory(e, i)
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

    const created = await getEventRepo().bulkCreate(inputs)
    clearEventCache()
    set((state) => ({ events: [...state.events, ...created] }))
  },

  duplicateEvent: async (id) => {
    const original = get().events.find((e) => e.id === id) ?? await getEventRepo().getById(id)
    if (!original) throw new Error(`Event not found: ${id}`)
    const input: CreateEventInput = {
      title: original.title,
      startTime: original.startTime,
      endTime: original.endTime,
      color: original.color,
      categoryId: original.categoryId,
      description: original.description,
      location: original.location,
    }
    const event = await getEventRepo().create(input)
    clearEventCache()
    set((state) => ({ events: [...state.events, event] }))
    return event
  },

  reclassifyAllEvents: async () => {
    // Prefer cached allEvents; fall back to DB if not loaded yet
    let allEvents = _eventCache.get(ALL_KEY)
    if (!allEvents) {
      allEvents = await getEventRepo().getAll()
      _eventCache.set(ALL_KEY, allEvents)
    }
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

    await getEventRepo().bulkUpdateCategories(updates)
    clearEventCache()

    set((state) => ({
      events: state.events.map((e) => {
        const update = updates.find((u) => u.id === e.id)
        return update ? { ...e, color: update.color, categoryId: update.categoryId } : e
      }),
    }))
  },
}))
