import type { AiApiUsage } from '@/data/aiChatRepository'
import { useAppSettingsStore } from '@/stores/settingsStore'

interface StatusBarProps {
  usage: AiApiUsage | null
  model?: string
}

export function StatusBar({ usage, model }: StatusBarProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  if (!usage) return null

  const totalTokens = usage.promptTokens + usage.completionTokens
  const cost = totalTokens * 0.000002 // ~$2 per million tokens

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 text-body-xs text-text-tertiary font-mono border-t border-border-subtle bg-surface-sunken flex-shrink-0">
      <span>
        {t('Token', 'Tokens')}: {usage.promptTokens.toLocaleString()} + {usage.completionTokens.toLocaleString()}
      </span>
      <span>
        ~${cost.toFixed(4)} USD
      </span>
      {model && (
        <span className="text-text-tertiary/70">{model}</span>
      )}
    </div>
  )
}
