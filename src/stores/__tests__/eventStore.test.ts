import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CalendarEvent } from '@/domain/event'

// ── Mocks（必须在 import store 之前声明） ─────────────────────

const mocks = vi.hoisted(() => ({
  getByTimeRange: vi.fn<(start: number, end: number) => Promise<CalendarEvent[]>>(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/data/getRepositories', () => ({
  getEventRepo: () => mocks,
}))

vi.mock('@/use-cases/classifyAndLearnKeyword', () => ({
  tryLearnAndReclassify: vi.fn(async () => {}),
}))

import { useEventStore, clearEventCache } from '../eventStore'

// ── Fixtures ─────────────────────────────────────────────────

function makeEvent(id: string, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id,
    title: `Event ${id}`,
    startTime: 1000,
    endTime: 2000,
    color: 'accent',
    categoryId: 'accent',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

const WEEK_1 = new Date(2026, 0, 5) // 周一
const WEEK_2 = new Date(2026, 0, 12)

beforeEach(() => {
  vi.clearAllMocks()
  clearEventCache()
  useEventStore.setState({
    events: [],
    rangeEvents: [],
    allEvents: [],
    isLoading: true,
    isFetching: false,
    loadError: null,
  })
})

// ── isLoading 生命周期（回归：曾经没人把 isLoading 置回 false，
//    StatsPage 以 !isLoading 为门 → 复盘页永久空白） ──────────

describe('isLoading lifecycle', () => {
  it('loadWeek 成功后 isLoading=false、loadError=null', async () => {
    const evt = makeEvent('a')
    mocks.getByTimeRange.mockResolvedValueOnce([evt])

    await useEventStore.getState().loadWeek(WEEK_1)

    const s = useEventStore.getState()
    expect(s.events).toEqual([evt])
    expect(s.isLoading).toBe(false)
    expect(s.isFetching).toBe(false)
    expect(s.loadError).toBeNull()
  })

  it('缓存命中路径同样清 isLoading（冷启动后二访不能卡在 loading）', async () => {
    mocks.getByTimeRange.mockResolvedValueOnce([makeEvent('a')])
    await useEventStore.getState().loadWeek(WEEK_1)

    useEventStore.setState({ isLoading: true }) // 模拟另一处把它抬起来
    await useEventStore.getState().loadWeek(WEEK_1) // 命中缓存，不再走 repo

    expect(mocks.getByTimeRange).toHaveBeenCalledTimes(1)
    expect(useEventStore.getState().isLoading).toBe(false)
  })

  it('loadRange 成功后 isLoading=false', async () => {
    mocks.getByTimeRange.mockResolvedValueOnce([makeEvent('r')])

    await useEventStore.getState().loadRange(0, 10_000)

    const s = useEventStore.getState()
    expect(s.rangeEvents).toHaveLength(1)
    expect(s.isLoading).toBe(false)
  })

  it('加载失败记录 loadError，随后一次成功要把它清掉', async () => {
    mocks.getByTimeRange.mockRejectedValueOnce(new Error('boom'))
    await useEventStore.getState().loadWeek(WEEK_1)
    expect(useEventStore.getState().loadError).toBe('boom')
    expect(useEventStore.getState().isLoading).toBe(false)

    mocks.getByTimeRange.mockResolvedValueOnce([makeEvent('a')])
    await useEventStore.getState().loadWeek(WEEK_2)
    expect(useEventStore.getState().loadError).toBeNull()
  })
})

// ── 加载竞态（P0-1）────────────────────────────────────────

describe('load race guard', () => {
  it('慢请求后返回时不得覆盖新请求的结果', async () => {
    const evtA = makeEvent('slow-week')
    const evtB = makeEvent('fast-week')

    let resolveSlow!: (v: CalendarEvent[]) => void
    mocks.getByTimeRange
      .mockImplementationOnce(() => new Promise<CalendarEvent[]>((res) => { resolveSlow = res }))
      .mockResolvedValueOnce([evtB])

    const slow = useEventStore.getState().loadWeek(WEEK_1)
    const fast = useEventStore.getState().loadWeek(WEEK_2)
    await fast
    expect(useEventStore.getState().events).toEqual([evtB])

    resolveSlow([evtA])
    await slow

    // 旧响应被序号守卫丢弃
    expect(useEventStore.getState().events).toEqual([evtB])
    expect(useEventStore.getState().isFetching).toBe(false)
  })
})

// ── 写路径三数组同步（P0-2）─────────────────────────────────

describe('write methods keep all 3 arrays in sync', () => {
  const seed = makeEvent('e1')

  beforeEach(() => {
    useEventStore.setState({
      events: [seed],
      rangeEvents: [seed],
      allEvents: [seed],
    })
  })

  it('createEvent 追加到三个数组', async () => {
    const created = makeEvent('e2')
    mocks.create.mockResolvedValueOnce(created)

    await useEventStore.getState().createEvent({
      title: created.title, startTime: created.startTime, endTime: created.endTime,
      color: 'accent', categoryId: 'accent',
    })

    const s = useEventStore.getState()
    expect(s.events.map((e) => e.id)).toEqual(['e1', 'e2'])
    expect(s.rangeEvents.map((e) => e.id)).toEqual(['e1', 'e2'])
    expect(s.allEvents.map((e) => e.id)).toEqual(['e1', 'e2'])
  })

  it('updateEvent 更新三个数组', async () => {
    const updated = { ...seed, title: 'Renamed' }
    mocks.update.mockResolvedValueOnce(updated)

    await useEventStore.getState().updateEvent({ id: 'e1', title: 'Renamed' })

    const s = useEventStore.getState()
    expect(s.events[0].title).toBe('Renamed')
    expect(s.rangeEvents[0].title).toBe('Renamed')
    expect(s.allEvents[0].title).toBe('Renamed')
  })

  it('deleteEvent 从三个数组移除', async () => {
    mocks.delete.mockResolvedValueOnce(undefined)

    await useEventStore.getState().deleteEvent('e1')

    const s = useEventStore.getState()
    expect(s.events).toHaveLength(0)
    expect(s.rangeEvents).toHaveLength(0)
    expect(s.allEvents).toHaveLength(0)
  })
})
