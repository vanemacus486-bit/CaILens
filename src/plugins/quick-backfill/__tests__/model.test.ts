import { describe, it, expect, beforeEach } from 'vitest'
import { EVENT_COLORS } from '@/domain/event'
import type { BackfillRow } from '../model'
import {
  continueFrom,
  createInitialRow,
  isRowReady,
  nextRowKey,
  resolveEnd,
  summarize,
  toDateString,
  toImportedEvent,
  toTimeString,
  toTimestamp,
  validateRow,
} from '../model'

/**
 * quick-backfill/model.ts 全是纯函数，按项目约定必须有测试。
 *
 * 这里的所有断言都只依赖「本地时区下的日期 + 时:分」，因为 model.ts 的
 * toTimestamp / toTimeString / toDateString 明确是本地时区语义：
 * 时间戳存 UTC，但补记时用户填的是本地墙上时间。
 */

const HOUR = 3_600_000
const DAY = 86_400_000

function row(over: Partial<BackfillRow> = {}): BackfillRow {
  return {
    key: nextRowKey(),
    date: '2026-10-28',
    start: '09:00',
    end: '10:00',
    title: '写代码',
    categoryId: EVENT_COLORS[0],
    ...over,
  }
}

describe('toTimestamp / toTimeString / toDateString', () => {
  it('把 date + HH:MM 拼成本地墙上时间', () => {
    const ts = toTimestamp('2026-10-28', '09:30')
    expect(ts).not.toBeNull()
    const d = new Date(ts as number)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(9) // 0-based，10 月
    expect(d.getDate()).toBe(28)
    expect(d.getHours()).toBe(9)
    expect(d.getMinutes()).toBe(30)
    expect(d.getSeconds()).toBe(0)
    expect(d.getMilliseconds()).toBe(0)
  })

  it('接受边界时间 00:00 与 23:59', () => {
    expect(toTimestamp('2026-10-28', '00:00')).not.toBeNull()
    expect(toTimestamp('2026-10-28', '23:59')).not.toBeNull()
  })

  it.each(['24:00', '9:30', '09:60', '09:30:00', '', '-1:00'])(
    '非法时间 %s 返回 null',
    (time) => {
      expect(toTimestamp('2026-10-28', time)).toBeNull()
    },
  )

  it.each(['2026-1-5', '20261028', '2026/10/28', '', 'abcd-ef-gh'])(
    '非法日期 %s 返回 null',
    (date) => {
      expect(toTimestamp(date, '09:00')).toBeNull()
    },
  )

  it('toTimeString / toDateString 与 toTimestamp 互逆', () => {
    const ts = toTimestamp('2026-03-05', '07:08') as number
    expect(toTimeString(ts)).toBe('07:08')
    expect(toDateString(ts)).toBe('2026-03-05')
  })

  it('toTimeString 补零到两位', () => {
    const ts = toTimestamp('2026-03-05', '00:05') as number
    expect(toTimeString(ts)).toBe('00:05')
  })
})

describe('resolveEnd — 跨天判定', () => {
  it('结束晚于开始：原样返回', () => {
    const start = toTimestamp('2026-10-28', '09:00') as number
    const end = toTimestamp('2026-10-28', '10:30') as number
    expect(resolveEnd(start, end)).toBe(end)
  })

  it('23:00 → 01:00 视为跨天，+24h', () => {
    const start = toTimestamp('2026-10-28', '23:00') as number
    const end = toTimestamp('2026-10-28', '01:00') as number
    const resolved = resolveEnd(start, end)
    expect(resolved).toBe(end + DAY)
    // 落到次日 01:00
    expect(toDateString(resolved)).toBe('2026-10-29')
    expect(toTimeString(resolved)).toBe('01:00')
    // 时长 2 小时
    expect(resolved - start).toBe(2 * HOUR)
  })

  it('结束等于开始也按跨天处理（避免 0 时长记录）', () => {
    const start = toTimestamp('2026-10-28', '09:00') as number
    const end = toTimestamp('2026-10-28', '09:00') as number
    const resolved = resolveEnd(start, end)
    expect(resolved).toBe(end + DAY)
    expect(resolved - start).toBe(24 * HOUR)
  })

  it('跨月边界：10-31 23:30 → 00:30 落到 11-01', () => {
    const start = toTimestamp('2026-10-31', '23:30') as number
    const end = toTimestamp('2026-10-31', '00:30') as number
    const resolved = resolveEnd(start, end)
    expect(toDateString(resolved)).toBe('2026-11-01')
    expect(resolved - start).toBe(HOUR)
  })
})

