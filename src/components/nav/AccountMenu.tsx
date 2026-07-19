import { useCallback, useState } from 'react'
import { Check, ChevronDown, ChevronRight, ChevronUp, Globe, Palette, Settings } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useProfileStore } from '@/stores/profileStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { fireAndForget } from '@/lib/fireAndForget'
import { useT } from '@/i18n/useT'
import { LANGUAGE_LABELS, LANGUAGE_ORDER } from '@/i18n/types'
import type { AppLanguage } from '@/i18n/types'
import type { AppTheme } from '@/domain/settings'

type AccountMenuFlyout = 'appearance' | 'language' | null

interface AccountMenuProps {
  variant: 'bar' | 'sidebar'
}

function getAvatarFallback(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '🐱'
}

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
  const [activeFlyout, setActiveFlyout] = useState<AccountMenuFlyout>(null)

  const profile = useProfileStore((s) => s.profile)
  const theme = useAppSettingsStore((s) => s.settings.theme ?? 'light')
  const language = useAppSettingsStore((s) => s.settings.language)
  const setTheme = useAppSettingsStore((s) => s.setTheme)
  const setLanguage = useAppSettingsStore((s) => s.setLanguage)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const setSettingsModalOpen = useUIStore((s) => s.setSettingsModalOpen)

  const t = useT()
  const { name, avatar } = profile

  const themeOptions: Array<{ id: AppTheme; label: string }> = [
    { id: 'auto', label: t('settings.auto') },
    { id: 'light', label: t('settings.light') },
    { id: 'dark', label: t('settings.dark') },
  ]

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setActiveFlyout(null)
  }, [])

  const handleOpenSettings = useCallback(() => {
    setActiveSettingsTab('account')
    setSettingsModalOpen(true)
    setOpen(false)
  }, [setActiveSettingsTab, setSettingsModalOpen])

  const handleSwitchTheme = useCallback(
    (nextTheme: AppTheme) => {
      fireAndForget(setTheme(nextTheme), 'set theme')
    },
    [setTheme],
  )

  const handleSwitchLanguage = useCallback(
    (nextLanguage: AppLanguage) => {
      fireAndForget(setLanguage(nextLanguage), 'set language')
    },
    [setLanguage],
  )

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {variant === 'sidebar' ? (
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
        className="w-[248px] p-1.5 overflow-visible"
      >
        <div className="relative">
          <button
            type="button"
            onClick={handleOpenSettings}
            onMouseEnter={() => setActiveFlyout(null)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
          >
            <Settings size={16} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
            <span>{t('nav.settings')}</span>
            <span className="ml-auto text-xs text-text-tertiary">Ctrl ,</span>
          </button>

          <div
            className="relative"
            onMouseEnter={() => setActiveFlyout('appearance')}
            onFocus={() => setActiveFlyout('appearance')}
          >
            <button
              type="button"
              onClick={() => setActiveFlyout('appearance')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
            >
              <Palette size={16} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
              <span>{t('settings.appearance')}</span>
              <ChevronRight size={14} className="ml-auto text-text-tertiary shrink-0" />
            </button>

            {activeFlyout === 'appearance' && (
              <div className="absolute left-[calc(100%+8px)] top-0 z-[60] w-[168px] rounded-xl border border-border-subtle bg-surface-raised p-1.5 shadow-lg">
                {themeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSwitchTheme(option.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
                  >
                    <span>{option.label}</span>
                    {theme === option.id && (
                      <Check size={15} className="ml-auto text-accent shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className="relative"
            onMouseEnter={() => setActiveFlyout('language')}
            onFocus={() => setActiveFlyout('language')}
          >
            <button
              type="button"
              onClick={() => setActiveFlyout('language')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
            >
              <Globe size={16} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
              <span>{t('settings.language')}</span>
              <ChevronRight size={14} className="ml-auto text-text-tertiary shrink-0" />
            </button>

            {activeFlyout === 'language' && (
              <div className="absolute bottom-0 left-[calc(100%+8px)] z-[60] w-[188px] rounded-xl border border-border-subtle bg-surface-raised p-1.5 shadow-lg">
                {LANGUAGE_ORDER.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleSwitchLanguage(lang)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none bg-transparent"
                  >
                    <span>{LANGUAGE_LABELS[lang]}</span>
                    {language === lang && (
                      <Check size={15} className="ml-auto text-accent shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
