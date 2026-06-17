/**
 * 文件监听「自写抑制」的核心逻辑测试。
 *
 * 桌面文件存储模式下,应用自身写盘(todos.json 等)会被 OS 监听器当成变更并
 * 触发 fullScan + store 重载 → 回声风暴(删除卡顿)甚至已删条目复活。
 * markSelfWrite / isWithinSelfWriteWindow / getSelfWriteSeq 让监听器能区分
 * 「自身写入」与「外部编辑」,从而跳过前者。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { markSelfWrite, isWithinSelfWriteWindow, getSelfWriteSeq } from '../tauriFs'

describe('fs watcher self-write suppression', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('窗口内(1500ms)的事件应被判定为自写,窗口外则放行', () => {
    vi.setSystemTime(1_000_000)
    markSelfWrite()

    // 紧随其后 / 窗口边界内 → 视为自写回声,抑制
    expect(isWithinSelfWriteWindow(1_000_000)).toBe(true)
    expect(isWithinSelfWriteWindow(1_000_000 + 200)).toBe(true)
    expect(isWithinSelfWriteWindow(1_000_000 + 1_499)).toBe(true)

    // 超过窗口 → 视为外部编辑,放行扫描
    expect(isWithinSelfWriteWindow(1_000_000 + 1_500)).toBe(false)
    expect(isWithinSelfWriteWindow(1_000_000 + 5_000)).toBe(false)
  })

  it('每次自写都会递增序号,使扫描能检测到「读盘期间发生了写入」', () => {
    const before = getSelfWriteSeq()
    markSelfWrite()
    markSelfWrite()
    expect(getSelfWriteSeq()).toBe(before + 2)
  })

  it('后一次自写会刷新抑制窗口的起点', () => {
    vi.setSystemTime(1_000_000)
    markSelfWrite()
    // 1000ms 后再写一次,窗口起点应被推到新的时间点
    vi.setSystemTime(1_001_000)
    markSelfWrite()

    // 距首写 2000ms,但距次写仅 1000ms → 仍在窗口内
    expect(isWithinSelfWriteWindow(1_002_000)).toBe(true)
    // 距次写 1600ms → 窗口外
    expect(isWithinSelfWriteWindow(1_002_600)).toBe(false)
  })
})
