import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Trash2, Pencil, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getConversationRepo } from '@/data/getRepositories'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { AiConversation, AiChatMessage } from '@/domain/aiChat'

// ── Helpers ─────────────────────────────────────────────────

function getCurrentWeekStart(): number {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  return monday.getTime()
}

function formatWeekTitle(weekStart: number, language: string): string {
  const start = new Date(weekStart)
  const end = new Date(weekStart + 6 * 86400000)
  const locale = language === 'zh' ? 'zh-CN' : 'en-US'
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}

function extractTopic(messages: AiChatMessage[]): string | null {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return null
  const text = firstUser.content
  if (text.length <= 40) return text
  return text.slice(0, 40) + '…'
}

// ── Week grouping ───────────────────────────────────────────

interface WeekGroup {
  weekStart: number
  conversations: AiConversation[]
  messageCount: number
}

function groupByWeek(
  conversations: AiConversation[],
  messagesMap: Map<string, AiChatMessage[]>,
): WeekGroup[] {
  const groups = new Map<number, AiConversation[]>()

  for (const conv of conversations) {
    const ws = conv.weekStart
    if (!groups.has(ws)) groups.set(ws, [])
    groups.get(ws)!.push(conv)
  }

  return Array.from(groups.entries())
    .map(([weekStart, convs]) => ({
      weekStart,
      conversations: convs,
      messageCount: convs.reduce((sum, c) => sum + (messagesMap.get(c.id)?.length ?? 0), 0),
    }))
    .sort((a, b) => b.weekStart - a.weekStart)
}

// ── Component ───────────────────────────────────────────────

interface ChatHistoryProps {
  onBack: () => void
  onSelect: (id: string) => void
}

