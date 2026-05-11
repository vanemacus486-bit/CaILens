import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { AiSkill } from '@/domain/aiChat'

interface SkillEditorProps {
  skill?: AiSkill
  onSave: (skill: Omit<AiSkill, 'id' | 'createdAt' | 'isBuiltIn'>) => void
  onCancel: () => void
}

const INPUT_CLASS = cn(
  'w-full h-9 px-3 rounded-lg text-sm font-sans',
  'bg-surface-sunken border border-border-subtle',
  'text-text-primary placeholder:text-text-tertiary',
  'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
  'transition-colors duration-200',
)

const TEXTAREA_CLASS = cn(
  'w-full min-h-[100px] px-3 py-2 rounded-lg text-sm font-mono leading-relaxed resize-y',
  'bg-surface-sunken border border-border-subtle',
  'text-text-primary placeholder:text-text-tertiary',
  'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
  'transition-colors duration-200',
)

export function SkillEditor({ skill, onSave, onCancel }: SkillEditorProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [promptTemplate, setPromptTemplate] = useState(skill?.promptTemplate ?? '')
  const [showInQuickEntry, setShowInQuickEntry] = useState(skill?.showInQuickEntry ?? false)

  function handleSubmit() {
    if (!name.trim() || !promptTemplate.trim()) return
    onSave({
      name: name.trim(),
      description: description.trim(),
      promptTemplate: promptTemplate.trim(),
      enabled: skill?.enabled ?? true,
      showInQuickEntry,
    })
  }

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg bg-surface-raised border border-border-subtle">
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-tertiary font-sans">
          {t('名称', 'Name')}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('Skill 名称', 'Skill name')}
          className={INPUT_CLASS}
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-tertiary font-sans">
          {t('描述', 'Description')}
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('简短描述此 Skill 的功能', 'Briefly describe what this skill does')}
          className={INPUT_CLASS}
        />
      </div>

      {/* Prompt template */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-tertiary font-sans">
          {t('提示词模板', 'Prompt Template')}
        </label>
        <textarea
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          placeholder={t('输入提示词模板...', 'Enter prompt template...')}
          className={TEXTAREA_CLASS}
          rows={4}
        />
      </div>

      {/* Show in quick entry */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowInQuickEntry((v) => !v)}
          className={cn(
            'w-4 h-4 rounded border transition-colors cursor-pointer flex-shrink-0',
            showInQuickEntry
              ? 'bg-accent border-accent'
              : 'bg-surface-base border-border-default',
          )}
          aria-label={t('快速入口', 'Quick Entry')}
        >
          {showInQuickEntry && (
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <label className="text-xs text-text-tertiary font-sans cursor-pointer">
          {t('在快速入口中显示', 'Show in quick entry')}
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim() || !promptTemplate.trim()}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
            name.trim() && promptTemplate.trim()
              ? 'bg-accent text-white hover:opacity-90'
              : 'bg-surface-sunken text-text-tertiary cursor-not-allowed',
          )}
        >
          {t('保存', 'Save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
            'bg-surface-sunken text-text-secondary hover:text-text-primary',
          )}
        >
          {t('取消', 'Cancel')}
        </button>
      </div>
    </div>
  )
}
