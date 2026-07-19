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
import { broadcastWrite } from '@/lib/crossWindowSync'

// ── Event cache ──────────────────────────────────────────────
//
// 避免同一周/范围被重复从 DB 加载。任何写操作（create/update/delete/import）
// 清空全部缓存以保证一致性。

const _eventCache = new Map<string, CalendarEvent[]>()
const ALL_KEY = '__all__'
const MAX_CACHE_SIZE = 17 // 16 个范围 + ALL_KEY 豁免

// 记录最近一次「可见范围」加载(周/区间),供后台事件补全完成后静默重放刷新视图
type RangeLoad = { kind: 'week'; weekStart: number } | { kind: 'range'; start: number; end: number }
let _lastRangeLoad: RangeLoad | null = null

function weekKey(start: number): string {
  return `w:${start}`
}

function rangeKey(start: number, end: number): string {
  return `r:${start}-${end}`
}

function clearEventCache(): void {
  _eventCache.clear()
}

/** 缓存大小超过上限时驱逐最旧的条目（ALL_KEY 豁免）。 */
function evictCache(): void {
  if (_eventCache.size <= MAX_CACHE_SIZE) return
  const iter = _eventCache.keys()
  let evicted = 0
  const target = _eventCache.size - MAX_CACHE_SIZE
  for (let key = iter.next(); !key.done && evicted < target; key = iter.next()) {
    if (key.value !== ALL_KEY) {
      _eventCache.delete(key.value)
      evicted++
    }
  }
}

/** 请求序号守卫：后发起的加载若先返回，自动丢弃旧结果。 */
let _weekLoadSeq = 0
let _rangeLoadSeq = 0

// 外部使用：watchdog 在文件系统变更后强制刷新
export { clearEventCache }

// ── Store ────────────────────────────────────────────────────

interface EventState {
  events: CalendarEvent[]
  rangeEvents: CalendarEvent[]
  allEvents: CalendarEvent[]
  /** 首次加载/切换周时 true（此时显示转圈）；后续缓存 miss 的重加载走 isFetching */
  isLoading: boolean
  /** 缓存 miss 时异步取数的轻量标志，已有 events 时 UI 不卸载网格 */
  isFetching: boolean
  loadError: string | null
  loadWeek: (weekStart: Date) => Promise<void>
  loadRange: (start: number, end: number) => Promise<void>
  queryRange: (start: number, end: number) => Promise<CalendarEvent[]>
  loadAllEvents: () => Promise<void>
  reloadVisible: () => Promise<void>
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent>
  updateEvent: (input: UpdateEventInput) => Promise<CalendarEvent>
  deleteEvent: (id: string) => Promise<void>
  shiftCurrentWeek: (direction: -1 | 1) => Promise<void>
  importEvents: (icsText: string, categoryId: CategoryId) => Promise<ImportResult>
  importParsedEvents: (parsedEvents: ImportedEvent[], resolveCategory: (event: ImportedEvent, index: number) => CategoryId) => Promise<void>
  reclassifyAllEvents: () => Promise<void>
  duplicateEvent: (id: string) => Promise<CalendarEvent>
  bulkRenameEvents: (updates: { id: string; title: string }[]) => Promise<void>
}

