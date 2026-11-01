import { describe, it, expect } from 'vitest'
import { parseEventDraft, type EventDraftContext } from '../eventDraft'

// ── Seam: parseEventDraft 纯函数 ──────────────────────────
// 「输入一句话 → 一个事件块」。输入是用户敲进录入框的原文，
// 输出是能直接落库的事件草稿：标题、起止、分类。
// 期望值全部是手算的时刻，不复用实现里的任何算式。

// 锚定 2026-06-22（周一），所有只写时分的输入都落在这天
const BASE = new Date(2026, 5, 22, 0, 0, 0, 0).getTime()
const at = (h: number, m: number) => new Date(2026, 5, 22, h, m, 0, 0).getTime()

const ctx = (over: Partial<EventDraftContext> = {}): EventDraftContext => ({
  baseDate: BASE,
  now: at(15, 0),
  defaultCategoryId: 'accent',
  categories: [],
  defaultSpan: { start: at(14, 20), end: at(15, 0) },
  ...over,
})

describe('parseEventDraft', () => {
  it('显式时间范围：9:00-10:30 写代码 → 块就是 9:00–10:30，标题只剩正文', () => {
    const draft = parseEventDraft('9:00-10:30 写代码', ctx())
    expect(draft.startTime).toBe(at(9, 0))
    expect(draft.endTime).toBe(at(10, 30))
    expect(draft.title).toBe('写代码')
    expect(draft.timeSource).toBe('explicit')
  })

  it('相对时长：写代码 45分钟 → 从默认起点往后推 45 分钟，标题不含时长', () => {
    const draft = parseEventDraft('写代码 45分钟', ctx())
    expect(draft.startTime).toBe(at(14, 20))
    expect(draft.endTime).toBe(at(15, 5))
    expect(draft.title).toBe('写代码')
    expect(draft.timeSource).toBe('duration')
  })

  it('中文小时数：看论文 1.5小时 → 90 分钟', () => {
    const draft = parseEventDraft('看论文 1.5小时', ctx())
    expect(draft.endTime - draft.startTime).toBe(90 * 60_000)
    expect(draft.title).toBe('看论文')
  })

  it('纯文字没有任何时间信息 → 用默认区间，标题原样保留', () => {
    const draft = parseEventDraft('发呆', ctx())
    expect(draft.title).toBe('发呆')
    expect(draft.startTime).toBe(at(14, 20))
    expect(draft.endTime).toBe(at(15, 0))
    expect(draft.timeSource).toBe('default')
  })

  it('显式时间和时长同时出现 → 显式时间优先', () => {
    const draft = parseEventDraft('9:00-10:30 写代码 30分钟', ctx())
    expect(draft.startTime).toBe(at(9, 0))
    expect(draft.endTime).toBe(at(10, 30))
    expect(draft.timeSource).toBe('explicit')
  })

  it('显式区间跨零点：23:00-01:00 睡觉 → 结束落在次日', () => {
    const draft = parseEventDraft('23:00-01:00 睡觉', ctx())
    expect(draft.startTime).toBe(at(23, 0))
    expect(draft.endTime).toBe(at(1, 0) + 24 * 60 * 60_000)
    expect(draft.title).toBe('睡觉')
  })

  it('标题命中关键词 → 用命中的分类，而不是默认分类', () => {
    const draft = parseEventDraft('开会 20分钟', ctx({
      defaultCategoryId: 'accent',
      categories: [
        { id: 'sky', folders: [{ keywords: ['开会'] }] },
      ],
    }))
    expect(draft.categoryId).toBe('sky')
    expect(draft.title).toBe('开会')
  })

  it('空输入 → 不炸，标题为空、走默认区间', () => {
    const draft = parseEventDraft('   ', ctx())
    expect(draft.title).toBe('')
    expect(draft.timeSource).toBe('default')
    expect(draft.startTime).toBe(at(14, 20))
  })
})
