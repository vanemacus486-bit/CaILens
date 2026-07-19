/**
 * # DrawerAIChat — DayDrawer AI 对话模式
 *
 * 展示该天的日程上下文，允许用户与已配置的 AI 提供商对话。
 * 未配置时呈现引导态，配置后显示消息历史和输入框。
 * 聊天历史为 session 级别本地 state，切换天时因 DayDrawer key 变化自动清空。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Send, Settings, Loader2, AlertCircle } from 'lucide-react'
import { useEventStore } from '@/stores/eventStore'
import { useTodoStore } from '@/stores/todoStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { isEventOnDay, getDayStart } from '@/domain/time'
import { filterDoneTodosByDay } from '@/domain/todo'
import { buildDayContextPrompt, type ChatMessage } from '@/domain/aiChat'
import { callAiChat } from '@/data/aiChatService'
import { useT } from '@/i18n/useT'
import { formatMonthDay } from '@/domain/time'
import { fireAndForget } from '@/lib/fireAndForget'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'

interface DrawerAIChatProps {
  selectedDateMs: number
}

export function DrawerAIChat({ selectedDateMs }: DrawerAIChatProps) {
  const events = useEventStore((s) => s.events)
  const todos = useTodoStore((s) => s.todos)
  const language = useAppSettingsStore((s) => s.settings.language)
  const ai = useAppSettingsStore((s) => s.settings.ai)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const setSettingsModalOpen = useUIStore((s) => s.setSettingsModalOpen)
  const t = useT()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProviderIndex, setSelectedProviderIndex] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── 上下文数据 ──
  const day = useMemo(() => new Date(selectedDateMs), [selectedDateMs])
  const dayStartMs = useMemo(() => getDayStart(day), [day])

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
    () => buildDayContextPrompt(dateLabel, dayEvents, dayTodos, language, ai?.systemPrompt),
    [dateLabel, dayEvents, dayTodos, language, ai?.systemPrompt],
  )

  // ── 可用提供商 ──
  const enabledProviders = useMemo(() => {
    if (!ai?.enabled || !ai.providers || ai.providers.length === 0) return []
    return ai.providers.filter((p) => p.apiKey && p.apiKey.trim().length > 0)
  }, [ai])

  const activeProvider = enabledProviders[selectedProviderIndex] ?? enabledProviders[0]

  // 如果当前索引超出范围，重置
  useEffect(() => {
    if (enabledProviders.length > 0 && selectedProviderIndex >= enabledProviders.length) {
      setSelectedProviderIndex(0)
    }
  }, [enabledProviders, selectedProviderIndex])

  // ── 自动滚动到最新 ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // ── 发送消息 ──
  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || sending || !activeProvider) return

    const userMessage: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    const updatedMessages = [...messages, userMessage]

    fireAndForget(
      (async () => {
        try {
          const reply = await callAiChat(
            activeProvider,
            systemPrompt,
            updatedMessages,
            controller.signal,
          )
          setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          setError(e instanceof Error ? e.message : String(e))
        } finally {
          setSending(false)
          abortRef.current = null
        }
      })(),
      'ai chat',
    )
  }, [input, sending, activeProvider, messages, systemPrompt])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // ── 重试 ──
  const handleRetry = useCallback(() => {
    setError(null)
    // 最后一次用户消息是最后一条 role === 'user' 的消息
    const lastUserIdx = messages.length - 1
    if (lastUserIdx < 0 || messages[lastUserIdx].role !== 'user') return

    setSending(true)
    const controller = new AbortController()
    abortRef.current = controller

    const contextMessages = messages.slice(0, lastUserIdx)

    fireAndForget(
      (async () => {
        try {
          const reply = await callAiChat(
            activeProvider,
            systemPrompt,
            contextMessages,
            controller.signal,
          )
          setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          setError(e instanceof Error ? e.message : String(e))
        } finally {
          setSending(false)
          abortRef.current = null
        }
      })(),
      'ai chat retry',
    )
  }, [messages, activeProvider, systemPrompt])

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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Provider selector (only when > 1) */}
      {enabledProviders.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border-subtle/50">
          <span className="text-[10px] font-sans text-text-quaternary">
            {t('dayDrawer.aiSelectProvider')}:
          </span>
          <select
            value={selectedProviderIndex}
            onChange={(e) => setSelectedProviderIndex(Number(e.target.value))}
            className="text-[11px] font-sans text-text-secondary bg-surface-base border border-border-subtle rounded-md px-2 py-1 focus:ring-1 focus:ring-accent/30 focus:outline-none cursor-pointer"
          >
            {enabledProviders.map((p, i) => (
              <option key={i} value={i}>
                {p.label || p.provider}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center py-8">
            <Bot size={28} strokeWidth={1} className="text-text-quaternary/40 mb-2" />
            <p className="text-xs font-sans text-text-tertiary text-center">
              {dateLabel}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
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
                <MarkdownRenderer content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {sending && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-3 py-2 bg-surface-sunken">
              <Loader2 size={14} className="animate-spin text-text-tertiary" />
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
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-white disabled:opacity-40 transition-opacity cursor-pointer border-none shrink-0"
            aria-label={t('dayDrawer.aiSend')}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
