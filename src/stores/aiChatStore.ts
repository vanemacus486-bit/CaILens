import { create } from 'zustand'
import { AiChatRepository, type AiApiUsage, type StreamCallbacks } from '@/data/aiChatRepository'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { computeWeekStats } from '@/domain/stats'
import { buildSystemPrompt, buildContextPrompt, ANALYSIS_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from '@/domain/ai'
import { getConversationRepo } from '@/data/getRepositories'
import type { AiChatMessage, AiUserProfile, AiSkill } from '@/domain/aiChat'
import { DEFAULT_BUILT_IN_SKILLS } from '@/domain/aiChat'
import type { AiProvider } from '@/domain/aiChat'
import type { ChatMention, CalendarContextItem, PinnedAnalysis, FeedbackRating, MessageFeedback } from '@/domain/aiChat'

interface AiChatState {
  conversationId: string | null
  weekStart: number | null
  messages: AiChatMessage[]
  isStreaming: boolean
  streamingContent: string
  error: string | null
  lastUsage: AiApiUsage | null
  calendarContext: CalendarContextItem[]
  mentions: ChatMention[]
  messageFeedback: Record<string, MessageFeedback>
  pins: PinnedAnalysis[]

  startConversation: (weekStart: number, _weekLabel: string) => Promise<void>
  sendMessage: (content: string, mode?: 'analysis' | 'chat') => Promise<void>,
  regenerate: (messageId: string) => Promise<void>
  stopStreaming: () => void
  loadConversation: (conversationId: string) => Promise<void>
  loadWeekConversation: (weekStart: number) => Promise<void>
  clearConversation: () => void
  addCalendarContext: (items: CalendarContextItem[]) => void
  removeCalendarContext: (id: string) => void
  clearCalendarContext: () => void
  addMention: (mention: ChatMention) => void
  removeMention: (index: number) => void
  clearMentions: () => void
  pinToDiary: (messageId: string, date: number) => Promise<void>
  getPinsForDate: (date: number) => Promise<PinnedAnalysis[]>
  addFeedback: (messageId: string, rating: FeedbackRating, reason?: string) => Promise<void>
  getMessageFeedback: (messageId: string) => Promise<MessageFeedback | null>
}

function generateId(): string {
  return crypto.randomUUID()
}

function getConfig() {
  const settings = useAppSettingsStore.getState().settings
  const provider: AiProvider = settings.aiProvider ?? 'deepseek'
  const endpoint = settings.aiEndpoint
  let model = settings.aiModel ?? 'deepseek-chat'
  const temperature = settings.aiTemperature ?? 0.7
  const maxTokens = settings.aiMaxTokens ?? 2000
  const useProfile = settings.aiUseProfile ?? true
  const apiKey = settings.aiApiKey ?? ''

  // Use provider-default model if the stored model doesn't make sense for current provider
  // For now, just use whatever is stored

  return { provider, apiKey, endpoint, model, temperature, maxTokens, useProfile }
}

function getEffectiveSkills(): AiSkill[] {
  const settings = useAppSettingsStore.getState().settings
  const stored = settings.aiSkills
  if (stored && stored.length > 0) return stored
  return DEFAULT_BUILT_IN_SKILLS
}

function getEffectiveProfile(): AiUserProfile | undefined {
  const settings = useAppSettingsStore.getState().settings
  if (!settings.aiUseProfile) return undefined
  const p = settings.aiUserProfile
  if (!p) return undefined
  const hasContent = p.mainConflict || p.secondaryConflict || p.desiredHabits || p.badHabits || p.topicsToAvoid
  return hasContent ? p : undefined
}

function getEffectiveSystemPrompt(mode: 'analysis' | 'chat'): string {
  const settings = useAppSettingsStore.getState().settings
  const profile = getEffectiveProfile()
  const skills = getEffectiveSkills()
  const customPrompt = settings.aiCustomSystemPrompt
  const basePrompt = mode === 'analysis' ? ANALYSIS_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT
  return buildSystemPrompt(profile, skills, customPrompt, basePrompt)
}

function buildWeekDataPrompt(weekLabel: string, weekStart: number, weekEnd: number): string {
  const events = useEventStore.getState().events
  const categories = useCategoryStore.getState().categories
  const stats = computeWeekStats(events, categories, weekStart, weekEnd)

  const catLines = stats.byCategory
    .filter((s) => s.minutes > 0)
    .map((s) => {
      const cat = categories.find((c) => c.id === s.categoryId)
      return `- ${cat?.name.zh ?? s.categoryId}: ${(s.minutes / 60).toFixed(0)}h (${s.percentage.toFixed(0)}%)`
    })

  const totalHours = stats.totalMinutes / 60
  return [
    `以下是 ${weekLabel} 的时间记录摘要：`,
    `总时长: ${totalHours.toFixed(0)}h`,
    catLines.length > 0 ? `分类明细:\n${catLines.join('\n')}` : '本周暂无分类记录',
  ].join('\n')
}

const chatRepo = new AiChatRepository()

export const useAiChatStore = create<AiChatState>()((set, get) => ({
  conversationId: null,
  weekStart: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  error: null,
  lastUsage: null,
  calendarContext: [],
  mentions: [],
  messageFeedback: {},
  pins: [],

  startConversation: async (weekStart, _weekLabel) => {
    // Try loading existing conversation for this week
    try {
      const repo = getConversationRepo()
      const existing = await repo.getByWeek(weekStart)
      if (existing) {
        const messages = await repo.getMessages(existing.id)
        set({
          conversationId: existing.id,
          weekStart,
          messages,
          error: null,
          lastUsage: null,
        })
        return
      }
    } catch {
      // Repo not initialized yet (tests, etc.)
    }

    // Create new conversation
    set({
      conversationId: generateId(),
      weekStart,
      messages: [],
      error: null,
      lastUsage: null,
      streamingContent: '',
    })
  },

  sendMessage: async (content, mode = 'chat') => {
    const { conversationId, weekStart, messages, mentions, calendarContext } = get()
    if (!conversationId || weekStart === null) return

    const config = getConfig()
    if (!config.apiKey) {
      set({ error: '请先在设置中配置 API Key' })
      return
    }

    const userMsg: AiChatMessage = {
      id: generateId(),
      conversationId,
      role: 'user',
      content,
      createdAt: Date.now(),
    }

    set({
      messages: [...messages, userMsg],
      isStreaming: true,
      streamingContent: '',
      error: null,
    })

    // Persist user message
    try {
      const repo = getConversationRepo()
      await repo.addMessage(userMsg)
      await repo.upsert({
        id: conversationId,
        weekStart,
        title: `Week Analysis`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    } catch { /* Repo not available */ }

    const systemPrompt = getEffectiveSystemPrompt(mode)
    const weekData = buildWeekDataPrompt(
      `Week starting ${new Date(weekStart).toLocaleDateString()}`,
      weekStart,
      weekStart + 6 * 86400000,
    )
    const contextPrompt = buildContextPrompt(mentions, calendarContext)
    const enrichedUserContent = contextPrompt
      ? `${content}\n\n${contextPrompt}`
      : content

    const apiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: weekData },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: enrichedUserContent },
    ]

    // Clear mentions after sending
    set({ mentions: [] })

    const callbacks: StreamCallbacks = {
      onToken: (token) => {
        set((s) => ({ streamingContent: s.streamingContent + token }))
      },
      onDone: async (fullContent, usage) => {
        const assistantMsg: AiChatMessage = {
          id: generateId(),
          conversationId: get().conversationId!,
          role: 'assistant',
          content: fullContent,
          createdAt: Date.now(),
          usage,
        }
        set((s) => ({
          messages: [...s.messages, assistantMsg],
          isStreaming: false,
          streamingContent: '',
          lastUsage: usage,
        }))

        // Persist assistant message
        try {
          const repo = getConversationRepo()
          await repo.addMessage(assistantMsg)
          await repo.update(get().conversationId!, { updatedAt: Date.now() })
        } catch { /* Repo not available */ }
      },
      onError: (err) => {
        set({
          isStreaming: false,
          streamingContent: '',
          error: err.message,
        })
      },
    }

    await chatRepo.streamChat(
      config.provider,
      config.apiKey,
      config.endpoint,
      config.model,
      apiMessages,
      config.maxTokens,
      config.temperature,
      callbacks,
    )
  },

  regenerate: async (messageId) => {
    const { messages } = get()
    const msgIndex = messages.findIndex((m) => m.id === messageId)
    if (msgIndex === -1) return

    // Find the user message that preceded this assistant message
    let userContent = ''
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userContent = messages[i].content
        break
      }
    }
    if (!userContent) return

    // Remove the assistant message and re-send
    const newMessages = messages.slice(0, msgIndex)
    set({ messages: newMessages })

    await get().sendMessage(userContent)
  },

  stopStreaming: () => {
    chatRepo.stopStreaming()
    set({ isStreaming: false, streamingContent: '' })
  },

  loadConversation: async (conversationId) => {
    try {
      const repo = getConversationRepo()
      const conv = await repo.getById(conversationId)
      if (!conv) return
      const messages = await repo.getMessages(conversationId)
      set({
        conversationId: conv.id,
        weekStart: conv.weekStart,
        messages,
        error: null,
        lastUsage: null,
      })
    } catch { /* Repo not available */ }
  },

  loadWeekConversation: async (weekStart) => {
    try {
      const repo = getConversationRepo()
      const conv = await repo.getByWeek(weekStart)
      if (conv) {
        const messages = await repo.getMessages(conv.id)
        set({
          conversationId: conv.id,
          weekStart,
          messages,
          error: null,
          lastUsage: null,
        })
      } else {
        set({
          conversationId: generateId(),
          weekStart,
          messages: [],
          error: null,
          lastUsage: null,
        })
      }
    } catch {
      set({
        conversationId: generateId(),
        weekStart,
        messages: [],
        error: null,
        lastUsage: null,
      })
    }
  },

  clearConversation: () => {
    set({
      conversationId: null,
      weekStart: null,
      messages: [],
      error: null,
      lastUsage: null,
      streamingContent: '',
      calendarContext: [],
      mentions: [],
      messageFeedback: {},
      pins: [],
    })
  },

  addCalendarContext: (items) => {
    set((s) => ({ calendarContext: [...s.calendarContext, ...items] }))
  },

  removeCalendarContext: (id) => {
    set((s) => ({ calendarContext: s.calendarContext.filter((c) => c.id !== id) }))
  },

  clearCalendarContext: () => {
    set({ calendarContext: [] })
  },

  addMention: (mention) => {
    set((s) => ({ mentions: [...s.mentions, mention] }))
  },

  removeMention: (index) => {
    set((s) => ({
      mentions: s.mentions.filter((_, i) => i !== index),
    }))
  },

  clearMentions: () => {
    set({ mentions: [] })
  },

  pinToDiary: async (messageId, date) => {
    const { messages, conversationId } = get()
    if (!conversationId) return
    const msg = messages.find((m) => m.id === messageId)
    if (!msg || msg.role !== 'assistant') return

    const pin: PinnedAnalysis = {
      id: crypto.randomUUID(),
      date,
      conversationId,
      messageId,
      content: msg.content,
      createdAt: Date.now(),
    }

    set((s) => ({ pins: [...s.pins, pin] }))

    try {
      const repo = getConversationRepo()
      await repo.upsertPin(pin)
    } catch { /* Repo not available */ }
  },

  getPinsForDate: async (date) => {
    try {
      const repo = getConversationRepo()
      return repo.getPinsByDate(date)
    } catch {
      return []
    }
  },

  addFeedback: async (messageId, rating, reason) => {
    const feedback: MessageFeedback = {
      id: crypto.randomUUID(),
      messageId,
      rating,
      reason,
      createdAt: Date.now(),
    }

    set((s) => ({ messageFeedback: { ...s.messageFeedback, [messageId]: feedback } }))

    try {
      const repo = getConversationRepo()
      await repo.addFeedback(feedback)
    } catch { /* Repo not available */ }
  },

  getMessageFeedback: async (messageId) => {
    try {
      const repo = getConversationRepo()
      return repo.getFeedbackForMessage(messageId)
    } catch {
      return null
    }
  },
}))
