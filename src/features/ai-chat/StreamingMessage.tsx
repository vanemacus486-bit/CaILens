import { useAppSettingsStore } from '@/stores/settingsStore'
import { MarkdownRenderer } from './MarkdownRenderer'

interface StreamingMessageProps {
  content: string
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  if (!content) {
    return (
      <div className="flex justify-start px-4 py-2">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-surface-sunken">
          <span className="font-serif text-sm text-text-secondary animate-pulse">
            {t('思考中…', 'Thinking…')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start px-4 py-2">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-surface-sunken">
        <MarkdownRenderer content={content} />
        <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
      </div>
    </div>
  )
}
