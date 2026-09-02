/**
 * # aiChat — AI 对话领域层
 *
 * 纯类型 + 纯函数，零副作用。
 * 负责构造系统提示、定义消息类型。
 */

import type { CalendarEvent } from './event'
import type { Todo } from './todo'
import type { AiProvider, AiPrivacy } from './settings'
import type { Category } from './category'
import type { DateRange } from './dateRange'
import { overlaps } from './dateRange'
import { computeWeekStats } from './stats'

// ── 消息类型 ─────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 单日 AI 对话记录（持久化到本地库，按本地日期一条）。
 * id = dateKey，保证同一天只有一条记录。
 */
export interface AiChatRecord {
  id: string
  /** 本地日期 YYYY-MM-DD */
  dateKey: string
  /** 该日对话消息（按时间顺序） */
  messages: ChatMessage[]
  /** 最后使用的提供商标签（展示用） */
  providerLabel: string
  createdAt: number
  updatedAt: number
}

/** 本地日期 key：YYYY-MM-DD（与 events/outfit 的日期口径一致） */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 建一条新记录（幂等，id = dateKey） */
export function createAiChatRecord(dateKey: string, providerLabel: string, now: number): AiChatRecord {
  return { id: dateKey, dateKey, messages: [], providerLabel, createdAt: now, updatedAt: now }
}

/** 追加一条消息，返回新数组（纯函数） */
export function appendChatMessage(record: AiChatRecord, message: ChatMessage, now: number): AiChatRecord {
  return { ...record, messages: [...record.messages, message], updatedAt: now }
}

export const DEFAULT_AI_SYSTEM_PROMPT_ZH = '你是 CaILens 的时间复盘助手。请基于用户的日程、已完成事项和提问，给出具体、克制、可执行的回应。不要编造不存在的数据；如果信息不足，先说明不确定性。'

export const DEFAULT_AI_SYSTEM_PROMPT_EN = 'You are the time review assistant inside CaILens. Answer with specific, restrained, actionable guidance based on the user schedule, completed tasks, and question. Do not invent missing data; state uncertainty when context is insufficient.'

export function resolveAiSystemPrompt(customPrompt: string | undefined, language: string): string {
  const trimmed = customPrompt?.trim()
  if (trimmed) return trimmed
  return language === 'zh' ? DEFAULT_AI_SYSTEM_PROMPT_ZH : DEFAULT_AI_SYSTEM_PROMPT_EN
}

// ── 上下文构建 ────────────────────────────────────────────

/** 事件标题按脱敏级别渲染 */
function eventTitle(ev: CalendarEvent, privacy: AiPrivacy, language: string): string {
  if (privacy === 'full') return ev.title
  return language === 'zh' ? '（事件）' : '(event)'
}

/**
 * 将给定日期的事件和已完成待办拼装为 system prompt 段落。
 *
 * @param dateLabel 日期标签，如 "6月15日 · 周六"
 * @param events    该日的事件列表
 * @param completedTodos 该日已完成的待办列表
 * @param language  当前语言，'zh' 其他
 * @param customSystemPrompt 可选自定义系统提示词
 * @param categories 分类列表（privacy 非 full 时用于输出分类统计）
 * @param privacy   脱敏级别，默认 full
 * @returns system prompt 文本
 */
