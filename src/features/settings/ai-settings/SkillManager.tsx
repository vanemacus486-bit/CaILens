import { useState, useCallback } from 'react'
import { Plus, X, Pencil, BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { DEFAULT_BUILT_IN_SKILLS } from '@/domain/aiChat'
import { SkillEditor } from './SkillEditor'
import type { AiSkill } from '@/domain/aiChat'

function generateId(): string {
  return `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function SkillManager() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const setAiSkills = useAppSettingsStore((s) => s.setAiSkills)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const skills = (settings.aiSkills?.length ?? 0) > 0
    ? settings.aiSkills!
    : DEFAULT_BUILT_IN_SKILLS

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleToggleEnabled = useCallback(
    (skillId: string) => {
      const updated = skills.map((s) =>
        s.id === skillId ? { ...s, enabled: !s.enabled } : s,
      )
      fireAndForget(setAiSkills(updated), 'toggle skill enabled')
    },
    [skills, setAiSkills],
  )

  const handleDelete = useCallback(
    (skillId: string) => {
      const updated = skills.filter((s) => s.id !== skillId)
      fireAndForget(setAiSkills(updated), 'delete skill')
      if (editingId === skillId) setEditingId(null)
    },
    [skills, setAiSkills, editingId],
  )

  const handleSaveEdit = useCallback(
    (skillId: string, data: Omit<AiSkill, 'id' | 'createdAt' | 'isBuiltIn'>) => {
      const updated = skills.map((s) =>
        s.id === skillId
          ? { ...s, ...data }
          : s,
      )
      fireAndForget(setAiSkills(updated), 'edit skill')
      setEditingId(null)
    },
    [skills, setAiSkills],
  )

  const handleAdd = useCallback(
    (data: Omit<AiSkill, 'id' | 'createdAt' | 'isBuiltIn'>) => {
      const newSkill: AiSkill = {
        ...data,
        id: generateId(),
        isBuiltIn: false,
        createdAt: Date.now(),
      }
      const updated = [...skills, newSkill]
      fireAndForget(setAiSkills(updated), 'add skill')
      setIsAdding(false)
    },
    [skills, setAiSkills],
  )

  return (
    <fieldset className="flex flex-col gap-3 border-none p-0">
      <div className="flex items-center justify-between">
        <label className="text-xs text-text-tertiary font-sans">
          {t('分析视角（Skills）', 'Analysis Skills')}
        </label>
        <button
          type="button"
          onClick={() => {
            setIsAdding(true)
            setEditingId(null)
          }}
          className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
            'bg-surface-sunken text-text-secondary hover:text-text-primary',
          )}
        >
          <Plus size={14} />
          {t('新增 Skill', 'Add Skill')}
        </button>
      </div>

      {isAdding && (
        <SkillEditor
          onSave={handleAdd}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {skills.length === 0 && !isAdding && (
        <p className="text-body-xs text-text-tertiary font-sans">
          {t('暂无自定义 Skill', 'No custom skills yet')}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {skills.map((skill) => {
          const isEditing = editingId === skill.id
          return (
            <div key={skill.id}>
              {isEditing ? (
                <SkillEditor
                  skill={skill}
                  onSave={(data) => handleSaveEdit(skill.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className={cn(
                  'flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors duration-200',
                  skill.enabled
                    ? 'border-border-default bg-surface-base'
                    : 'border-border-subtle bg-surface-base opacity-60',
                )}>
                  {/* Enabled toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleEnabled(skill.id)}
                    className={cn(
                      'w-5 h-5 rounded border transition-colors cursor-pointer flex-shrink-0 mt-0.5',
                      skill.enabled
                        ? 'bg-accent border-accent'
                        : 'bg-surface-sunken border-border-default',
                    )}
                    aria-label={skill.enabled ? t('禁用', 'Disable') : t('启用', 'Enable')}
                  >
                    {skill.enabled && (
                      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                        <path d="M5 10L8.5 13.5L15 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-sans font-medium text-text-primary">
                        {skill.name}
                      </span>
                      {skill.isBuiltIn && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-surface-sunken text-text-tertiary">
                          <BadgeCheck size={10} />
                          {t('内置', 'Built-in')}
                        </span>
                      )}
                    </div>
                    <p className="text-body-xs text-text-tertiary font-sans truncate mt-0.5">
                      {skill.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingId(skill.id)}
                      className={cn(
                        'w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer border-none',
                        'text-text-tertiary hover:text-text-secondary hover:bg-surface-sunken',
                      )}
                      aria-label={t('编辑', 'Edit')}
                    >
                      <Pencil size={14} />
                    </button>
                    {!skill.isBuiltIn && (
                      <button
                        type="button"
                        onClick={() => handleDelete(skill.id)}
                        className={cn(
                          'w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer border-none',
                          'text-text-tertiary hover:text-color-text-danger hover:bg-surface-sunken',
                        )}
                        aria-label={t('删除', 'Delete')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
