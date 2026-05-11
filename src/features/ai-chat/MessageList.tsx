import { useEffect, useRef } from 'react'
import type { AiChatMessage as AiChatMessageType } from '@/domain/aiChat'
import { ChatMessage } from './ChatMessage'
import { StreamingMessage } from './StreamingMessage'

interface MessageListProps {
  messages: AiChatMessageType[]
  isStreaming: boolean
  streamingContent: string
  onRegenerate: (messageId: string) => void
}

export function MessageList({ messages, isStreaming, streamingContent, onRegenerate }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {messages.length === 0 && !isStreaming && (
        <div className="flex flex-col items-center justify-center h-full text-text-tertiary font-serif text-sm px-8 text-center">
          <p className="mb-2">Ask about your time data.</p>
          <p>Try one of the quick actions below to get started.</p>
        </div>
      )}
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          onRegenerate={msg.role === 'assistant' ? () => onRegenerate(msg.id) : undefined}
        />
      ))}
      {isStreaming && <StreamingMessage content={streamingContent} />}
      <div ref={bottomRef} />
    </div>
  )
}