export function ChatHistory({ onBack, onSelect }: ChatHistoryProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [messagesMap, setMessagesMap] = useState<Map<string, AiChatMessage[]>>(new Map())
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(() => new Set([getCurrentWeekStart()]))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const summaryInputRef = useRef<HTMLInputElement>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load conversations and their messages
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const repo = getConversationRepo()
        const all = await repo.listAll()
        if (cancelled) return
        setConversations(all)

        // Pre-fetch messages for topic extraction and counting
        const map = new Map<string, AiChatMessage[]>()
        await Promise.all(
          all.map(async (conv) => {
            const msgs = await repo.getMessages(conv.id)
            map.set(conv.id, msgs)
          }),
        )
        if (cancelled) return
        setMessagesMap(map)

        // Auto-generate summaries for conversations without one
        const needsSummary = all.filter((conv) => !conv.summary && map.has(conv.id))
        if (needsSummary.length > 0) {
          const updated = all.map((conv) => {
            if (conv.summary) return conv
            const msgs = map.get(conv.id)
            if (!msgs) return conv
            const firstUser = msgs.find((m) => m.role === 'user')
            if (!firstUser) return conv
            const text = firstUser.content
            const summary = text.length <= 80 ? text : text.slice(0, 80) + '…'
            repo.update(conv.id, { summary })
            return { ...conv, summary }
          })
          if (!cancelled) setConversations(updated)
        }
      } catch {
        /* Repo not available */
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Handlers ────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    try {
      const repo = getConversationRepo()
      await repo.delete(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      setMessagesMap((prev) => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
    } catch {
      /* Repo not available */
    }
  }

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) return
    try {
      const repo = getConversationRepo()
      const trimmed = { title: editTitle.trim(), summary: editSummary.trim() || undefined }
      await repo.update(id, trimmed)
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...trimmed } : c)),
      )
      setEditingId(null)
    } catch {
      /* Repo not available */
    }
  }

  const toggleWeek = (weekStart: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(weekStart)) {
        next.delete(weekStart)
      } else {
        next.add(weekStart)
      }
      return next
    })
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  // ── Derived data ────────────────────────────────────────

  // Search filter: match title, summary, or topic against debounced query
  const filteredConversations = useMemo(() => {
    if (!debouncedQuery) return conversations
    const q = debouncedQuery.toLowerCase()
    return conversations.filter((conv) => {
      const topic = extractTopic(messagesMap.get(conv.id) ?? [])
      return (
        conv.title.toLowerCase().includes(q) ||
        (topic?.toLowerCase().includes(q) ?? false) ||
        (conv.summary?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [conversations, messagesMap, debouncedQuery])

  const weekGroups = useMemo(
    () => groupByWeek(filteredConversations, messagesMap),
    [filteredConversations, messagesMap],
  )

  // Has conversations, but filter returned nothing
  const noResults = debouncedQuery && conversations.length > 0 && weekGroups.length === 0

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle flex-shrink-0">
        <button
          onClick={onBack}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer border-none bg-transparent"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-serif text-base font-medium text-text-primary">
          {t('历史对话', 'Chat History')}
        </h2>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-border-subtle flex-shrink-0">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('搜索对话...', 'Search conversations...')}
            className="w-full h-8 pl-8 pr-3 rounded-lg text-sm bg-surface-sunken border border-border-subtle text-text-primary placeholder:text-text-tertiary focus:border-accent focus-visible:outline-none transition-colors duration-200"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary font-serif text-sm px-8 text-center">
            <p>{t('暂无历史对话', 'No conversations yet')}</p>
          </div>
        ) : noResults ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary font-serif text-sm px-8 text-center">
            <p>{t('未找到匹配的对话', 'No conversations match')}</p>
          </div>
        ) : (
          weekGroups.map((group) => {
            const isCurrent = group.weekStart === getCurrentWeekStart()
            const isExpanded = expandedWeeks.has(group.weekStart)

            return (
              <div key={group.weekStart}>
                {/* Week header */}
                <button
                  onClick={() => toggleWeek(group.weekStart)}
                  className={cn(
                    'w-full flex items-center gap-2 px-4 py-2 text-left border-b border-border-subtle hover:bg-surface-sunken transition-colors duration-200 cursor-pointer bg-transparent',
                    isCurrent && 'border-l-2 border-l-accent',
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-text-tertiary flex-shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-text-tertiary flex-shrink-0" />
                  )}
                  <span className="flex-1 font-sans text-sm font-medium text-text-primary min-w-0 truncate">
                    {isCurrent
                      ? t('本周', 'This Week')
                      : formatWeekTitle(group.weekStart, language)}
                  </span>
                  <span className="text-body-xs text-text-tertiary font-mono whitespace-nowrap flex-shrink-0 ml-2">
                    {group.conversations.length === 1
                      ? t('1 条对话', '1 conversation')
                      : t(
                          `${group.conversations.length} 条对话`,
                          `${group.conversations.length} conversations`,
                        )}
                  </span>
                </button>

                {/* Conversation items */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-out',
                    isExpanded ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0',
                  )}
                >
                  {group.conversations.map((conv) => {

                    return (
                      <div
                        key={conv.id}
                        className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle hover:bg-surface-sunken transition-colors duration-200 group"
                      >
                        <button
                          onClick={() => onSelect(conv.id)}
                          className="flex-1 text-left bg-transparent border-none cursor-pointer p-0 min-w-0"
                        >
                          {editingId === conv.id ? (
                            <div className="flex flex-col gap-1.5">
                              <input
                                ref={titleInputRef}
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => handleRename(conv.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRename(conv.id)
                                  if (e.key === 'Escape') setEditingId(null)
                                }}
                                className="w-full h-7 px-2 rounded text-sm font-medium bg-surface-base border border-border-subtle text-text-primary focus:border-accent focus-visible:outline-none"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <input
                                ref={summaryInputRef}
                                value={editSummary}
                                onChange={(e) => setEditSummary(e.target.value)}
                                onBlur={() => handleRename(conv.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRename(conv.id)
                                  if (e.key === 'Tab' && titleInputRef.current) {
                                    titleInputRef.current.focus()
                                    e.preventDefault()
                                  }
                                }}
                                placeholder={t('添加摘要...', 'Add summary...')}
                                className="w-full h-7 px-2 rounded text-sm bg-surface-base border border-border-subtle text-text-primary placeholder:text-text-tertiary focus:border-accent focus-visible:outline-none"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          ) : (
                            <>
                              <p className="font-sans text-sm font-medium text-text-primary truncate">
                                {conv.title || t('未命名对话', 'Untitled')}
                              </p>
                              {(conv.summary) && (
                                <p className="text-body-xs text-text-tertiary truncate mt-0.5">
                                  {conv.summary.length > 120 ? conv.summary.slice(0, 120) + '…' : conv.summary}
                                </p>
                              )}
                              <p className="text-body-xs text-text-tertiary font-mono mt-0.5">
                                {formatDate(conv.updatedAt)}
                              </p>
                            </>
                          )}
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingId(conv.id)
                              setEditTitle(conv.title)
                              setEditSummary(conv.summary ?? '')
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent"
                            title={t('重命名', 'Rename')}
                          >
                            <Pencil size={12} />
                          </button>
                          {conv.summary && (
                            <button
                              onClick={() => {
                                setEditingId(conv.id)
                                setEditTitle(conv.title)
                                setEditSummary(conv.summary ?? '')
                                setTimeout(() => summaryInputRef.current?.focus(), 0)
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent"
                              title={t('编辑摘要', 'Edit summary')}
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(conv.id)}
                            className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-color-text-danger transition-colors cursor-pointer border-none bg-transparent"
                            title={t('删除', 'Delete')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