export function buildDayContextPrompt(
  dateLabel: string,
  events: CalendarEvent[],
  completedTodos: Todo[],
  language: string,
  customSystemPrompt?: string,
  categories: Category[] = [],
  privacy: AiPrivacy = 'full',
): string {
  const lines: string[] = [resolveAiSystemPrompt(customSystemPrompt, language), '']
  const masked = privacy !== 'full'

  if (language === 'zh') {
    lines.push(`以下是用户在 ${dateLabel} 的日程与已完成事项：`)
    lines.push('')

    if (events.length > 0) {
      lines.push('【日程事件】')
      for (const ev of events) {
        const startStr = formatTimeShort(ev.startTime)
        const endStr = formatTimeShort(ev.endTime)
        lines.push(`  - ${startStr} → ${endStr}：${eventTitle(ev, privacy, language)}`)
      }
      lines.push('')
    }

    if (completedTodos.length > 0) {
      lines.push('【已完成待办】')
      for (const todo of completedTodos) {
        const timeStr = todo.completedAt
          ? formatTimeShort(todo.completedAt)
          : ''
        const title = masked ? (language === 'zh' ? '（待办）' : '(task)') : todo.title
        lines.push(`  - ${timeStr ? `[${timeStr}] ` : ''}${title}`)
      }
      lines.push('')
    }

    // 脱敏时输出分类时长统计（不发明细）
    if (masked && categories.length > 0 && events.length > 0) {
      const start = Math.min(...events.map((e) => e.startTime))
      const end = Math.max(...events.map((e) => e.endTime))
      const stats = computeWeekStats(events, categories, { start, end })
      lines.push('【分类统计】')
      for (const stat of stats.byCategory) {
        if (stat.minutes <= 0) continue
        const cat = categories.find((c) => c.id === stat.categoryId)
        const name = cat?.name || stat.categoryId
        lines.push(`  - ${name}: ${formatDurationZh(stat.minutes)} (${stat.percentage}%)`)
      }
      lines.push('')
    }

    if (privacy === 'summary') {
      lines.push(`用户要求仅提供摘要：本次共 ${events.length} 个事件、${completedTodos.length} 条已完成待办，分类统计如上。请基于统计回答，不要追问具体事件标题。`)
    } else {
      lines.push('请基于以上日程与任务完成情况回答用户的问题。可以提出时间管理建议、分析作息模式、或回答关于这一天安排的任何疑问。')
      lines.push('如需展示分类时长对比，请使用条形图块：|||chart|bar|分类名:数值,分类名:数值|||（数值单位为分钟）')
    }
  } else {
    lines.push(`Below is the user's schedule and completed tasks for ${dateLabel}:`)
    lines.push('')

    if (events.length > 0) {
      lines.push('【Events】')
      for (const ev of events) {
        const startStr = formatTimeShort(ev.startTime)
        const endStr = formatTimeShort(ev.endTime)
        lines.push(`  - ${startStr} → ${endStr}: ${eventTitle(ev, privacy, language)}`)
      }
      lines.push('')
    }

    if (completedTodos.length > 0) {
      lines.push('【Completed Tasks】')
      for (const todo of completedTodos) {
        const timeStr = todo.completedAt
          ? formatTimeShort(todo.completedAt)
          : ''
        const title = masked ? (language === 'zh' ? '（待办）' : '(task)') : todo.title
        lines.push(`  - ${timeStr ? `[${timeStr}] ` : ''}${title}`)
      }
      lines.push('')
    }

    if (masked && categories.length > 0 && events.length > 0) {
      const start = Math.min(...events.map((e) => e.startTime))
      const end = Math.max(...events.map((e) => e.endTime))
      const stats = computeWeekStats(events, categories, { start, end })
      lines.push('【Category stats】')
      for (const stat of stats.byCategory) {
        if (stat.minutes <= 0) continue
        const cat = categories.find((c) => c.id === stat.categoryId)
        const name = cat?.name || stat.categoryId
        lines.push(`  - ${name}: ${formatDurationEn(stat.minutes)} (${stat.percentage}%)`)
      }
      lines.push('')
    }

    if (privacy === 'summary') {
      lines.push(`The user requested a summary only: ${events.length} events and ${completedTodos.length} completed tasks; category stats above. Answer from the stats; do not ask about specific event titles.`)
    } else {
      lines.push('Based on the above schedule and completed tasks, answer the user\'s questions. You can suggest time management improvements, analyze daily patterns, or answer any questions about this day.')
      lines.push('To show a category duration comparison, use a bar chart block: |||chart|bar|Label:value,Label:value||| (values in minutes)')
    }
  }

  return lines.join('\n')
}

// ── 周/月区间上下文 ───────────────────────────────────────

