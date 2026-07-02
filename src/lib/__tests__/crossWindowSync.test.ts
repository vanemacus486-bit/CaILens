import { describe, it, expect, vi } from 'vitest'
import { broadcastWrite, subscribeCrossWindowWrites } from '../crossWindowSync'

// jsdom 若不提供 BroadcastChannel，模块会优雅降级为 no-op，这些用例跳过。
const hasBC = typeof BroadcastChannel !== 'undefined'

const flush = () => new Promise((r) => setTimeout(r, 30))

describe('crossWindowSync', () => {
  it.skipIf(!hasBC)('自己窗口发出的广播不触发本窗口回调（自回声防护）', async () => {
    const spy = vi.fn()
    const unsub = subscribeCrossWindowWrites(spy)

    broadcastWrite('events')
    await flush()

    expect(spy).not.toHaveBeenCalled()
    unsub()
  })

  it.skipIf(!hasBC)('其他窗口的广播正常触发回调', async () => {
    const spy = vi.fn()
    const unsub = subscribeCrossWindowWrites(spy)

    // 模拟另一个窗口：独立 channel 实例 + 不同 senderId
    const other = new BroadcastChannel('cailens-write')
    other.postMessage({ table: 'events', senderId: 'other-window' })

    await vi.waitFor(() => expect(spy).toHaveBeenCalledWith('events'))
    other.close()
    unsub()
  })

  it.skipIf(!hasBC)('退订后不再触发回调', async () => {
    const spy = vi.fn()
    const unsub = subscribeCrossWindowWrites(spy)
    unsub()

    const other = new BroadcastChannel('cailens-write')
    other.postMessage({ table: 'events', senderId: 'other-window' })
    await flush()

    expect(spy).not.toHaveBeenCalled()
    other.close()
  })

  it('BroadcastChannel 不可用时 broadcastWrite 静默 no-op', () => {
    // 无论环境如何，调用都不该抛错（降级路径）
    expect(() => broadcastWrite('events')).not.toThrow()
  })
})
