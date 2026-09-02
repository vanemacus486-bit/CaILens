/**
 * # DrawerAIChat — DayDrawer AI 对话模式
 *
 * 展示该天的日程上下文，允许用户与已配置的 AI 提供商对话。
 * 未配置时呈现引导态，配置后显示消息历史和输入框。
 *
 * 对话历史按本地日期持久化到 aiChats 表：切换天会加载对应天的历史，
 * 流式输出逐 token 渲染，生成中可停止，完成后整段落库。
 */

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react'
import { Bot, Send, Settings, Loader2, AlertCircle, Square, Trash2, Check, CalendarPlus, ListPlus, FileText } from 'lucide-react'
import { useEventStore } from '@/stores/eventStore'
import { useTodoStore } from '@/stores/todoStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import { isEventOnDay, getDayStart } from '@/domain/time'
import { filterDoneTodosByDay } from '@/domain/todo'
import {
  buildDayContextPrompt,
  buildPeriodContextPrompt,
  weekRangeOf,
  monthRangeOf,
  quickQuestionLabels,
  reviewReportPrompt,
  parseActionableSuggestions,
  parseChartBlocks,
  stripChartBlocks,
  estimateChatTokens,
  estimateTokens,
  toLocalDateKey,
  type ChatMessage,
  type AiPromptScope,
  type ActionableSuggestion,
  type ChartBlock,
} from '@/domain/aiChat'
import { streamAiChat } from '@/data/aiChatService'
import { detectAnomalies } from '@/domain/anomaly'
import { useT } from '@/i18n/useT'
import { formatMonthDay } from '@/domain/time'
import { fireAndForget } from '@/lib/fireAndForget'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'

