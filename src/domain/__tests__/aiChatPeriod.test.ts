/**
 * Tests for domain/aiChat.ts — 周/月区间上下文与快捷提问工具
 */

import { describe, it, expect } from 'vitest'
import {
  buildPeriodContextPrompt,
  weekRangeOf,
  monthRangeOf,
  quickQuestionLabels,
  parseActionableSuggestions,
  parseChartBlocks,
  stripChartBlocks,
  estimateTokens,
  estimateChatTokens,
  buildDayContextPrompt,
  reviewReportPrompt,
} from '@/domain/aiChat'
import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'

function makeEvent(start: number, end: number, title = 'ev', categoryId: string = 'accent'): CalendarEvent {
  return {
    id: `ev-${start}`,
    title,
    startTime: start,
    endTime: end,
    color: categoryId as CalendarEvent['color'],
    categoryId: categoryId as CalendarEvent['categoryId'],
    createdAt: start,
    updatedAt: start,
  }
}

const CATEGORIES: Category[] = [
  { id: 'accent', name: '核心工作', color: 'accent', weeklyBudget: 20, folders: [] },
  { id: 'sage', name: '休息', color: 'sage', weeklyBudget: 5, folders: [] },
]

describe('weekRangeOf / monthRangeOf', () => {
  it('week starts on Monday 00:00 and spans 7 days', () => {
    // 2026-08-03 是周一
    const range = weekRangeOf(new Date(2026, 7, 5))
    const start = new Date(range.start)
    expect(start.getDay()).toBe(1)
    expect(start.getHours()).toBe(0)
    expect(range.end - range.start).toBe(7 * 24 * 3600_000)
  })

  it('month starts at the 1st 00:00 and ends at next month 1st', () => {
    const range = monthRangeOf(new Date(2026, 7, 15))
    expect(new Date(range.start).getDate()).toBe(1)
    expect(new Date(range.start).getHours()).toBe(0)
    expect(new Date(range.end).getMonth()).toBe(8)
    expect(new Date(range.end).getDate()).toBe(1)
  })
})

describe('buildPeriodContextPrompt', () => {
  it('includes total duration and category breakdown', () => {
    const range = { start: new Date(2026, 7, 3, 8).getTime(), end: new Date(2026, 7, 10, 8).getTime() }
    const events = [
      makeEvent(new Date(2026, 7, 4, 9).getTime(), new Date(2026, 7, 4, 11).getTime(), '深度工作'), // 2h accent
    ]
    const prompt = buildPeriodContextPrompt('8月3日 – 8月9日', events, CATEGORIES, range, 'zh')
    expect(prompt).toContain('8月3日 – 8月9日')
    expect(prompt).toContain('【总记录时长】2小时')
    expect(prompt).toContain('核心工作')
    expect(prompt).toContain('深度工作')
    expect(prompt).toContain('2026-8-4')
  })

  it('excludes events outside the range', () => {
    const range = { start: new Date(2026, 7, 3, 8).getTime(), end: new Date(2026, 7, 10, 8).getTime() }
    const outside = makeEvent(new Date(2026, 7, 20).getTime(), new Date(2026, 7, 20).getTime() + 3600_000)
    const prompt = buildPeriodContextPrompt('w', [outside], CATEGORIES, range, 'zh')
    expect(prompt).not.toContain('【事件时间线】')
    expect(prompt).toContain('【总记录时长】0分钟')
  })

  it('omits event timeline under category-only privacy (matches day-level masking)', () => {
    const range = { start: new Date(2026, 7, 3, 8).getTime(), end: new Date(2026, 7, 10, 8).getTime() }
    const events = [makeEvent(new Date(2026, 7, 4, 9).getTime(), new Date(2026, 7, 4, 11).getTime(), '敏感项目名')]
    const prompt = buildPeriodContextPrompt('w', events, CATEGORIES, range, 'zh', undefined, 'category-only')
    expect(prompt).not.toContain('【事件时间线】')
    expect(prompt).not.toContain('敏感项目名')
    expect(prompt).toContain('【分类占比】')
  })

  it('renders English when language is not zh', () => {
    const range = { start: 0, end: 86400_000 }
    const events = [makeEvent(3600_000, 7200_000, 'Focus work')]
    const prompt = buildPeriodContextPrompt('Aug 3', events, CATEGORIES, range, 'en')
    expect(prompt).toContain('【Total recorded】1h')
    expect(prompt).toContain('Focus work')
  })
})