/** 将分钟数格式化为 "X小时Y分钟" / "Xh Ym" */
function formatDurationZh(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  if (h === 0) return `${m}分钟`
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分钟`
}

function formatDurationEn(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * 将给定区间（周/月）内的事件与分类统计拼装为 system prompt 段落。
 *
 * 复用 domain/stats.ts 的 computeWeekStats 统计引擎，让 AI 能看到趋势
 * 而不只是单日明细。事件按天分组展示时间线。
 *
 * @param label    区间标签，如 "6月9日 – 6月15日 · 第24周"
 * @param events   全量事件（函数内部按 range 过滤）
 * @param categories 分类列表（顺序即输出顺序）
 * @param range    半开区间 [start, end)
 * @param language 当前语言，'zh' 其他
 */
export function buildPeriodContextPrompt(
  label: string,
  events: CalendarEvent[],
  categories: Category[],
  range: DateRange,
  language: string,
  customSystemPrompt?: string,
  privacy: AiPrivacy = 'full',
): string {
  const lines: string[] = [resolveAiSystemPrompt(customSystemPrompt, language), '']

  // 只保留与区间相交的事件
  const inRange = events.filter((e) => overlaps(range, { start: e.startTime, end: e.endTime }))
  const stats = computeWeekStats(events, categories, range)

  const zh = language === 'zh'
  if (zh) {
    lines.push(`以下是用户在 ${label} 的时间统计与事件记录：`)
    lines.push('')
    lines.push(`【总记录时长】${formatDurationZh(stats.totalMinutes)}`)
    if (stats.byCategory.length > 0) {
      lines.push('【分类占比】')
      for (const stat of stats.byCategory) {
        if (stat.minutes <= 0) continue
        const cat = categories.find((c) => c.id === stat.categoryId)
        const name = cat?.name || stat.categoryId
        lines.push(`  - ${name}: ${formatDurationZh(stat.minutes)} (${stat.percentage}%)`)
      }
      lines.push('')
    }
    // 脱敏（category-only/summary）时不输出事件时间线，与单日口径一致
    if (privacy === 'full' && inRange.length > 0) {
      lines.push('【事件时间线】')
      // 按本地日期分组
      const byDay = new Map<string, CalendarEvent[]>()
      for (const ev of inRange) {
        const d = new Date(ev.startTime)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
        const list = byDay.get(key) ?? []
        list.push(ev)
        byDay.set(key, list)
      }
      const dayKeys = Array.from(byDay.keys()).sort()
      for (const key of dayKeys) {
        const dayEvents = byDay.get(key)!
        lines.push(`  ${key}:`)
        for (const ev of dayEvents) {
          lines.push(`    - ${formatTimeShort(ev.startTime)} → ${formatTimeShort(ev.endTime)}：${eventTitle(ev, privacy, language)}`)
        }
      }
      lines.push('')
    }
    lines.push('请基于以上时间统计与事件记录回答用户的问题。可以分析时间分配是否失衡、作息是否规律、并提出可执行的改进建议。')
    lines.push('如需展示分类时长对比，请使用条形图块：|||chart|bar|分类名:数值,分类名:数值|||（数值单位为分钟）')
  } else {
    lines.push(`Below is the user's time statistics and event log for ${label}:`)
    lines.push('')
    lines.push(`【Total recorded】${formatDurationEn(stats.totalMinutes)}`)
    if (stats.byCategory.length > 0) {
      lines.push('【Category breakdown】')
      for (const stat of stats.byCategory) {
        if (stat.minutes <= 0) continue
        const cat = categories.find((c) => c.id === stat.categoryId)
        const name = cat?.name || stat.categoryId
        lines.push(`  - ${name}: ${formatDurationEn(stat.minutes)} (${stat.percentage}%)`)
      }
      lines.push('')
    }
    // 脱敏时不输出事件时间线，与单日口径一致
    if (privacy === 'full' && inRange.length > 0) {
      lines.push('【Event timeline】')
      const byDay = new Map<string, CalendarEvent[]>()
      for (const ev of inRange) {
        const d = new Date(ev.startTime)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
        const list = byDay.get(key) ?? []
        list.push(ev)
        byDay.set(key, list)
      }
      const dayKeys = Array.from(byDay.keys()).sort()
      for (const key of dayKeys) {
        const dayEvents = byDay.get(key)!
        lines.push(`  ${key}:`)
        for (const ev of dayEvents) {
          lines.push(`    - ${formatTimeShort(ev.startTime)} → ${formatTimeShort(ev.endTime)}: ${eventTitle(ev, privacy, language)}`)
        }
      }
      lines.push('')
    }
    lines.push('Based on the above statistics and event log, answer the user\'s questions. You can analyze allocation imbalances, sleep and routine patterns, and propose actionable improvements.')
    lines.push('To show a category duration comparison, use a bar chart block: |||chart|bar|Label:value,Label:value||| (values in minutes)')
  }

  return lines.join('\n')
}

// ── 快捷提问模板 ─────────────────────────────────────────

/** 快捷提问的上下文范围 */
export type AiPromptScope = 'day' | 'week' | 'month'

export interface QuickQuestion {
  /** i18n key 前缀（完整 key 为 dayDrawer.aiQuick<X>） */
  i18nKey: 'day' | 'week' | 'month'
  /** 发送给模型的问题文本 */
  question: string
  scope: AiPromptScope
}

/** 构建某天所在周的 [周一 00:00, 下周一 00:00) 范围 */
export function weekRangeOf(date: Date): DateRange {
  const start = new Date(date)
  const dow = (start.getDay() + 6) % 7 // 周一 = 0
  start.setDate(start.getDate() - dow)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start: start.getTime(), end: end.getTime() }
}

/** 构建某天所在自然月的 [月初, 下月初) 范围 */
export function monthRangeOf(date: Date): DateRange {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return { start: start.getTime(), end: end.getTime() }
}

/** 快捷问题的中文/英文文案（按 i18n 语言路由） */
export function quickQuestionLabels(language: string): Record<'day' | 'week' | 'month', string> {
  if (language === 'zh') {
    return {
      day: '今天哪里失衡？',
      week: '帮我总结这一周',
      month: '这个月我睡够了吗？',
    }
  }
  return {
    day: 'Where did today go off balance?',
    week: 'Summarize this week',
    month: 'Am I sleeping enough this month?',
  }
}