export const useEventStore = create<EventState>()((set, get) => ({
  events: [],
  rangeEvents: [],
  allEvents: [],
  isLoading: true,
  isFetching: false,
  loadError: null,

  loadWeek: async (weekStart) => {
    const seq = ++_weekLoadSeq
    _lastRangeLoad = { kind: 'week', weekStart: weekStart.getTime() }
    try {
      const start = getDayStart(weekStart)
      const end   = getDayStart(addDays(weekStart, 7))
      const key   = weekKey(start)

      // 缓存命中：无须 loading，直接返回
      const cached = _eventCache.get(key)
      if (cached) {
        set({ events: cached, isLoading: false, loadError: null })
        return
      }

      // 缓存 miss：stale-while-revalidate，保留旧 events
      set({ isFetching: true })
      const events = await getEventRepo().getByTimeRange(start, end)
      if (seq !== _weekLoadSeq) return // 后发先至，丢弃

      _eventCache.set(key, events)
      evictCache()
      set({ events, isLoading: false, isFetching: false, loadError: null })
    } catch (err) {
      if (seq !== _weekLoadSeq) return
      const message = err instanceof Error ? err.message : 'Failed to load events'
      set({ isLoading: false, isFetching: false, loadError: message })
    }
  },

  loadRange: async (start, end) => {
    const seq = ++_rangeLoadSeq
    _lastRangeLoad = { kind: 'range', start, end }
    try {
      const key = rangeKey(start, end)

      const cached = _eventCache.get(key)
      if (cached) {
        set({ rangeEvents: cached, isLoading: false, loadError: null })
        return
      }

      set({ isFetching: true })
      const rangeEvents = await getEventRepo().getByTimeRange(start, end)
      if (seq !== _rangeLoadSeq) return

      _eventCache.set(key, rangeEvents)
      evictCache()
      set({ rangeEvents, isLoading: false, isFetching: false, loadError: null })
    } catch (err) {
      if (seq !== _rangeLoadSeq) return
      const message = err instanceof Error ? err.message : 'Failed to load events'
      set({ isLoading: false, isFetching: false, loadError: message })
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

  // 后台事件补全完成后调用:清缓存并静默重放最近一次可见加载 + 全部事件,
  // 让当前周视图/复盘范围无感刷新为完整数据(不触发 loading 态)。
  reloadVisible: async () => {
    clearEventCache()
    try {
      const last = _lastRangeLoad
      if (last?.kind === 'week') {
        const start = getDayStart(new Date(last.weekStart))
        const end = getDayStart(addDays(new Date(last.weekStart), 7))
        const events = await getEventRepo().getByTimeRange(start, end)
        _eventCache.set(weekKey(start), events)
        set({ events })
      } else if (last?.kind === 'range') {
        const rangeEvents = await getEventRepo().getByTimeRange(last.start, last.end)
        _eventCache.set(rangeKey(last.start, last.end), rangeEvents)
        set({ rangeEvents })
      }
      const allEvents = await getEventRepo().getByTimeRange(0, Date.now() + 365 * 24 * 60 * 60 * 1000)
      _eventCache.set(ALL_KEY, allEvents)
      set({ allEvents })
    } catch {
      // silent
    }
  },

  createEvent: async (input) => {
    const event = await getEventRepo().create(input)
    clearEventCache()
    broadcastWrite('events')
    set((state) => patchAll(state, (l) => [...l, event]))

    // Auto-learn keyword from event title (delegated to use-case)
    if (event.title && event.categoryId) {
      const catState = useCategoryStore.getState()
      await tryLearnAndReclassify(event.title, event.categoryId, {
        getCategories: () => catState.categories,
        updateCategoryFolders: async (id, folders) => {
          const cat = catState.categories.find(c => c.id === id)
          if (cat) await catState.updateCategory(id, { name: cat.name, folders, weeklyBudget: cat.weeklyBudget })
        },
        reclassifyAllEvents: () => get().reclassifyAllEvents(),
      })
    }

    return event
  },

  updateEvent: async (input) => {
    const prevEvent = get().events.find((e) => e.id === input.id)
    const event = await getEventRepo().update(input)
    clearEventCache()
    broadcastWrite('events')
    set((state) => patchAll(state, (l) => l.map((e) => (e.id === event.id ? event : e))))

    // Auto-learn keyword when categoryId changes (delegated to use-case)
    const targetId = input.categoryId ?? input.color
    if (targetId && event.title && prevEvent && prevEvent.categoryId !== targetId) {
      const catState = useCategoryStore.getState()
      await tryLearnAndReclassify(event.title, targetId, {
        getCategories: () => catState.categories,
        updateCategoryFolders: async (id, folders) => {
          const cat = catState.categories.find(c => c.id === id)
          if (cat) await catState.updateCategory(id, { name: cat.name, folders, weeklyBudget: cat.weeklyBudget })
        },
        reclassifyAllEvents: () => get().reclassifyAllEvents(),
      })
    }

    return event
  },

  deleteEvent: async (id) => {
    await getEventRepo().delete(id)
    clearEventCache()
    broadcastWrite('events')
    set((state) => patchAll(state, (l) => l.filter((e) => e.id !== id)))
  },

  shiftCurrentWeek: async (direction) => {
    const { events } = useEventStore.getState()
    if (events.length === 0) return
    const shifted = shiftEventsByWeeks(events, direction)
    const updates = shifted.map((e) => ({ id: e.id, startTime: e.startTime, endTime: e.endTime }))
    await getEventRepo().bulkUpdateTimes(updates)
    clearEventCache()
    broadcastWrite('events')
    set((state) => patchAll(state, (l) => l.map((e) => {
      const s = shifted.find((s) => s.id === e.id)
      return s ?? e
    })))
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
    broadcastWrite('events')
    set((state) => patchAll(state, (l) => [...l, ...created]))
    return result
  },

  queryRange: async (start, end) => {
    const key = rangeKey(start, end)
    const cached = _eventCache.get(key)
    if (cached) return cached

    const events = await getEventRepo().getByTimeRange(start, end)
    _eventCache.set(key, events)
    evictCache()
    return events
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
    broadcastWrite('events')
    set((state) => patchAll(state, (l) => [...l, ...created]))
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
      projectId: original.projectId,
      description: original.description,
      location: original.location,
      typedKey: original.typedKey,
      typedData: original.typedData,
      goalId: original.goalId ?? null,
    }
    const event = await getEventRepo().create(input)
    clearEventCache()
    broadcastWrite('events')
    set((state) => patchAll(state, (l) => [...l, event]))
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
    broadcastWrite('events')

    set((state) => patchAll(state, (l) => l.map((e) => {
        const update = updates.find((u) => u.id === e.id)
        return update ? { ...e, color: update.color, categoryId: update.categoryId } : e
      })))
  },

  bulkRenameEvents: async (updates) => {
    if (updates.length === 0) return
    await getEventRepo().bulkUpdateTitles(updates)
    clearEventCache()
    broadcastWrite('events')

    const updateMap = new Map(updates.map((u) => [u.id, u.title]))
    const patchEvent = (e: CalendarEvent) =>
      updateMap.has(e.id) ? { ...e, title: updateMap.get(e.id)!, updatedAt: Date.now() } : e

    set((state) => ({
      events: state.events.map(patchEvent),
      rangeEvents: state.rangeEvents.map(patchEvent),
      allEvents: state.allEvents.map(patchEvent),
    }))
  },
}))

// ── 三数组同步辅助 ─────────────────────────────────────────
//
// 让每个写操作把同一结构变换应用到三个事件数组（events / rangeEvents / allEvents）。
// 往 rangeEvents / allEvents 添加超出其加载范围的事件是无害的——所有下游聚合
// 都会按范围裁剪。

type EventPatch = (list: CalendarEvent[]) => CalendarEvent[]

function patchAll(state: EventState, patch: EventPatch): Partial<EventState> {
  return {
    events: patch(state.events),
    rangeEvents: patch(state.rangeEvents),
    allEvents: patch(state.allEvents),
  }
}
