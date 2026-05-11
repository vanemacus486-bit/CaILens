import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { QuickActions } from './QuickActions'
import { ChatInput } from './ChatInput'
import { StatusBar } from './StatusBar'
import { ChatHistory } from './ChatHistory'

export function AiChatDrawer() {
  const aiChatDrawerOpen = useUIStore((s) => s.aiChatDrawerOpen)
  const setAiChatDrawerOpen = useUIStore((s) => s.setAiChatDrawerOpen)
  const settings = useAppSettingsStore((s) => s.settings)

  const messages = useAiChatStore((s) => s.messages)
  const isStreaming = useAiChatStore((s) => s.isStreaming)
  const streamingContent = useAiChatStore((s) => s.streamingContent)
  const error = useAiChatStore((s) => s.error)
  const lastUsage = useAiChatStore((s) => s.lastUsage)
  const sendMessage = useAiChatStore((s) => s.sendMessage)
  const stopStreaming = useAiChatStore((s) => s.stopStreaming)
  const regenerate = useAiChatStore((s) => s.regenerate)
  const startConversation = useAiChatStore((s) => s.startConversation)

  const [showHistory, setShowHistory] = useState(false)
  const [animating, setAnimating] = useState(false)

  const isOpen = aiChatDrawerOpen

  useEffect(() => {
    if (isOpen && !animating) {
      requestAnimationFrame(() => setAnimating(true))
    }
    if (!isOpen) {
      setAnimating(false)
    }
  }, [isOpen])

  const handleClose = () => {
    setAnimating(false)
    setTimeout(() => setAiChatDrawerOpen(false), 300)
  }

  const handleNewConversation = () => {
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
    startConversation(weekStart.getTime(), '')
    setShowHistory(false)
  }

  const handleSelectConversation = (id: string) => {
    useAiChatStore.getState().loadConversation(id)
    setShowHistory(false)
  }

  // Get model name for status bar
  const model = settings.aiModel ?? 'deepseek-chat'

  if (!isOpen && !animating) return null

  return (
    <div
      className={cn(
        'h-full flex-shrink-0 w-[400px] max-w-[45vw] border-l border-border-subtle bg-surface-base flex flex-col overflow-hidden',
        'transition-transform duration-300 ease-out',
        animating ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {showHistory ? (
        <ChatHistory
          onBack={() => setShowHistory(false)}
          onSelect={handleSelectConversation}
        />
      ) : (
        <>
          <ChatHeader
            onClose={handleClose}
            onNewConversation={handleNewConversation}
            onShowHistory={() => setShowHistory(true)}
          />
          {error && (
            <div className="px-4 py-2 text-xs text-color-text-danger bg-color-text-danger/10 border-b border-border-subtle font-sans flex-shrink-0">
              {error}
            </div>
          )}
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onRegenerate={regenerate}
          />
          <QuickActions />
          <ChatInput
            onSend={(content) => sendMessage(content, 'chat')}
            onStop={stopStreaming}
            isStreaming={isStreaming}
            disabled={!settings.aiApiKey}
          />
          <StatusBar usage={lastUsage} model={model} />
        </>
      )}
    </div>
  )
}
