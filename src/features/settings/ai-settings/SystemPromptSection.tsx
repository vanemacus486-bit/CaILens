import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { BASE_SYSTEM_PROMPT } from '@/domain/ai'

const TEXTAREA_CLASS = cn(
  'w-full min-h-[200px] px-3 py-2 rounded-lg text-sm font-mono leading-relaxed resize-y',
  'bg-surface-sunken border border-border-subtle',
  'text-text-primary placeholder:text-text-tertiary',
  'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
  'transition-colors duration-200',
)

export function SystemPromptSection() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const setAiCustomSystemPrompt = useAppSettingsStore((s) => s.setAiCustomSystemPrompt)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(settings.aiCustomSystemPrompt ?? BASE_SYSTEM_PROMPT)

  const hasCustom = (settings.aiCustomSystemPrompt?.length ?? 0) > 0
  const currentCustom = settings.aiCustomSystemPrompt
  const effectiveDraft = currentCustom ?? BASE_SYSTEM_PROMPT

  function handleSave() {
    const value = draft === BASE_SYSTEM_PROMPT ? undefined : draft
    fireAndForget(setAiCustomSystemPrompt(value), 'set custom system prompt')
  }

  function handleRestore() {
    setDraft(BASE_SYSTEM_PROMPT)
    fireAndForget(setAiCustomSystemPrompt(undefined), 'restore default system prompt')
  }

  function handleToggle() {
    if (!expanded) {
      setDraft(effectiveDraft)
    }
    setExpanded((v) => !v)
  }

  return (
    <fieldset className="flex flex-col gap-3 border-none p-0">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-2 text-left w-full bg-transparent border-none cursor-pointer',
          'text-sm font-sans font-medium text-text-primary transition-colors duration-200',
        )}
      >
        {expanded ? <ChevronDown size={16} className="text-text-tertiary" /> : <ChevronRight size={16} className="text-text-tertiary" />}
        {t('高级：自定义系统提示词', 'Advanced: Custom System Prompt')}
        {hasCustom && !expanded && (
          <span className="text-xs text-accent font-sans">
            ({t('已自定义', 'Customized')})
          </span>
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={TEXTAREA_CLASS}
            rows={8}
          />
          <p className="text-body-xs text-text-tertiary font-sans">
            {t(
              '修改系统提示词可能导致 AI 输出质量下降，如非必要建议保留默认',
              'Modifying the system prompt may affect AI output quality. Keep the default unless necessary.',
            )}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                'bg-accent text-white hover:opacity-90',
              )}
            >
              {t('保存', 'Save')}
            </button>
            <button
              type="button"
              onClick={handleRestore}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                'bg-surface-sunken text-text-secondary hover:text-text-primary',
              )}
            >
              {t('恢复默认', 'Restore Default')}
            </button>
          </div>
        </div>
      )}
    </fieldset>
  )
}
