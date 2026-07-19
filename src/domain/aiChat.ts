/**
 * # aiChat — AI 对话领域层
 *
 * 纯类型 + 纯函数，零副作用。
 * 负责构造系统提示、定义消息类型。
 */

import type { CalendarEvent } from './event'
import type { Todo } from './todo'
import type { AiProvider } from './settings'

// ── 消息类型 ─────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const DEFAULT_AI_SYSTEM_PROMPT_ZH = '你是 CaILens 的时间复盘助手。请基于用户的日程、已完成事项和提问，给出具体、克制、可执行的回应。不要编造不存在的数据；如果信息不足，先说明不确定性。'

export const DEFAULT_AI_SYSTEM_PROMPT_EN = 'You are the time review assistant inside CaILens. Answer with specific, restrained, actionable guidance based on the user schedule, completed tasks, and question. Do not invent missing data; state uncertainty when context is insufficient.'

export function resolveAiSystemPrompt(customPrompt: string | undefined, language: string): string {
  const trimmed = customPrompt?.trim()
  if (trimmed) return trimmed
  return language === 'zh' ? DEFAULT_AI_SYSTEM_PROMPT_ZH : DEFAULT_AI_SYSTEM_PROMPT_EN
}

// ── 上下文构建 ────────────────────────────────────────────

/**
 * 将给定日期的事件和已完成待办拼装为 system prompt 段落。
 *
 * @param dateLabel 日期标签，如 "6月15日 · 周六"
 * @param events    该日的事件列表
 * @param completedTodos 该日已完成的待办列表
 * @param language  当前语言，'zh' 其他
 * @returns system prompt 文本
 */
export function buildDayContextPrompt(
  dateLabel: string,
  events: CalendarEvent[],
  completedTodos: Todo[],
  language: string,
  customSystemPrompt?: string,
): string {
  const lines: string[] = [resolveAiSystemPrompt(customSystemPrompt, language), '']

  if (language === 'zh') {
    lines.push(`以下是用户在 ${dateLabel} 的日程与已完成事项：`)
    lines.push('')

    if (events.length > 0) {
      lines.push('【日程事件】')
      for (const ev of events) {
        const startStr = formatTimeShort(ev.startTime)
        const endStr = formatTimeShort(ev.endTime)
        lines.push(`  - ${startStr} → ${endStr}：${ev.title}`)
      }
      lines.push('')
    }

    if (completedTodos.length > 0) {
      lines.push('【已完成待办】')
      for (const todo of completedTodos) {
        const timeStr = todo.completedAt
          ? formatTimeShort(todo.completedAt)
          : ''
        lines.push(`  - ${timeStr ? `[${timeStr}] ` : ''}${todo.title}`)
      }
      lines.push('')
    }

    lines.push('请基于以上日程与任务完成情况回答用户的问题。可以提出时间管理建议、分析作息模式、或回答关于这一天安排的任何疑问。')
  } else {
    lines.push(`Below is the user's schedule and completed tasks for ${dateLabel}:`)
    lines.push('')

    if (events.length > 0) {
      lines.push('【Events】')
      for (const ev of events) {
        const startStr = formatTimeShort(ev.startTime)
        const endStr = formatTimeShort(ev.endTime)
        lines.push(`  - ${startStr} → ${endStr}: ${ev.title}`)
      }
      lines.push('')
    }

    if (completedTodos.length > 0) {
      lines.push('【Completed Tasks】')
      for (const todo of completedTodos) {
        const timeStr = todo.completedAt
          ? formatTimeShort(todo.completedAt)
          : ''
        lines.push(`  - ${timeStr ? `[${timeStr}] ` : ''}${todo.title}`)
      }
      lines.push('')
    }

    lines.push('Based on the above schedule and completed tasks, answer the user\'s questions. You can suggest time management improvements, analyze daily patterns, or answer any questions about this day.')
  }

  return lines.join('\n')
}

// ── 辅助函数 ──────────────────────────────────────────────

function formatTimeShort(timestamp: number): string {
  const d = new Date(timestamp)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

// ── 模型列表解析 ──────────────────────────────────────────

/**
 * 解析各 provider `/models` 端点返回的 JSON，提取模型名列表。
 * 纯函数、零副作用，便于测试。
 *
 * - openai / anthropic / custom：形如 `{ data: [{ id }] }`
 * - google：形如 `{ models: [{ name: "models/xxx" }] }`，去掉 `models/` 前缀
 *
 * @returns 去重并升序排序的模型名数组；输入异常时返回 []
 */
export function parseModelList(provider: AiProvider, raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return []

  let ids: string[] = []

  if (provider === 'google') {
    const models = (raw as { models?: unknown }).models
    if (Array.isArray(models)) {
      ids = models
        .map((m) =>
          m && typeof m === 'object' && typeof (m as { name?: unknown }).name === 'string'
            ? (m as { name: string }).name.replace(/^models\//, '')
            : null,
        )
        .filter((x): x is string => x !== null && x.length > 0)
    }
  } else {
    const data = (raw as { data?: unknown }).data
    if (Array.isArray(data)) {
      ids = data
        .map((m) =>
          m && typeof m === 'object' && typeof (m as { id?: unknown }).id === 'string'
            ? (m as { id: string }).id
            : null,
        )
        .filter((x): x is string => x !== null && x.length > 0)
    }
  }

  return Array.from(new Set(ids)).sort()
}
