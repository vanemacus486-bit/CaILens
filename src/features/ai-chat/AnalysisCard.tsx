import { useCallback, useState } from 'react'
import { Eye, GitBranch, Lightbulb, Pin } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useAiChatStore } from '@/stores/aiChatStore'

interface AnalysisCardProps {
  data: {
    observation: string
    pattern: string
    suggestion: string
  }
  messageId?: string
}

const sectionConfig = [
  {
    key: 'observation' as const,
    icon: Eye,
    titleZh: '看见',
    titleEn: 'Observation',
  },
  {
    key: 'pattern' as const,
    icon: GitBranch,
    titleZh: '模式',
    titleEn: 'Pattern',
  },
  {
    key: 'suggestion' as const,
    icon: Lightbulb,
    titleZh: '微调',
    titleEn: 'Suggestion',
  },
]

export function AnalysisCard({ data, messageId }: AnalysisCardProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const pinToDiary = useAiChatStore((s) => s.pinToDiary)
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)

  const handlePin = useCallback(() => {
    if (!messageId) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    pinToDiary(messageId, today.getTime())
    setPinned(true)
    setTimeout(() => setPinned(false), 2000)
  }, [messageId, pinToDiary])

  return (
    <div
      className="space-y-2.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {sectionConfig.map(({ key, icon: Icon, titleZh, titleEn }) => {
        const content = data[key]
        if (!content) return null

        return (
          <div
            key={key}
            className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden"
          >
            <div className="flex items-center gap-1.5 px-3.5 pt-3 pb-0.5">
              <Icon size={13} className="text-accent flex-shrink-0" />
              <span className="text-[11px] font-sans font-medium text-text-tertiary tracking-wide uppercase">
                {t(titleZh, titleEn)}
              </span>
            </div>
            <p className="px-3.5 pb-3 pt-1 font-serif text-sm leading-relaxed text-text-primary">
              {content}
            </p>
          </div>
        )
      })}
      {hovered && messageId && (
        <div className="flex items-center justify-end gap-1 pt-1 border-t border-border-subtle">
          <button
            onClick={handlePin}
            className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-accent transition-colors cursor-pointer border-none bg-transparent"
            title={t('固定到日记', 'Pin to diary')}
          >
            <Pin size={12} className={pinned ? 'text-accent' : ''} />
          </button>
        </div>
      )}
    </div>
  )
}
