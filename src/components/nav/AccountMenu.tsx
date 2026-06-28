/**
 * # AccountMenu — 账户下拉菜单
 *
 * 参考 Claude 侧栏底部账户区设计。
 * 用现有 Popover 实现，不引入新依赖。
 * variant='sidebar'：头像+名称+箭头（侧栏底部整行）
 * variant='bar'：仅头像按钮（顶栏）
 */

import { useState, useCallback } from 'react'
import { Settings, Globe, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useProfileStore } from '@/stores/profileStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { fireAndForget } from '@/lib/fireAndForget'
import { useT } from '@/i18n/useT'
import { LANGUAGE_LABELS, LANGUAGE_ORDER } from '@/i18n/types'
import type { AppLanguage } from '@/i18n/types'

type AccountMenuView = 'main' | 'language'

interface AccountMenuProps {
  variant: 'bar' | 'sidebar'
}

/** 头像首字母兜底：名称首字或 🐱 */
function getAvatarFallback(name: string): string {
  if (!name) return '🐱'
  const trimmed = name.trim()
  if (!trimmed) return '🐱'
  return trimmed.charAt(0).toUpperCase()
}

/** 渲染头像方块 */
function AvatarBlock({
  avatar,
  name,
  size,
}: {
  avatar: string
  name: string
  size: number
}) {
  const content = avatar || getAvatarFallback(name)
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg bg-surface-sunken text-text-primary select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      {content}
    </span>
  )
}

export function AccountMenu({ variant }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<AccountMenuView>('main')

  const profile = useProfileStore((s) => s.profile)
  const language = useAppSettingsStore((s) => s.settings.language)
  const setLanguage = useAppSettingsStore((s) => s.setLanguage)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const setSettingsModalOpen = useUIStore((s) => s.setSettingsModalOpen)

  const t = useT()
  const { name, avatar } = profile

  // 关闭 popover 时重置 view
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) setView('main')
    },
    [],
  )

  const handleOpenSettings = useCallback(() => {
    setActiveSettingsTab('account')
    setSettingsModalOpen(true)
    setOpen(false)
  }, [setActiveSettingsTab, setSettingsModalOpen])

  const handleSwitchLanguage = useCallback(
    (lang: AppLanguage) => {
      fireAndForget(setLanguage(lang), 'set language')
      setView('main')
    },
    [setLanguage],
  )

  const currentLangLabel = LANGUAGE_LABELS[language]

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {variant === 'sidebar' ? (
          /* ── 侧栏版：头像 + 名字 + 箭头 ── */
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-2 h-9 rounded-lg text-sm font-sans text-text-primary hover:bg-surface-base transition-colors duration-150 cursor-pointer border-none bg-transparent"
          >
            <AvatarBlock avatar={avatar} name={name} size={26} />
            <span className="flex-1 truncate text-sm font-medium text-text-primary text-left">
              {name || t('account.localProfile')}
            </span>
            {open ? (
              <ChevronUp size={12} className="text-text-tertiary shrink-0" />
            ) : (
              <ChevronDown size={12} className="text-text-tertiary shrink-0" />
            )}
          </button>
        ) : (
          /* ── 顶栏版：仅头像按钮 ── */
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
            aria-label={t('account.account')}
          >
            <AvatarBlock avatar={avatar} name={name} size={28} />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        side={variant === 'sidebar' ? 'top' : 'bottom'}
        align={variant === 'sidebar' ? 'start' : 'end'}
        className="w-[248px] p-1.5"
      >
        {view === 'main' ? (
          /* ── 主面板 ── */
          <div>
            {/* 设置 */}
            <button
              type="button"
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
            >
              <Settings size={16} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
              <span>{t('nav.settings')}</span>
              <span className="ml-auto text-xs text-text-tertiary">Ctrl ,</span>
            </button>

            {/* 语言 */}
            <button
              type="button"
              onClick={() => setView('language')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
            >
              <Globe size={16} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
              <span>{t('settings.language')}</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-text-tertiary">
                {currentLangLabel}
                <ChevronRight size={14} className="shrink-0" />
              </span>
            </button>
          </div>
        ) : (
          /* ── 语言子面板 ── */
          <div>
            {/* 顶部返回 */}
            <button
              type="button"
              onClick={() => setView('main')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
            >
              <ChevronLeft size={16} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
              <span className="font-medium">{t('settings.language')}</span>
            </button>

            {/* 分隔线 */}
            <div className="h-px bg-border-subtle my-1" />

            {LANGUAGE_ORDER.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => handleSwitchLanguage(lang)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
              >
                <span>{LANGUAGE_LABELS[lang]}</span>
                {language === lang && (
                  <Check size={16} className="ml-auto text-accent shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
