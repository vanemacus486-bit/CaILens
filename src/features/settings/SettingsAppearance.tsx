import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { ACCENT_PRESETS } from '@/domain/themes'

export function SettingsAppearance() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const setLanguage = useAppSettingsStore((s) => s.setLanguage)
  const setTheme = useAppSettingsStore((s) => s.setTheme)
  const setAccentColor = useAppSettingsStore((s) => s.setAccentColor)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-[22px] font-medium text-text-primary">
        {t('外观', 'Appearance')}
      </h1>

      <div className="flex flex-col gap-5">
        {/* Language */}
        <fieldset className="flex flex-col gap-1.5 border-none p-0">
          <label className="text-xs text-text-tertiary font-sans">
            {t('界面语言', 'Language')}
          </label>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
            {(['zh', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => fireAndForget(setLanguage(lang), 'set language')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                  language === lang
                    ? 'bg-surface-base text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary bg-transparent',
                )}
              >
                {lang === 'zh' ? '中文' : 'English'}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Theme */}
        <fieldset className="flex flex-col gap-1.5 border-none p-0">
          <label className="text-xs text-text-tertiary font-sans">
            {t('主题', 'Theme')}
          </label>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
            {(['light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => fireAndForget(setTheme(theme), 'set theme')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                  settings.theme === theme
                    ? 'bg-surface-base text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary bg-transparent',
                )}
              >
                {theme === 'light' ? t('浅色', 'Light') : t('深色', 'Dark')}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Accent */}
        <fieldset className="flex flex-col gap-1.5 border-none p-0">
          <label className="text-xs text-text-tertiary font-sans">
            {t('主题色', 'Accent')}
          </label>
          <div className="flex gap-2 items-center">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => fireAndForget(setAccentColor(preset.key), 'set accent')}
                className={cn(
                  'w-7 h-7 rounded-full transition-all duration-200 cursor-pointer border-2',
                  settings.accentColor === preset.key
                    ? 'border-text-primary shadow-pill scale-110'
                    : 'border-transparent hover:scale-105',
                )}
                style={{ backgroundColor: preset.hex }}
                title={t(preset.name.zh, preset.name.en)}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  )
}
