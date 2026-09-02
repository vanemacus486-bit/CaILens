/**
 * Tests for domain/aiChat.ts — buildDayContextPrompt
 */

import { describe, it, expect } from 'vitest'
import { buildDayContextPrompt, parseModelList, toLocalDateKey, createAiChatRecord, appendChatMessage, type ChatMessage } from '@/domain/aiChat'
import type { CalendarEvent } from '@/domain/event'
import type { Todo } from '@/domain/todo'

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const now = Date.now()
  return {
    id: 'ev-1',
    title: '测试事件',
    startTime: new Date(2025, 5, 15, 9, 0).getTime(),  // 09:00
    endTime: new Date(2025, 5, 15, 10, 30).getTime(),   // 10:30
    color: 'accent',
    categoryId: 'accent',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    title: '测试待办',
    description: '',
    status: 'done',
    listId: 'default',
    priority: 'medium',
    domain: null,
    projectId: null,
    categoryId: null,
    dueDate: null,
    repeatPattern: null,
    goalId: null,
    isStarred: false,
    archivedAt: null,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: new Date(2025, 5, 15, 14, 0).getTime(),  // 14:00
    ...overrides,
  }
}

describe('buildDayContextPrompt', () => {
  it('returns a prompt with no events and no todos', () => {
    const result = buildDayContextPrompt('6月15日 · 周六', [], [], 'zh')
    expect(result).toContain('6月15日 · 周六')
    expect(result).not.toContain('【日程事件】')
    expect(result).not.toContain('【已完成待办】')
  })

  it('includes event details in Chinese', () => {
    const events = [makeEvent({ title: '晨会' })]
    const result = buildDayContextPrompt('6月15日 · 周六', events, [], 'zh')
    expect(result).toContain('【日程事件】')
    expect(result).toContain('晨会')
    expect(result).toContain('09:00')
    expect(result).toContain('10:30')
  })

  it('includes completed todos in Chinese', () => {
    const todos = [makeTodo({ title: '交报告' })]
    const result = buildDayContextPrompt('6月15日 · 周六', [], todos, 'zh')
    expect(result).toContain('【已完成待办】')
    expect(result).toContain('交报告')
    expect(result).toContain('14:00')
  })

  it('includes both events and todos', () => {
    const events = [makeEvent({ title: '晨会' })]
    const todos = [makeTodo({ title: '交报告' })]
    const result = buildDayContextPrompt('6月15日 · 周六', events, todos, 'zh')
    expect(result).toContain('【日程事件】')
    expect(result).toContain('【已完成待办】')
    expect(result).toContain('晨会')
    expect(result).toContain('交报告')
  })

  it('uses English format when language is not zh', () => {
    const events = [makeEvent({ title: 'Morning standup' })]
    const todos = [makeTodo({ title: 'Submit report' })]
    const result = buildDayContextPrompt('Jun 15 · Sat', events, todos, 'en')
    expect(result).toContain('【Events】')
    expect(result).toContain('【Completed Tasks】')
    expect(result).toContain('Morning standup')
    expect(result).toContain('Submit report')
    expect(result).toContain('Based on the above schedule')
  })

  it('handles events that span midnight (timestamps still included)', () => {
    const events = [makeEvent({
      startTime: new Date(2025, 5, 15, 23, 0).getTime(),
      endTime: new Date(2025, 5, 16, 1, 0).getTime(),
    })]
    const result = buildDayContextPrompt('6月15日', events, [], 'zh')
    expect(result).toContain('23:00')
    expect(result).toContain('01:00')
  })

  it('handles todos without completedAt', () => {
    const todos = [makeTodo({ completedAt: null })]
    const result = buildDayContextPrompt('6月15日', [], todos, 'zh')
    expect(result).toContain('测试待办')
    // Should not have a time bracket prefix
    expect(result).not.toContain('[undefined]')
  })

  it('returns a closing instruction line', () => {
    const result = buildDayContextPrompt('6月15日 · 周六', [], [], 'zh')
    expect(result).toContain('请基于以上')
  })

  it('prepends the custom system prompt when provided', () => {
    const result = buildDayContextPrompt('6月15日 · 周六', [], [], 'zh', '保持非常简短。')
    expect(result.startsWith('保持非常简短。\n\n以下是用户在 6月15日 · 周六')).toBe(true)
  })
})

describe('ChatMessage type', () => {
  it('allows user and assistant roles', () => {
    const msg1: ChatMessage = { role: 'user', content: 'hello' }
    const msg2: ChatMessage = { role: 'assistant', content: 'hi' }
    expect(msg1.role).toBe('user')
    expect(msg2.role).toBe('assistant')
    expect(msg1.content).toBe('hello')
    expect(msg2.content).toBe('hi')
  })
})

describe('parseModelList', () => {
  it('parses OpenAI-style { data: [{ id }] }', () => {
    const raw = { data: [{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }] }
    expect(parseModelList('openai', raw)).toEqual(['gpt-4o', 'gpt-4o-mini'])
  })

  it('parses custom (OpenAI-compatible) endpoints the same way', () => {
    const raw = { data: [{ id: 'deepseek-chat' }] }
    expect(parseModelList('custom', raw)).toEqual(['deepseek-chat'])
  })

  it('parses Anthropic { data: [{ id }] }', () => {
    const raw = { data: [{ id: 'claude-sonnet-4-20250514', type: 'model' }] }
    expect(parseModelList('anthropic', raw)).toEqual(['claude-sonnet-4-20250514'])
  })

  it('parses Google { models: [{ name: "models/..." }] }, stripping the prefix', () => {
    const raw = { models: [{ name: 'models/gemini-2.0-flash' }, { name: 'models/gemini-1.5-pro' }] }
    expect(parseModelList('google', raw)).toEqual(['gemini-1.5-pro', 'gemini-2.0-flash'])
  })

  it('dedupes and sorts model ids', () => {
    const raw = { data: [{ id: 'b-model' }, { id: 'a-model' }, { id: 'b-model' }] }
    expect(parseModelList('openai', raw)).toEqual(['a-model', 'b-model'])
  })

  it('returns [] for malformed or empty input', () => {
    expect(parseModelList('openai', null)).toEqual([])
    expect(parseModelList('openai', {})).toEqual([])
    expect(parseModelList('openai', { data: 'nope' })).toEqual([])
    expect(parseModelList('openai', { data: [{ name: 'no-id-field' }] })).toEqual([])
    expect(parseModelList('google', { models: [{}] })).toEqual([])
  })
})

describe('toLocalDateKey', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(toLocalDateKey(new Date(2025, 0, 5))).toBe('2025-01-05')
    expect(toLocalDateKey(new Date(2025, 11, 31))).toBe('2025-12-31')
  })
})

describe('AiChatRecord helpers', () => {
  it('creates a record with id = dateKey', () => {
    const rec = createAiChatRecord('2025-06-15', 'OpenAI', 1000)
    expect(rec.id).toBe('2025-06-15')
    expect(rec.dateKey).toBe('2025-06-15')
    expect(rec.messages).toEqual([])
    expect(rec.providerLabel).toBe('OpenAI')
    expect(rec.updatedAt).toBe(1000)
  })

  it('appendChatMessage appends and bumps updatedAt', () => {
    const rec = createAiChatRecord('2025-06-15', 'OpenAI', 1000)
    const next = appendChatMessage(rec, { role: 'user', content: 'hi' }, 2000)
    expect(next.messages).toEqual([{ role: 'user', content: 'hi' }])
    expect(next.updatedAt).toBe(2000)
    // 原记录不可变
    expect(rec.messages).toEqual([])
  })

})
