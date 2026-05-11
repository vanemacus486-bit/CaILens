import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, X } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import { MentionAutocomplete, type MentionSuggestion } from './MentionAutocomplete'
import type { ChatMention } from '@/domain/aiChat'

interface ChatInputProps {
  onSend: (content: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

function extractMentionsFromText(text: string): {
  cleaned: string
  mentions: ChatMention[]
} {
  const mentions: ChatMention[] = []
  const cleaned = text.replace(/@\[(\w+):([^\]]+)\]/g, (_raw, kind, label) => {
    mentions.push({
      kind: kind as ChatMention['kind'],
      value: label,
      label,
    })
    return ''
  })
  return { cleaned: cleaned.trim(), mentions }
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  // Mention autocomplete state
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionAtPos, setMentionAtPos] = useState(-1)
  const [activeIndex, setActiveIndex] = useState(0)

  // Calendar context
  const calendarContext = useAiChatStore((s) => s.calendarContext)
  const addMention = useAiChatStore((s) => s.addMention)
  const removeCalendarContext = useAiChatStore((s) => s.removeCalendarContext)

  // Track input changes for @ detection
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)

    const cursorPos = e.target.selectionStart ?? newValue.length
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex !== -1) {
      // Check that @ is at word start (preceded by space or at start of string)
      const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' '
      if (charBefore === ' ' || charBefore === '\n') {
        const textAfterAt = textBeforeCursor.slice(atIndex + 1)
        // Stop if there's a space or newline in the search (word boundary)
        const spaceIdx = textAfterAt.search(/[\s\n]/)
        const searchText = spaceIdx === -1 ? textAfterAt : textAfterAt.slice(0, spaceIdx)

        if (searchText.length >= 0) {
          setMentionOpen(true)
          setMentionSearch(searchText)
          setMentionAtPos(atIndex)
          setActiveIndex(0)
          return
        }
      }
    }

    // No @ detected — close autocomplete
    setMentionOpen(false)
    setMentionSearch('')
    setMentionAtPos(-1)
  }, [])

  // Insert a mention token when user selects a suggestion
  const handleMentionSelect = useCallback((suggestion: MentionSuggestion) => {
    const token = `@[${suggestion.kind}:${suggestion.label}]`

    // Replace from @ to cursor with the token
    const cursorPos = textareaRef.current?.selectionStart ?? 0
    const textBeforeCursor = value.slice(0, mentionAtPos)
    const textAfterCursor = value.slice(cursorPos)

    const newValue = textBeforeCursor + token + ' ' + textAfterCursor
    setValue(newValue)
    setMentionOpen(false)
    setMentionSearch('')
    setMentionAtPos(-1)

    // Focus back on textarea and place cursor after inserted token
    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (ta) {
        const pos = mentionAtPos + token.length + 1
        ta.focus()
        ta.setSelectionRange(pos, pos)
      }
    })
  }, [value, mentionAtPos])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming || disabled) return

    // Extract mentions from tokens, clean text
    const { cleaned, mentions } = extractMentionsFromText(trimmed)

    // Add extracted mentions to store
    for (const mention of mentions) {
      addMention(mention)
    }

    // Send cleaned text (mentions will be resolved in sendMessage via buildContextPrompt)
    onSend(cleaned || trimmed)
    setValue('')
    setMentionOpen(false)
  }, [value, isStreaming, disabled, onSend, addMention])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (mentionOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => prev + 1)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(0, prev - 1))
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        // The MentionAutocomplete handles selection via onMouseDown,
        // but for keyboard we need a different mechanism.
        // We'll just close the autocomplete and let Enter send normally.
        // The activeIndex is tracked but selection via Enter is tricky
        // without exposing suggestions. Let's close and send.
        setMentionOpen(false)
        handleSend()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionOpen(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [mentionOpen, handleSend])

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isStreaming])

  return (
    <div className="px-3 py-2 border-t border-border-subtle flex-shrink-0">
      {/* Context chips row */}
      {calendarContext.length > 0 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {calendarContext.map((ctx) => (
            <div
              key={ctx.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-sunken border border-border-subtle text-xs font-sans text-text-secondary"
            >
              <span className="truncate max-w-[120px]">
                {ctx.type === 'event'
                  ? ctx.eventTitle
                  : ctx.startTime
                    ? `${new Date(ctx.startTime).getHours()}:${String(new Date(ctx.startTime).getMinutes()).padStart(2, '0')}`
                    : t('选中', 'Selected')}
              </span>
              <button
                onClick={() => removeCalendarContext(ctx.id)}
                className="cursor-pointer border-none bg-transparent p-0 text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end relative">
        {mentionOpen && (
          <MentionAutocomplete
            searchText={mentionSearch}
            activeIndex={activeIndex}
            onSelect={handleMentionSelect}
          />
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('输入消息…', 'Type a message…')}
          disabled={isStreaming || disabled}
          rows={1}
          className="flex-1 min-h-[36px] max-h-[120px] resize-none rounded-lg px-3 py-2 text-sm font-sans bg-surface-sunken border border-border-default text-text-primary placeholder:text-text-tertiary focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors duration-200 disabled:opacity-50"
        />
        {value.length > 0 && (
          <div className="text-xs text-text-tertiary mt-1 text-right">
            {t('Enter 发送 · Shift+Enter 换行 · @ 提及', 'Enter to send · Shift+Enter newline · @ to mention')}
          </div>
        )}
        {isStreaming ? (
          <button
            onClick={onStop}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-color-text-danger text-white hover:opacity-90 transition-opacity cursor-pointer border-none flex-shrink-0"
            title={t('停止', 'Stop')}
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors cursor-pointer border-none flex-shrink-0"
            title={t('发送', 'Send')}
          >
            <Send size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
