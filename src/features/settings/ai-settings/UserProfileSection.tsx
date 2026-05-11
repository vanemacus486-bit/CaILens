import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { MAX_PROFILE_FIELD_LENGTH } from '@/domain/aiChat'
import type { AiUserProfile } from '@/domain/aiChat'

const PROFILE_FIELDS: {
  key: keyof AiUserProfile
  zh: string
  en: string
  placeholderZh: string
  placeholderEn: string
}[] = [
  {
    key: 'mainConflict',
    zh: '当前主要矛盾',
    en: 'Current Main Conflict',
    placeholderZh: '如：准备秋招，主攻算法和系统设计',
    placeholderEn: 'E.g., Preparing for job interviews, focusing on algorithms',
  },
  {
    key: 'secondaryConflict',
    zh: '当前次要矛盾',
    en: 'Current Secondary Conflict',
    placeholderZh: '如：学习 Rust 基础',
    placeholderEn: 'E.g., Learning Rust basics',
  },
  {
    key: 'desiredHabits',
    zh: '希望保持的状态',
    en: 'Desired Habits',
    placeholderZh: '如：每周 3 次散步，睡眠不少于 7 小时',
    placeholderEn: 'E.g., Walk 3 times a week, sleep at least 7 hours',
  },
  {
    key: 'badHabits',
    zh: '已知的坏习惯',
    en: 'Known Bad Habits',
    placeholderZh: '如：抖音容易超过 1 小时',
    placeholderEn: 'E.g., Scrolling TikTok for over an hour',
  },
  {
    key: 'topicsToAvoid',
    zh: '不希望 AI 提及的话题',
    en: 'Topics to Avoid',
    placeholderZh: '如：不讨论体重和身材',
    placeholderEn: 'E.g., Don\'t discuss weight or body image',
  },
]

const INPUT_CLASS = cn(
  'w-full min-h-[80px] px-3 py-2 rounded-lg text-sm font-serif leading-relaxed resize-y',
  'bg-surface-sunken border border-border-subtle',
  'text-text-primary placeholder:text-text-tertiary',
  'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
  'transition-colors duration-200',
)

export function UserProfileSection() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const setAiUseProfile = useAppSettingsStore((s) => s.setAiUseProfile)
  const setAiUserProfile = useAppSettingsStore((s) => s.setAiUserProfile)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const useProfile = settings.aiUseProfile ?? true
  const profile = settings.aiUserProfile ?? {
    mainConflict: '',
    secondaryConflict: '',
    desiredHabits: '',
    badHabits: '',
    topicsToAvoid: '',
  }

  const handleFieldChange = useCallback(
    (key: keyof AiUserProfile, value: string) => {
      const truncated = value.slice(0, MAX_PROFILE_FIELD_LENGTH)
      const updated = { ...profile, [key]: truncated }
      fireAndForget(setAiUserProfile(updated), 'set ai user profile')
    },
    [profile, setAiUserProfile],
  )

  return (
    <fieldset className="flex flex-col gap-4 border-none p-0">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-text-tertiary font-sans">
          {t('在 AI 对话中使用个人画像', 'Use profile in AI conversations')}
        </label>
        <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5">
          {([
            [true, t('启用', 'On')],
            [false, t('禁用', 'Off')],
          ] as const).map(([val, label]) => (
            <button
              key={String(val)}
              onClick={() => fireAndForget(setAiUseProfile(val), 'set ai use profile')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                useProfile === val
                  ? 'bg-surface-base text-text-primary shadow-pill'
                  : 'text-text-secondary hover:text-text-primary bg-transparent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Profile fields */}
      {useProfile && (
        <div className="flex flex-col gap-3">
          {PROFILE_FIELDS.map((field) => {
            const value = profile[field.key] ?? ''
            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-xs text-text-tertiary font-sans">
                  {t(field.zh, field.en)}
                </label>
                <textarea
                  value={value}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={t(field.placeholderZh, field.placeholderEn)}
                  className={INPUT_CLASS}
                  rows={2}
                  maxLength={MAX_PROFILE_FIELD_LENGTH}
                />
                <span className="text-body-xs text-text-tertiary font-mono self-end">
                  {value.length}/{MAX_PROFILE_FIELD_LENGTH}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </fieldset>
  )
}
