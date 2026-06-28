/**
 * # SettingsAccount — 设置：账户（头像与名称）
 *
 * 允许用户选择头像 emoji 和编辑显示名称。
 * 数据通过 profileStore 持久化。
 */

import { useState, useEffect, useCallback } from 'react'
import { useProfileStore } from '@/stores/profileStore'
import { fireAndForget } from '@/lib/fireAndForget'
import { useT } from '@/i18n/useT'

/** 预设头像 emoji 列表（呼应应用气质的温和自然风）*/
const AVATAR_OPTIONS = ['🐱', '🦊', '🐼', '🐻', '🦉', '🐧', '🌙', '⭐', '☕', '🌿']

export function SettingsAccount() {
  const profile = useProfileStore((s) => s.profile)
  const loadProfile = useProfileStore((s) => s.loadProfile)
  const updateAccount = useProfileStore((s) => s.updateAccount)
  const t = useT()
  const isLoaded = useProfileStore((s) => s.isLoaded)

  const [nameDraft, setNameDraft] = useState(profile.name)
  const [saving, setSaving] = useState(false)

  // 加载 profile 数据
  useEffect(() => {
    if (!isLoaded) {
      fireAndForget(loadProfile(), 'load profile')
    }
  }, [loadProfile, isLoaded])

  // 同步 draft
  useEffect(() => {
    setNameDraft(profile.name)
  }, [profile.name])

  // 保存名称
  const saveName = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      if (trimmed === profile.name) return
      setSaving(true)
      await updateAccount({ name: trimmed })
      setSaving(false)
    },
    [profile.name, updateAccount],
  )

  // 选择头像
  const handleSelectAvatar = useCallback(
    (emoji: string) => {
      fireAndForget(updateAccount({ avatar: emoji }), 'set avatar')
    },
    [updateAccount],
  )

  // 清除头像
  const handleClearAvatar = useCallback(() => {
    fireAndForget(updateAccount({ avatar: '' }), 'clear avatar')
  }, [updateAccount])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          {t('account.title')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          {t('account.description')}
        </p>
      </div>

      {/* 名称 */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 gap-3">
          <span className="text-sm font-sans font-medium text-text-primary flex-shrink-0">
            {t('account.name')}
          </span>
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => { fireAndForget(saveName(nameDraft), 'save name') }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                ;(e.target as HTMLInputElement).blur()
              }
              if (e.key === 'Escape') {
                setNameDraft(profile.name)
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            placeholder={t('account.namePlaceholder')}
            disabled={saving}
            className="flex-1 min-w-0 max-w-[240px] bg-surface-base border border-border-subtle rounded-lg px-3 py-1.5 text-sm font-sans text-text-primary placeholder:text-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-border-default transition-shadow duration-150 disabled:opacity-50"
          />
        </div>
      </div>

      {/* 头像选择 */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden p-5">
        <h2 className="text-sm font-sans font-medium text-text-primary mb-3">
          {t('account.avatar')}
        </h2>
        <div className="flex flex-wrap gap-2.5 items-center">
          {AVATAR_OPTIONS.map((emoji) => {
            const selected = profile.avatar === emoji
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelectAvatar(emoji)}
                className={`
                  w-10 h-10 flex items-center justify-center rounded-lg text-lg cursor-pointer border-2 transition-all duration-150
                  ${selected
                    ? 'border-accent bg-accent/10'
                    : 'border-border-subtle bg-surface-base hover:border-border-default hover:bg-surface-sunken'
                  }
                `}
                aria-label={emoji}
              >
                {emoji}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-text-tertiary font-sans">
            {profile.avatar
              ? t('account.selectedAvatar')
              : t('account.noAvatar')}
          </span>
          {profile.avatar && (
            <button
              type="button"
              onClick={handleClearAvatar}
              className="text-xs text-text-tertiary hover:text-text-primary underline cursor-pointer border-none bg-transparent transition-colors"
            >
              {t('account.clear')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