/** 迷你条形图：AI 返回结构化统计时渲染，纯 CSS 无图表库依赖 */
function MiniBarChart({ chart }: { chart: ChartBlock }) {
  const max = Math.max(...chart.items.map((it) => it.value), 1)
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {chart.items.map((it, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-[10px] font-sans text-text-tertiary w-16 truncate shrink-0">{it.label}</span>
          <div className="flex-1 h-2.5 rounded bg-surface-sunken overflow-hidden">
            <div
              className="h-full rounded bg-accent/70 transition-all duration-300"
              style={{ width: `${Math.max((it.value / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-text-secondary w-12 text-right shrink-0">{it.value}</span>
        </div>
      ))}
    </div>
  )
}

interface DrawerAIChatProps {
  selectedDateMs: number
}

export function DrawerAIChat({ selectedDateMs }: DrawerAIChatProps) {
  const events = useEventStore((s) => s.events)
  const todos = useTodoStore((s) => s.todos)
  const categories = useCategoryStore((s) => s.categories)
  const language = useAppSettingsStore((s) => s.settings.language)
  const ai = useAppSettingsStore((s) => s.settings.ai)
  const createEvent = useEventStore((s) => s.createEvent)
  const quickCapture = useTodoStore((s) => s.quickCapture)
  const recordAiUsage = useAppSettingsStore((s) => s.recordAiUsage)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const setSettingsModalOpen = useUIStore((s) => s.setSettingsModalOpen)
  const loadDay = useAiChatStore((s) => s.loadDay)
  const appendMessage = useAiChatStore((s) => s.appendMessage)
  const clearDay = useAiChatStore((s) => s.clearDay)
  const t = useT()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streamingText, setStreamingText] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProviderIndex, setSelectedProviderIndex] = useState(0)
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set())
  const abortRef = useRef<AbortController | null>(null)
  const streamAccumRef = useRef('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── 上下文数据 ──
  const day = useMemo(() => new Date(selectedDateMs), [selectedDateMs])
  const dayStartMs = useMemo(() => getDayStart(day), [day])
  const dateKey = useMemo(() => toLocalDateKey(day), [day])

  const dayEvents = useMemo(
    () => events.filter((e) => isEventOnDay(e, day)),
    [events, day],
  )

  const doneTodos = useMemo(
    () => todos.filter((t) => t.status === 'done' && t.completedAt !== null),
    [todos],
  )

  const dayTodos = useMemo(
    () => filterDoneTodosByDay(doneTodos, dayStartMs),
    [doneTodos, dayStartMs],
  )

  const dateLabel = useMemo(() => {
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
    const weekdayEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dow = language === 'zh'
      ? `周${weekdayNames[day.getDay()]}`
      : weekdayEn[day.getDay()]
    const month = day.getMonth() + 1
    const date = day.getDate()
    return language === 'zh'
      ? `${month}月${date}日 · ${dow}`
      : `${formatMonthDay(day)} · ${dow}`
  }, [day, language])

  const systemPrompt = useMemo(
    () => buildDayContextPrompt(dateLabel, dayEvents, dayTodos, language, ai?.systemPrompt, categories, ai?.privacy),
    [dateLabel, dayEvents, dayTodos, language, ai?.systemPrompt, categories, ai?.privacy],
  )

  // ── 按范围构建 prompt（day=当日上下文；week/month=统计趋势上下文） ──
  const buildPromptForScope = useCallback(
    (scope: AiPromptScope): string => {
      if (scope === 'day') return systemPrompt
      const range = scope === 'week' ? weekRangeOf(day) : monthRangeOf(day)
      const start = new Date(range.start)
      const end = new Date(range.end - 1)
      const label = language === 'zh'
        ? `${start.getMonth() + 1}月${start.getDate()}日 – ${end.getMonth() + 1}月${end.getDate()}日`
        : `${formatMonthDay(start)} – ${formatMonthDay(end)}`
      return buildPeriodContextPrompt(label, events, categories, range, language, ai?.systemPrompt, ai?.privacy)
    },
    [systemPrompt, day, events, categories, language, ai?.systemPrompt, ai?.privacy],
  )

  const quickQuestions = useMemo(() => {
    const labels = quickQuestionLabels(language)
    return ([
      { key: 'day' as const, scope: 'day' as const, question: labels.day },
      { key: 'week' as const, scope: 'week' as const, question: labels.week },
      { key: 'month' as const, scope: 'month' as const, question: labels.month },
      { key: 'weekReport' as const, scope: 'week' as const, question: reviewReportPrompt('week', language), report: true },
      { key: 'monthReport' as const, scope: 'month' as const, question: reviewReportPrompt('month', language), report: true },
    ])
  }, [language])

  // 当天异常检测（本地规则：睡眠不足/久坐/逾期；不出本机）
  const anomalies = useMemo(
    () => detectAnomalies(events, todos, dayStartMs, language),
    [events, todos, dayStartMs, language],
  )

  // ── 可用提供商（本地端点允许空 key） ──
  const enabledProviders = useMemo(() => {
    if (!ai?.enabled || !ai.providers || ai.providers.length === 0) return []
    return ai.providers.filter((p) => {
      if (p.apiKey && p.apiKey.trim().length > 0) return true
      // Ollama / LM Studio 等本地端点不需要 API key
      const base = p.baseUrl ?? ''
      return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(base)
    })
  }, [ai])

  const activeProvider = enabledProviders[selectedProviderIndex] ?? enabledProviders[0]

  // 如果当前索引超出范围，重置
  useEffect(() => {
    if (enabledProviders.length > 0 && selectedProviderIndex >= enabledProviders.length) {
      setSelectedProviderIndex(0)
    }
  }, [enabledProviders, selectedProviderIndex])

  // ── 加载该天的历史对话 ──
  useEffect(() => {
    let cancelled = false
    void loadDay(dateKey).then((record) => {
      if (cancelled || !record) return
      setMessages(record.messages)
    })
    return () => {
      cancelled = true
    }
  }, [dateKey, loadDay])

  // ── 自动滚动到最新 ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingText])

  // ── 发送核心（流式；串行落库用户消息与回复，避免读-改-写竞态） ──
  const runChat = useCallback((question: string, prompt: string) => {
    const text = question.trim()
    if (!text || sending || !activeProvider) return

    const userMessage: ChatMessage = { role: 'user', content: text }
    const contextMessages = [...messages, userMessage]
    const providerLabel = activeProvider.label || activeProvider.provider

    setMessages(contextMessages)
    setInput('')
    setError(null)
    setSending(true)
    setStreamingText('')
    streamAccumRef.current = ''

    const controller = new AbortController()
    abortRef.current = controller

    fireAndForget(
      (async () => {
        try {
          // 串行：先落库用户消息，流式完成后追加回复，避免读-改-写竞态覆盖
          await appendMessage(dateKey, userMessage, providerLabel)
          await streamAiChat(
            activeProvider,
            prompt,
            contextMessages,
            (delta) => {
              streamAccumRef.current += delta
              setStreamingText(streamAccumRef.current)
            },
            controller.signal,
          )
          const reply = streamAccumRef.current
          if (reply) {
            const withReply: ChatMessage[] = [...contextMessages, { role: 'assistant', content: reply }]
            setMessages(withReply)
            await appendMessage(dateKey, { role: 'assistant', content: reply }, providerLabel)
            // 本地估算用量并累计（跨月自动归零），用于月度预算告警
            const usage = estimateTokens(prompt) + estimateChatTokens(contextMessages) + estimateTokens(reply)
            await recordAiUsage(usage)
          }
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return // 用户主动停止（兼容非 DOM 环境）
          setError(e instanceof Error ? e.message : String(e))
        } finally {
          setSending(false)
          setStreamingText(null)
          abortRef.current = null
        }
      })(),
      'ai chat',
    )
  }, [sending, activeProvider, messages, dateKey, appendMessage, recordAiUsage])

  // 输入框发送（当日上下文）
  const handleSend = useCallback(() => {
    runChat(input, systemPrompt)
  }, [input, runChat, systemPrompt])

  // 快捷提问发送（按 scope 构建上下文）
  const handleQuick = useCallback((scope: AiPromptScope, question: string) => {
    runChat(question, buildPromptForScope(scope))
  }, [runChat, buildPromptForScope])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // ── 停止生成 ──
  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  // ── 重试：重新生成最后一条用户消息的回复 ──
  const handleRetry = useCallback(() => {
    if (sending || !activeProvider || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== 'user') return // 只允许重试"回复失败"的场景
    const providerLabel = activeProvider.label || activeProvider.provider

    setError(null)
    setSending(true)
    setStreamingText('')
    streamAccumRef.current = ''

    const controller = new AbortController()
    abortRef.current = controller

    fireAndForget(
      (async () => {
        try {
          await streamAiChat(
            activeProvider,
            systemPrompt,
            messages,
            (delta) => {
              streamAccumRef.current += delta
              setStreamingText(streamAccumRef.current)
            },
            controller.signal,
          )
          const reply = streamAccumRef.current
          if (reply) {
            const withReply: ChatMessage[] = [...messages, { role: 'assistant', content: reply }]
            setMessages(withReply)
            await appendMessage(dateKey, { role: 'assistant', content: reply }, providerLabel)
            // 重试同样计入本地用量估算
            const usage = estimateTokens(systemPrompt) + estimateChatTokens(messages) + estimateTokens(reply)
            await recordAiUsage(usage)
          }
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return
          setError(e instanceof Error ? e.message : String(e))
        } finally {
          setSending(false)
          setStreamingText(null)
          abortRef.current = null
        }
      })(),
      'ai chat retry',
    )
  }, [sending, activeProvider, messages, systemPrompt, dateKey, appendMessage, recordAiUsage])

  // ── 一键采纳 AI 建议：转待办 / 转当天事件（走 store） ──
  const handleAddSuggestion = useCallback(async (s: ActionableSuggestion, msgIndex: number) => {
    const key = `${msgIndex}:${s.title}`
    if (addedSuggestions.has(key)) return
    try {
      if (s.kind === 'todo') {
        await quickCapture(s.title)
      } else {
        const [h, m] = (s.time ?? '09:00').split(':').map(Number)
        const start = new Date(day)
        start.setHours(h, m, 0, 0)
        await createEvent({
          title: s.title,
          startTime: start.getTime(),
          endTime: start.getTime() + 30 * 60_000,
          color: 'accent',
          categoryId: 'accent',
        })
      }
      setAddedSuggestions((prev) => new Set(prev).add(key))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [addedSuggestions, quickCapture, createEvent, day])

  // ── 清空该天对话 ──
  const handleClear = useCallback(() => {
    if (sending) return
    abortRef.current?.abort()
    setMessages([])
    setStreamingText(null)
    setError(null)
    void clearDay(dateKey)
  }, [sending, dateKey, clearDay])

  // ── 清理 ──
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  // ── 未配置引导态 ──
  if (!enabledProviders.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-5">
        <Bot size={36} strokeWidth={1} className="text-text-quaternary/50 mb-3" />
        <p className="text-sm font-sans font-medium text-text-secondary mb-1">
          {t('dayDrawer.aiNotConfigured')}
        </p>
        <p className="text-xs font-sans text-text-tertiary text-center mb-4 max-w-[220px]">
          {t('dayDrawer.aiNotConfiguredDesc')}
        </p>
        <button
          onClick={() => {
            setActiveSettingsTab('ai')
            setSettingsModalOpen(true)
          }}
          className="flex items-center gap-1.5 text-xs font-sans text-accent hover:text-accent/80 transition-colors cursor-pointer border-none bg-transparent"
        >
          <Settings size={13} />
          {t('dayDrawer.aiGoToSettings')}
        </button>
      </div>
    )
  }

  const hasHistory = messages.length > 0 || streamingText !== null

  // 月度预算告警（本地估算用量；不阻止发送，仅提示）
  const overBudget = Boolean(
    ai?.monthlyBudget && ai.monthlyBudget > 0 &&
    ai.monthlyTokens != null && ai.monthlyTokens >= ai.monthlyBudget,
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 预算超限提示 */}
      {overBudget && (
        <div className="px-4 py-1.5 bg-danger/10 text-danger text-[11px] font-sans border-b border-danger/20">
          {t('dayDrawer.aiBudgetExceeded')}
        </div>
      )}

      {/* 当天异常提示（本地检测，不出本机） */}
      {anomalies.length > 0 && (
        <div className="px-4 py-2 flex flex-col gap-1 border-b border-border-subtle/50 bg-info/5">
          {anomalies.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] font-sans text-info">
              <AlertCircle size={11} className="mt-0.5 shrink-0" />
              <span>{a.summary}</span>
            </div>
          ))}
        </div>
      )}
      {/* Provider selector / clear history row */}
      {(enabledProviders.length > 1 || hasHistory) && (
        <div className="flex items-center justify-between gap-2 px-4 py-1.5 border-b border-border-subtle/50">
          {enabledProviders.length > 1 ? (
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-sans text-text-quaternary shrink-0">
                {t('dayDrawer.aiSelectProvider')}:
              </span>
              <select
                value={selectedProviderIndex}
                onChange={(e) => setSelectedProviderIndex(Number(e.target.value))}
                className="text-[11px] font-sans text-text-secondary bg-surface-base border border-border-subtle rounded-md px-2 py-1 focus:ring-1 focus:ring-accent/30 focus:outline-none cursor-pointer min-w-0"
              >
                {enabledProviders.map((p, i) => (
                  <option key={i} value={i}>
                    {p.label || p.provider}
                  </option>
                ))}
              </select>
            </span>
          ) : (
            <span />
          )}
          {hasHistory && (
            <button
              onClick={handleClear}
              disabled={sending}
              className="flex items-center gap-1 text-[10px] font-sans text-text-tertiary hover:text-danger transition-colors cursor-pointer border-none bg-transparent shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={t('dayDrawer.aiClearHistory')}
            >
              <Trash2 size={11} />
              {t('dayDrawer.aiClearHistory')}
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && streamingText === null && (
          <div className="flex flex-col items-center justify-center py-6 px-3">
            <Bot size={28} strokeWidth={1} className="text-text-quaternary/40 mb-2" />
            <p className="text-xs font-sans text-text-tertiary text-center mb-4">
              {dateLabel}
            </p>
            <div className="w-full flex flex-col gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q.key}
                  onClick={() => handleQuick(q.scope, q.question)}
                  disabled={sending}
                  className={`w-full flex items-center gap-1.5 text-left text-xs font-sans rounded-lg px-3 py-2 border transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    q.report
                      ? 'text-accent bg-accent/5 border-accent/30 hover:bg-accent/10'
                      : 'text-text-secondary bg-surface-sunken/60 border-border-subtle/50 hover:bg-surface-sunken hover:text-text-primary'
                  }`}
                >
                  {q.report ? <FileText size={11} className="shrink-0" /> : null}
                  <span className="truncate">{q.question}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const suggestions = msg.role === 'assistant'
            ? parseActionableSuggestions(msg.content)
            : []
          const chartBlocks = msg.role === 'assistant'
            ? parseChartBlocks(msg.content)
            : []
          const renderContent = msg.role === 'assistant'
            ? stripChartBlocks(msg.content)
            : msg.content
          return (
            <Fragment key={i}>
              <div
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm font-sans leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent/15 text-text-primary'
                      : 'bg-surface-sunken text-text-secondary'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <>
                      <MarkdownRenderer content={renderContent} />
                      {chartBlocks.map((chart, ci) => (
                        <MiniBarChart key={ci} chart={chart} />
                      ))}
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>

              {/* 可执行建议条：一键转待办 / 当天事件 */}
              {suggestions.length > 0 && (
                <div className="flex justify-start pl-1">
                  <div className="w-full max-w-[85%] rounded-xl border border-border-subtle/60 bg-surface-raised px-3 py-2 flex flex-col gap-1.5">
                    {suggestions.map((s, j) => {
                      const key = `${i}:${s.title}`
                      const done = addedSuggestions.has(key)
                      return (
                        <div key={j} className="flex items-center justify-between gap-2">
                          <span className="text-xs font-sans text-text-secondary truncate">
                            {s.title}
                            {s.kind === 'event' && s.time ? (
                              <span className="text-text-quaternary"> · {s.time}</span>
                            ) : null}
                          </span>
                          <button
                            onClick={() => void handleAddSuggestion(s, i)}
                            disabled={done}
                            className="flex items-center gap-1 shrink-0 text-[11px] font-sans rounded-md border border-border-subtle px-2 py-1 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-default"
                          >
                            {done ? (
                              <>
                                <Check size={11} className="text-success" />
                                {t('dayDrawer.aiAdded')}
                              </>
                            ) : s.kind === 'event' ? (
                              <>
                                <CalendarPlus size={11} className="text-accent" />
                                {t('dayDrawer.aiAddEvent')}
                              </>
                            ) : (
                              <>
                                <ListPlus size={11} className="text-accent" />
                                {t('dayDrawer.aiAddTodo')}
                              </>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Fragment>
          )
        })}

        {/* Streaming assistant bubble */}
        {streamingText !== null && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-3 py-2 bg-surface-sunken">
              {streamingText.length > 0 ? (
                <MarkdownRenderer content={streamingText} />
              ) : (
                <Loader2 size={14} className="animate-spin text-text-tertiary" />
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-xs text-danger font-sans px-2">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="underline text-text-tertiary hover:text-text-primary cursor-pointer border-none bg-transparent shrink-0"
            >
              {t('dayDrawer.aiRetry')}
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border-subtle/50 px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('dayDrawer.aiInputPlaceholder')}
            rows={1}
            className="flex-1 resize-none text-sm font-sans text-text-primary bg-surface-base border border-border-subtle rounded-lg px-3 py-2 placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150 min-h-[36px] max-h-[120px]"
          />
          <button
            onClick={sending ? handleStop : handleSend}
            disabled={sending ? false : (!input.trim() || !activeProvider)}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-white disabled:opacity-40 transition-opacity cursor-pointer border-none shrink-0"
            aria-label={sending ? t('dayDrawer.aiStop') : t('dayDrawer.aiSend')}
            title={sending ? t('dayDrawer.aiStop') : undefined}
          >
            {sending ? <Square size={13} /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}