describe('validateRow', () => {
  it('合法行返回空数组', () => {
    expect(validateRow(row())).toEqual([])
  })

  it('日期格式非法时报告 date 字段', () => {
    const issues = validateRow(row({ date: '2026/10/28' }))
    expect(issues.map((i) => i.field)).toEqual(['date'])
  })

  it('开始时间格式非法时报告 start 字段', () => {
    const issues = validateRow(row({ start: '9:00' }))
    expect(issues.map((i) => i.field)).toEqual(['start'])
  })

  it('结束时间格式非法时报告 end 字段', () => {
    const issues = validateRow(row({ end: '25:00' }))
    expect(issues.map((i) => i.field)).toEqual(['end'])
  })

  it('标题为空 / 纯空白时报告 title 字段', () => {
    expect(validateRow(row({ title: '' })).map((i) => i.field)).toEqual(['title'])
    expect(validateRow(row({ title: '   ' })).map((i) => i.field)).toEqual(['title'])
    expect(validateRow(row({ title: '\t\n' })).map((i) => i.field)).toEqual(['title'])
  })

  it('多处非法时全部报出，顺序为 date → start → end → title', () => {
    const issues = validateRow(row({ date: 'x', start: 'x', end: 'x', title: '' }))
    expect(issues.map((i) => i.field)).toEqual(['date', 'start', 'end', 'title'])
    expect(issues.every((i) => i.message.length > 0)).toBe(true)
  })

  it('isRowReady 与 validateRow 一致', () => {
    expect(isRowReady(row())).toBe(true)
    expect(isRowReady(row({ title: '' }))).toBe(false)
  })
})

describe('toImportedEvent', () => {
  it('合法行转出的事件用裁剪后的标题与解析后的结束时间', () => {
    const ev = toImportedEvent(row({ title: '  写代码  ' }))
    expect(ev).not.toBeNull()
    expect(ev?.title).toBe('写代码')
    expect(ev?.startTime).toBe(toTimestamp('2026-10-28', '09:00'))
    expect(ev?.endTime).toBe(toTimestamp('2026-10-28', '10:00'))
  })

  it('跨天行的 endTime 落在次日', () => {
    const ev = toImportedEvent(row({ start: '23:00', end: '01:00' }))
    expect(ev?.endTime).toBe((ev?.startTime as number) + 2 * HOUR)
    expect(toDateString(ev?.endTime as number)).toBe('2026-10-29')
  })

  it('非法行返回 null', () => {
    expect(toImportedEvent(row({ title: '' }))).toBeNull()
    expect(toImportedEvent(row({ date: 'nope' }))).toBeNull()
  })
})

describe('continueFrom — 接续', () => {
  it('下一行以上一行的结束时间为开始时间', () => {
    const next = continueFrom(row({ start: '09:00', end: '10:30' }))
    expect(next.date).toBe('2026-10-28')
    expect(next.start).toBe('10:30')
    // 默认 30 分钟
    expect(next.end).toBe('11:00')
  })

  it('默认 30 分钟的结束时间跨过整点时正确进位', () => {
    const next = continueFrom(row({ start: '10:00', end: '10:45' }))
    expect(next.start).toBe('10:45')
    expect(next.end).toBe('11:15')
  })

  it('跨天接续：日期推进到次日，且不退回前一天', () => {
    // 23:00 开始、01:00 结束 → 结束点在次日
    const prev = row({ date: '2026-10-28', start: '23:00', end: '01:00' })
    const next = continueFrom(prev)
    expect(next.date).toBe('2026-10-29')
    expect(next.start).toBe('01:00')
    expect(next.end).toBe('01:30')
  })

  it('跨月接续：10-31 → 11-01', () => {
    const prev = row({ date: '2026-10-31', start: '23:00', end: '01:00' })
    const next = continueFrom(prev)
    expect(next.date).toBe('2026-11-01')
    expect(next.start).toBe('01:00')
  })

  it('接续出的结束时间跨天时，start 与 date 仍表示同一个时刻', () => {
    const prev = row({ date: '2026-10-28', start: '23:00', end: '23:50' })
    const next = continueFrom(prev)
    // 23:50 + 30min = 次日 00:20，但 next 的 date 是接续开始那天（10-28）
    // end 只是 'HH:MM' 字符串，落库时由 resolveEnd 再次跨天修正
    expect(next.date).toBe('2026-10-28')
    expect(next.start).toBe('23:50')
    expect(next.end).toBe('00:20')
    const ev = toImportedEvent({ ...next, title: 'x' })
    expect(ev?.endTime).toBe((ev?.startTime as number) + 30 * 60_000)
  })

  it('继承分类，标题清空，key 是新 key', () => {
    const prev = row({ categoryId: EVENT_COLORS[3], title: '旧标题' })
    const next = continueFrom(prev)
    expect(next.categoryId).toBe(EVENT_COLORS[3])
    expect(next.title).toBe('')
    expect(next.key).not.toBe(prev.key)
  })

  it('上一行时间非法时退化为「原样复制结束时间」，不抛异常', () => {
    const prev = row({ date: 'bad', start: 'bad', end: '10:00' })
    const next = continueFrom(prev)
    expect(next.date).toBe('bad')
    expect(next.start).toBe('10:00')
    expect(next.end).toBe('10:00')
    expect(next.title).toBe('')
  })
})

