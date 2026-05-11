import { useState, useMemo, useCallback } from 'react'
import { Copy, RefreshCw, Check, Pin, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useUIStore } from '@/stores/uiStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import type { AiChatMessage as AiChatMessageType } from '@/domain/aiChat'
import type { AnchorMatch } from '@/domain/aiChat'
import type { AiAnalysisResult } from '@/domain/ai'
import { EventReferenceChip } from './EventReferenceChip'
import { AnalysisCard } from './AnalysisCard'
import { MarkdownRenderer, type AnchorTermDef } from './MarkdownRenderer'

interface ChatMessageProps {
  message: AiChatMessageType
  onRegenerate?: () => void
}

function parseAnalysisJson(content: string): AiAnalysisResult | null {
  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.observation === 'string' &&
      typeof parsed.pattern === 'string' &&
      typeof parsed.suggestion === 'string'
    ) {
      return {
        observation: parsed.observation,
        pattern: parsed.pattern,
        suggestion: parsed.suggestion,
      }
    }
    return null
  } catch {
    return null
  }
}

export function ChatMessage({ message, onRegenerate }: ChatMessageProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isUser = message.role === 'user'

  const analysisData = useMemo(() => {
    if (isUser) return null
    return parseAnalysisJson(message.content)
  }, [message.content, isUser])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Reverse Anchoring ──────────────────────────────────

  const categories = useCategoryStore((s) => s.categories)
  const currentEvents = useEventStore((s) => s.events)
  const setHoveredAnchor = useUIStore((s) => s.setHoveredAnchor)

  const anchorTerms = useMemo((): AnchorTermDef[] => {
    const terms: AnchorTermDef[] = []
    for (const cat of categories) {
      if (cat.name.zh) terms.push({ lower: cat.name.zh.toLowerCase(), match: { type: 'category', categoryId: cat.id, matchText: cat.name.zh } })
      if (cat.name.en) terms.push({ lower: cat.name.en.toLowerCase(), match: { type: 'category', categoryId: cat.id, matchText: cat.name.en } })
    }
    const seen = new Set<string>()
    for (const ev of currentEvents) {
      if (!ev.title || seen.has(ev.title.toLowerCase())) continue
      seen.add(ev.title.toLowerCase())
      terms.push({ lower: ev.title.toLowerCase(), match: { type: 'event', eventTitle: ev.title, matchText: ev.title } })
    }
    terms.sort((a, b) => b.lower.length - a.lower.length)
    return terms
  }, [categories, currentEvents])

  const handleAnchorHover = useCallback((match: AnchorMatch | null) => {
    setHoveredAnchor(match)
  }, [setHoveredAnchor])

  // ── Pin & Feedback ─────────────────────────────────────

  const pinToDiary = useAiChatStore((s) => s.pinToDiary)
  const addFeedback = useAiChatStore((s) => s.addFeedback)
  const messageFeedback = useAiChatStore((s) => s.messageFeedback)
  const feedback = messageFeedback[message.id]
  const [justRated, setJustRated] = useState<'helpful' | 'not-helpful' | null>(null)

  const handleFeedback = useCallback((rating: 'helpful' | 'not-helpful') => {
    addFeedback(message.id, rating)
    setJustRated(rating)
    setTimeout(() => setJustRated(null), 2000)
  }, [message.id, addFeedback])

  const handlePin = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    pinToDiary(message.id, today.getTime())
  }, [message.id, pinToDiary])

  const renderContent = () => {
    if (analysisData) {
      return <AnalysisCard data={analysisData} />
    }

    // Parse event references: [title](event:<uuid>)
    const parts: Array<{ type: 'text' | 'event'; content: string; eventId?: string }> = []
    const regex = /\[([^\]]+)\]\(event:([^)]+)\)/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(message.content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: message.content.slice(lastIndex, match.index) })
      }
      parts.push({ type: 'event', content: match[1], eventId: match[2] })
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < message.content.length) {
      parts.push({ type: 'text', content: message.content.slice(lastIndex) })
    }

    if (parts.length === 0) {
      return (
        <MarkdownRenderer
          content={message.content}
          anchorTerms={anchorTerms}
          onAnchorHover={handleAnchorHover}
        />
      )
    }

    return (
      <div className="font-serif text-sm leading-relaxed">
        {parts.map((part, i) => {
          if (part.type === 'event' && part.eventId) {
            const event = useEventStore.getState().events.find((e) => e.id === part.eventId)
            const eventTime = event?.startTime ?? Date.now()
            return (
              <EventReferenceChip
                key={i}
                title={part.content}
                eventTime={eventTime}
              />
            )
          }
          return (
            <MarkdownRenderer
              key={i}
              content={part.content}
              anchorTerms={anchorTerms}
              onAnchorHover={handleAnchorHover}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 py-2`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`max-w-[85%] rounded-2xl ${
          isUser
            ? 'rounded-br-md bg-accent text-white px-4 py-2.5'
            : analysisData
              ? 'rounded-bl-md bg-transparent'
              : 'rounded-bl-md bg-surface-sunken text-text-secondary px-4 py-2.5'
        }`}
      >
        {renderContent()}
        {!isUser && hovered && (
          <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-border-subtle">
            <button
              onClick={handleCopy}
              className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent"
              title={t('复制', 'Copy')}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent"
                title={t('重新生成', 'Regenerate')}
              >
                <RefreshCw size={12} />
              </button>
            )}
            <div className="w-px h-4 bg-border-subtle mx-0.5" />
            <button
              onClick={handlePin}
              className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-accent transition-colors cursor-pointer border-none bg-transparent"
              title={t('固定到日记', 'Pin to diary')}
            >
              <Pin size={12} />
            </button>
            <button
              onClick={() => handleFeedback('helpful')}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer border-none bg-transparent ${
                feedback?.rating === 'helpful' || justRated === 'helpful'
                  ? 'text-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
              title={t('有帮助', 'Helpful')}
            >
              <ThumbsUp size={12} />
            </button>
            <button
              onClick={() => handleFeedback('not-helpful')}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer border-none bg-transparent ${
                feedback?.rating === 'not-helpful' || justRated === 'not-helpful'
                  ? 'text-color-text-danger'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
              title={t('没有帮助', 'Not helpful')}
            >
              <ThumbsDown size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