// ── 一键复盘报告 ───────────────────────────────────────────

/** 生成周复盘/月复盘的提问文本（报告式分节输出） */
export function reviewReportPrompt(scope: 'week' | 'month', language: string): string {
  const period = scope === 'week'
    ? (language === 'zh' ? '这一周' : 'this week')
    : (language === 'zh' ? '这个月' : 'this month')
  if (language === 'zh') {
    return `请基于以上数据生成${period}的复盘报告，用 Markdown 分节输出：## 总览、## 分类分析、## 作息与健康、## 下一步改进。每节给出具体数字与可执行建议。`
  }
  return `Based on the data above, generate a review report for ${period} with Markdown sections: ## Overview, ## Category analysis, ## Routine & health, ## Next steps. Give concrete numbers and actionable advice in each section.`
}

// ── token 用量估算（本地，不上报） ─────────────────────────
/**
 * 本地估算文本 token 数：CJK 字符按 1.5 token、其余按 0.25 token/字符。
 * 纯启发式，仅用于用量预算告警，不追求与模型计费一致。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  let tokens = 0
  for (const ch of text) {
    tokens += ch.charCodeAt(0) > 127 ? 1.5 : 0.25
  }
  return Math.round(tokens)
}

/** 估算一组消息的总 token 数（不含 system prompt） */
export function estimateChatTokens(messages: readonly ChatMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0)
}

// ── 结构化输出：可执行建议 ─────────────────────────────────

/** AI 回复中解析出的可执行建议 */
export interface ActionableSuggestion {
  kind: 'todo' | 'event'
  title: string
  /** 事件建议的本地时间 "HH:MM"（来自 "@ 21:00" 后缀） */
  time?: string
}

/**
 * 从 AI 回复中提取可执行建议。
 *
 * 约定格式：markdown 任务列表行 `- [ ] 标题`，若以 `@ HH:MM` 结尾则视为
 * 「日程事件」建议（时间即当天该时刻），否则视为「待办」建议。
 * 纯函数、零副作用。
 */
export function parseActionableSuggestions(text: string): ActionableSuggestion[] {
  const out: ActionableSuggestion[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    const m = line.match(/^[-*]\s*\[[ xX]\]\s+(.+)$/)
    if (!m) continue
    const raw = m[1].trim()
    if (!raw) continue
    const timeMatch = raw.match(/@\s*(\d{1,2}):(\d{1,2})\s*$/)
    if (timeMatch) {
      const hhNum = Number(timeMatch[1])
      const mmNum = Number(timeMatch[2])
      // 非法时间（如 @ 99:99）会静默回绕产生幽灵事件，回退为待办建议
      if (hhNum <= 23 && mmNum <= 59) {
        const hh = timeMatch[1].padStart(2, '0')
        const mm = timeMatch[2].padStart(2, '0')
        out.push({
          kind: 'event',
          title: raw.replace(/@\s*\d{1,2}:\d{1,2}\s*$/, '').trim(),
          time: `${hh}:${mm}`,
        })
      } else {
        out.push({ kind: 'todo', title: raw })
      }
    } else {
      out.push({ kind: 'todo', title: raw })
    }
  }
  return out
}

// ── 结构化输出：数据可视化图表块 ───────────────────────────

/** AI 回复中解析出的图表块 */
export interface ChartBlock {
  kind: 'bar'
  items: { label: string; value: number }[]
}

/**
 * 从 AI 回复中提取图表块。
 *
 * 约定格式：`|||chart|bar|分类名:数值,分类名:数值|||`（数值单位由 prompt 约定）。
 * 纯函数、零副作用；无法解析的项被丢弃。
 */
export function parseChartBlocks(text: string): ChartBlock[] {
  const out: ChartBlock[] = []
  const re = /\|\|\|chart\|(bar)\|([^|]+)\|\|\|/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const items = m[2]
      .split(',')
      .map((part) => {
        const idx = part.indexOf(':')
        if (idx === -1) return null
        const label = part.slice(0, idx).trim()
        const value = Number(part.slice(idx + 1).trim())
        if (!label || !Number.isFinite(value)) return null
        return { label, value }
      })
      .filter((x): x is { label: string; value: number } => x !== null)
    if (items.length > 0) {
      out.push({ kind: m[1] as 'bar', items })
    }
  }
  return out
}

/** 从渲染用的 markdown 内容中剔除图表块文本（图表单独渲染） */
export function stripChartBlocks(text: string): string {
  return text.replace(/\|\|\|chart\|(bar)\|[^|]+\|\|\|/g, '')
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