describe('createInitialRow', () => {
  it('默认是当天 09:00–10:00，空标题', () => {
    const r = createInitialRow('2026-10-28')
    expect(r.date).toBe('2026-10-28')
    expect(r.start).toBe('09:00')
    expect(r.end).toBe('10:00')
    expect(r.title).toBe('')
    expect(r.categoryId).toBe(EVENT_COLORS[0])
    expect(r.key).toMatch(/^bf-\d+$/)
  })

  it('不传日期时用本地今天', () => {
    const r = createInitialRow()
    expect(r.date).toBe(toDateString(Date.now()))
  })

  it('生成的行是合法的（除标题外），填标题即可提交', () => {
    const r = createInitialRow('2026-10-28')
    expect(validateRow(r).map((i) => i.field)).toEqual(['title'])
    expect(isRowReady({ ...r, title: 'x' })).toBe(true)
  })
})

describe('nextRowKey', () => {
  it('连续调用单调递增且不重复', () => {
    const a = nextRowKey()
    const b = nextRowKey()
    const c = nextRowKey()
    expect(new Set([a, b, c]).size).toBe(3)
    const nums = [a, b, c].map((k) => Number(k.replace('bf-', '')))
    expect(nums[1]).toBeGreaterThan(nums[0])
    expect(nums[2]).toBeGreaterThan(nums[1])
  })
})

describe('summarize', () => {
  it('空行列表 → 0 条 0 毫秒', () => {
    expect(summarize([])).toEqual({ count: 0, totalMs: 0 })
  })

  it('只统计合法行', () => {
    const rows = [
      row({ start: '09:00', end: '10:00' }), // 1h
      row({ title: '' }), // 非法，跳过
      row({ start: '10:00', end: '11:30' }), // 1.5h
    ]
    const s = summarize(rows)
    expect(s.count).toBe(2)
    expect(s.totalMs).toBe(2.5 * HOUR)
  })

  it('跨天行按修正后的时长累计', () => {
    const s = summarize([row({ start: '23:00', end: '01:00' })])
    expect(s.count).toBe(1)
    expect(s.totalMs).toBe(2 * HOUR)
  })
})

describe('跨天链路端到端', () => {
  beforeEach(() => {
    // 无状态，占位以保持结构一致
  })

  it('sleep 23:00–01:00 接续出 01:00–01:30，两条都能提交', () => {
    const sleep = row({ date: '2026-10-28', start: '23:00', end: '01:00', title: '睡眠' })
    const next = continueFrom(sleep)
    const morning = { ...next, title: '早起' }

    expect(isRowReady(sleep)).toBe(true)
    expect(isRowReady(morning)).toBe(true)

    const s = summarize([sleep, morning])
    expect(s.count).toBe(2)
    expect(s.totalMs).toBe(2 * HOUR + 30 * 60_000)

    const sleepEv = toImportedEvent(sleep)
    const morningEv = toImportedEvent(morning)
    expect(toDateString(sleepEv?.startTime as number)).toBe('2026-10-28')
    // 接续行落在次日 01:00，与睡眠行首尾相接
    expect(toDateString(morningEv?.startTime as number)).toBe('2026-10-29')
    expect(morningEv?.startTime).toBe(sleepEv?.endTime)
  })
})
