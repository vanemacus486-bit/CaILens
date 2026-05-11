import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import { getISOWeek } from 'date-fns'

interface AnalyzeButtonProps {
  weekStart: Date
}

export function AnalyzeButton({ weekStart }: AnalyzeButtonProps) {
  const aiEnabled = useAppSettingsStore((s) => s.settings.aiEnabled)
  const aiApiKey = useAppSettingsStore((s) => s.settings.aiApiKey)
  const language = useAppSettingsStore((s) => s.settings.language)
  const isStreaming = useAiChatStore((s) => s.isStreaming)
  const startConversation = useAiChatStore((s) => s.startConversation)

  if (!aiEnabled || !aiApiKey) return null

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const weekNum = getISOWeek(weekStart)
  const label = t(`第 ${weekNum} 周`, `Week ${weekNum}`)

  const handleClick = () => {
    startConversation(weekStart.getTime(), label)
    useUIStore.getState().setAiChatDrawerOpen(true)
  }

  return (
    <button
      onClick={handleClick}
      disabled={isStreaming}
      aria-label={t('对话', 'Chat')}
      className={cn(
        'w-8 h-8 max-sm:min-w-[44px] max-sm:min-h-[44px] flex items-center justify-center rounded-md transition-colors duration-200 cursor-pointer',
        isStreaming
          ? 'text-text-tertiary cursor-not-allowed'
          : 'text-text-secondary hover:text-accent hover:bg-surface-sunken',
      )}
    >
      <Sparkles size={14} strokeWidth={1.75} />
    </button>
  )
}