describe('quickQuestionLabels', () => {
  it('returns zh labels for zh and en labels otherwise', () => {
    expect(quickQuestionLabels('zh').week).toContain('总结')
    expect(quickQuestionLabels('en').week).toContain('Summarize')
    expect(quickQuestionLabels('fr').week).toContain('Summarize')
  })
})

describe('parseActionableSuggestions', () => {
  it('parses todo and event suggestions from a task list', () => {
    const text = [
      '建议如下：',
      '- [ ] 早起冥想 10 分钟',
      '- [x] 已完成项（忽略标记不影响）',
      '- [ ] 安排晨会 @ 09:30',
    ].join('\n')
    const result = parseActionableSuggestions(text)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ kind: 'todo', title: '早起冥想 10 分钟' })
    expect(result[1].kind).toBe('todo')
    expect(result[2]).toEqual({ kind: 'event', title: '安排晨会', time: '09:30' })
  })

  it('ignores non-task lines and normalizes time', () => {
    const text = '普通段落\n- [ ] 任务\n- [ ] 提醒 @ 8:5'
    const result = parseActionableSuggestions(text)
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual({ kind: 'event', title: '提醒', time: '08:05' })
  })

  it('returns empty for text without task markers', () => {
    expect(parseActionableSuggestions('今天没有建议。')).toEqual([])
  })

  it('falls back to todo when the suggested time is invalid', () => {
    const result = parseActionableSuggestions('- [ ] 深夜任务 @ 99:99')
    expect(result).toEqual([{ kind: 'todo', title: '深夜任务 @ 99:99' }])
  })
})

describe('parseChartBlocks / stripChartBlocks', () => {
  it('parses a bar chart block', () => {
    const text = '占比如下：\n|||chart|bar|核心工作:120,休息:45,睡眠:300|||\n以上。'
    const blocks = parseChartBlocks(text)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].kind).toBe('bar')
    expect(blocks[0].items).toEqual([
      { label: '核心工作', value: 120 },
      { label: '休息', value: 45 },
      { label: '睡眠', value: 300 },
    ])
  })

  it('drops malformed items and returns empty for no block', () => {
    expect(parseChartBlocks('|||chart|bar|坏数据,ok:10|||')).toEqual([
      { kind: 'bar', items: [{ label: 'ok', value: 10 }] },
    ])
    expect(parseChartBlocks('普通文本')).toEqual([])
  })

  it('stripChartBlocks removes block text for markdown rendering', () => {
    const text = '总结\n|||chart|bar|A:1,B:2|||\n结尾'
    expect(stripChartBlocks(text)).toBe('总结\n\n结尾')
  })
})

describe('estimateTokens / estimateChatTokens', () => {
  it('estimates more tokens for CJK than ASCII', () => {
    const cjk = estimateTokens('今天工作很专注')
    const ascii = estimateTokens('hello world')
    expect(cjk).toBeGreaterThan(ascii)
    expect(estimateTokens('')).toBe(0)
  })

  it('sums messages', () => {
    const total = estimateChatTokens([
      { role: 'user', content: '你好' },
      { role: 'assistant', content: 'hello' },
    ])
    expect(total).toBe(estimateTokens('你好') + estimateTokens('hello'))
  })
})

describe('privacy masking in buildDayContextPrompt', () => {
  const rangeStart = new Date(2026, 7, 3, 9).getTime()
  const events = [makeEvent(rangeStart, rangeStart + 3600_000, '秘密项目')]

  it('category-only masks event titles but keeps category stats', () => {
    const prompt = buildDayContextPrompt('8月3日', events, [], 'zh', undefined, CATEGORIES, 'category-only')
    expect(prompt).toContain('（事件）')
    expect(prompt).not.toContain('秘密项目')
    expect(prompt).toContain('【分类统计】')
  })

  it('summary omits details and requests summary-only answer', () => {
    const prompt = buildDayContextPrompt('8月3日', events, [], 'zh', undefined, CATEGORIES, 'summary')
    expect(prompt).not.toContain('秘密项目')
    expect(prompt).toContain('仅提供摘要')
    expect(prompt).toContain('共 1 个事件')
  })

  it('full keeps titles by default', () => {
    const prompt = buildDayContextPrompt('8月3日', events, [], 'zh')
    expect(prompt).toContain('秘密项目')
  })
})

describe('reviewReportPrompt', () => {
  it('builds a sectioned review prompt in zh and en', () => {
    expect(reviewReportPrompt('week', 'zh')).toContain('这一周')
    expect(reviewReportPrompt('week', 'zh')).toContain('## 总览')
    expect(reviewReportPrompt('month', 'en')).toContain('this month')
    expect(reviewReportPrompt('month', 'en')).toContain('## Overview')
  })
})
