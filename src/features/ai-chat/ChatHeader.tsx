import { X, Plus, Clock } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'

interface ChatHeaderProps {
  onClose: () => void
  onNewConversation: () => void
  onShowHistory: () => void
  weekLabel?: string
}

export function ChatHeader({ onClose, onNewConversation, onShowHistory, weekLabel }: ChatHeaderProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-shrink-0">
      <div className="flex items-center gap-2">
        <h2 className="font-serif text-base font-medium text-text-primary">
          {t('对话', 'Chat')}
        </h2>
        {weekLabel && (
          <span className="text-body-xs text-text-tertiary font-sans">
            {weekLabel}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onNewConversation}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer border-none bg-transparent"
          title={t('新建对话', 'New Conversation')}
        >
          <Plus size={14} />
        </button>
        <button
          onClick={onShowHistory}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer border-none bg-transparent"
          title={t('历史记录', 'History')}
        >
          <Clock size={14} />
        </button>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer border-none bg-transparent"
          title={t('关闭', 'Close')}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
