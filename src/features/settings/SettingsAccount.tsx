/**
 * # SettingsAccount — 设置：账户（头像与名称）
 *
 * 只输出两条设置行，不再自带页面标题与卡片外壳：
 * 它被「界面」页的 Section「账户」内嵌，也供旧 `account` 深链复用。
 * 数据通过 profileStore 持久化。
 */

import { useState, useEffect, useCallback } from 'react'
import { useProfileStore } from '@/stores/profileStore'
import { fireAndForget } from '@/lib/fireAndForget'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/utils'
import { SettingsRow } from './ui'

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
    <>
      <SettingsRow
        anchor="interface-account-name"
        title={t('account.name')}
        description={t('account.nameHint')}
      >
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            fireAndForget(saveName(nameDraft), 'save name')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
            if (e.key === 'Escape') {
              setNameDraft(profile.name)
              e.currentTarget.blur()
            }
          }}
          placeholder={t('account.namePlaceholder')}
          disabled={saving}
          aria-label={t('account.name')}
          className="h-8 w-[220px] rounded-lg border border-border-subtle bg-surface-base px-3 font-sans text-sm text-text-primary outline-none transition-shadow duration-150 placeholder:text-text-tertiary focus-visible:border-border-default focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50"
        />
      </SettingsRow>

      <SettingsRow
        anchor="interface-account-avatar"
        title={t('account.avatar')}
        description={t('account.avatarHint')}
        layout="stacked"
      >
        <div className="flex w-full flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {AVATAR_OPTIONS.map((emoji) => {
              const selected = profile.avatar === emoji
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectAvatar(emoji)}
                  aria-label={emoji}
                  aria-pressed={selected}
                  className={cn(
                    'flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border text-lg transition-all duration-150',
                    selected
                      ? 'border-accent bg-accent/10'
                      : 'border-border-subtle bg-surface-base hover:border-border-default hover:bg-surface-sunken',
                  )}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs text-text-tertiary">
              {profile.avatar ? t('account.selectedAvatar') : t('account.noAvatar')}
            </span>
            {profile.avatar && (
              <button
                type="button"
                onClick={handleClearAvatar}
                className="cursor-pointer border-none bg-transparent font-sans text-xs text-text-tertiary underline transition-colors hover:text-text-primary"
              >
                {t('account.clear')}
              </button>
            )}
          </div>
        </div>
      </SettingsRow>
    </>
  )
}
