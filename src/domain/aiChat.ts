import type { EventColor } from './event'

export type AiProvider = 'deepseek' | 'openai' | 'claude' | 'custom'

export interface AiChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
  eventReferences?: Array<{ eventId: string; title: string }>
  usage?: { promptTokens: number; completionTokens: number }
}

export interface AiConversation {
  id: string
  weekStart: number
  title: string
  summary?: string
  createdAt: number
  updatedAt: number
}

export interface AiUserProfile {
  mainConflict: string
  secondaryConflict: string
  desiredHabits: string
  badHabits: string
  topicsToAvoid: string
}

export interface AiSkill {
  id: string
  name: string
  description: string
  promptTemplate: string
  isBuiltIn: boolean
  enabled: boolean
  showInQuickEntry: boolean
  createdAt: number
}

export interface AiChatConfig {
  provider: AiProvider
  apiKey: string
  endpoint?: string
  model: string
  temperature: number
  maxTokens: number
  useProfile: boolean
}

// === @Mention System ===

export type MentionKind = 'category' | 'event' | 'day' | 'week' | 'range'

export interface ChatMention {
  kind: MentionKind
  value: string
  label: string
  color?: EventColor
}

// === Calendar Context ===

export interface CalendarContextItem {
  id: string
  type: 'event' | 'range'
  eventId?: string
  eventTitle?: string
  startTime?: number
  endTime?: number
  categoryId?: EventColor
}

// === Pin to Diary ===

export interface PinnedAnalysis {
  id: string
  date: number
  conversationId: string
  messageId: string
  content: string
  createdAt: number
}

// === Feedback System ===

export type FeedbackRating = 'helpful' | 'not-helpful'

export interface MessageFeedback {
  id: string
  messageId: string
  rating: FeedbackRating
  reason?: string
  createdAt: number
}

// === Reverse Anchoring ===

export interface AnchorMatch {
  type: 'category' | 'event'
  categoryId?: EventColor
  eventTitle?: string
  matchText: string
}

export const MAX_PROFILE_FIELD_LENGTH = 200

export const DEFAULT_BUILT_IN_SKILLS: AiSkill[] = [
  {
    id: 'builtin-analyze-week',
    name: 'Analyze This Week',
    description: 'Analyze the current week\'s time distribution and patterns',
    promptTemplate: 'Analyze the current week\'s time data. Focus on: 1) how time was distributed across categories, 2) any notable patterns or anomalies, 3) one gentle suggestion for improvement. Keep it concise.',
    isBuiltIn: true,
    enabled: true,
    showInQuickEntry: true,
    createdAt: 0,
  },
  {
    id: 'builtin-compare-last',
    name: 'Compare Last Week',
    description: 'Compare this week with the previous week',
    promptTemplate: 'Compare this week\'s time data with the previous week. Highlight: 1) what changed significantly, 2) trends continuing or reversing, 3) any context worth noting. Be data-driven.',
    isBuiltIn: true,
    enabled: true,
    showInQuickEntry: true,
    createdAt: 0,
  },
  {
    id: 'builtin-plan-next',
    name: 'Plan Next Week',
    description: 'Get suggestions for next week based on past patterns',
    promptTemplate: 'Based on the past few weeks of time data, suggest a gentle plan for next week. Consider: 1) what\'s been working well, 2) where time consistently leaks, 3) a small change worth trying. Do NOT prescribe a rigid schedule — suggest, don\'t command.',
    isBuiltIn: true,
    enabled: true,
    showInQuickEntry: true,
    createdAt: 0,
  },
]
