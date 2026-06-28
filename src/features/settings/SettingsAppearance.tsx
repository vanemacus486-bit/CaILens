import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { AppTheme, FontScale, UiFont } from '@/domain/settings'
import type { AppLanguage } from '@/i18n/types'
import { LANGUAGE_LABELS, LANGUAGE_ORDER } from '@/i18n/types'
import { useT } from '@/i18n/useT'
import { SlideSegmented } from '@/components/nav/SlideSegmented'
import { VisualStyleGrid } from './VisualStyleGrid'
import { SettingsSleepReminder } from './SettingsSleepReminder'

function SettingsRow({
  label,
  children,
  last,
}: {
  label: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-4 gap-3',
        !last && 'border-b border-border-subtle',
      )}
    >
      <span className="text-sm font-sans font-medium text-text-primary flex-shrink-0">
        {label}
      </span>
      <div className="overflow-x-auto flex-shrink min-w-0">
        {children}
      </div>
    </div>
  )
}

export function SettingsAppearance() {
  const settings = useAppSettingsStore((s) => s.settings)
  const setTheme = useAppSettingsStore((s) => s.setTheme)
  const setFontScale = useAppSettingsStore((s) => s.setFontScale)
  const setUiFont = useAppSettingsStore((s) => s.setUiFont)
  const setLanguage = useAppSettingsStore((s) => s.setLanguage)

  const t = useT()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          {t('settings.appearance')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          {t('settings.appearanceDesc')}
        </p>
      </div>

      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        {/* 主题 */}
        <SettingsRow label={t('settings.theme')}>
          <SlideSegmented<AppTheme>
            items={[
              { id: 'auto',  label: t('settings.auto')  },
              { id: 'light', label: t('settings.light') },
              { id: 'dark',  label: t('settings.dark')  },
            ]}
            value={settings.theme ?? 'light'}
            onChange={(theme) => fireAndForget(setTheme(theme), 'set theme')}
          />
        </SettingsRow>

        {/* 视觉风格 */}
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-xs font-sans font-medium text-text-secondary mb-3">
            {t('settings.visualStyle')}
          </h2>
          <VisualStyleGrid />
        </div>

        {/* 字号 */}
        <SettingsRow label={t('settings.fontSize')}>
          <SlideSegmented<FontScale>
            items={[
              { id: 'sm',      label: t('settings.small')   },
              { id: 'default', label: t('settings.default') },
              { id: 'lg',      label: t('settings.large')   },
              { id: 'xl',      label: t('settings.xlarge')  },
            ]}
            value={settings.fontScale ?? 'default'}
            onChange={(scale) => fireAndForget(setFontScale(scale), 'set font scale')}
          />
        </SettingsRow>

        {/* 字体 */}
        <SettingsRow label={t('settings.font')}>
          <SlideSegmented<UiFont>
            items={[
              { id: 'default',   label: t('settings.fontDefault') },
              { id: 'sourcehan', label: '思源黑体'               },
              { id: 'wenkai',    label: '霞鹜文楷'               },
            ]}
            value={settings.uiFont ?? 'default'}
            onChange={(font) => fireAndForget(setUiFont(font), 'set font')}
          />
        </SettingsRow>

        {/* 界面语言 */}
        <SettingsRow label={t('settings.language')} last>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 flex-wrap">
            {LANGUAGE_ORDER.map((lang) => (
              <button
                key={lang}
                onClick={() => fireAndForget(setLanguage(lang as AppLanguage), 'set language')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-sans font-medium transition-all duration-200 cursor-pointer border-none whitespace-nowrap',
                  settings.language === lang
                    ? 'bg-surface-raised text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </SettingsRow>
      </div>

      {/* 就寝提醒 */}
      <div className="mt-5">
        <SettingsSleepReminder />
      </div>
    </div>
  )
}
