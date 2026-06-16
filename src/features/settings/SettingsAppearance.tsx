import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { AppLanguage, AppTheme, FontScale, UiFont } from '@/domain/settings'
import { SlideSegmented } from '@/components/nav/SlideSegmented'
import { VisualStyleGrid } from './VisualStyleGrid'

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

  const language = settings.language
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          {t('外观', 'Appearance')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          {t('主题、视觉风格、字体与界面语言', 'Theme, visual style, fonts & language')}
        </p>
      </div>

      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        {/* 主题 */}
        <SettingsRow label={t('主题', 'Theme')}>
          <SlideSegmented<AppTheme>
            items={[
              { id: 'auto',  label: t('自动', 'Auto')  },
              { id: 'light', label: t('浅色', 'Light') },
              { id: 'dark',  label: t('深色', 'Dark')  },
            ]}
            value={settings.theme ?? 'light'}
            onChange={(theme) => fireAndForget(setTheme(theme), 'set theme')}
          />
        </SettingsRow>

        {/* 视觉风格 */}
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-xs font-sans font-medium text-text-secondary mb-3">
            {t('视觉风格', 'Visual Style')}
          </h2>
          <VisualStyleGrid />
        </div>

        {/* 字号 */}
        <SettingsRow label={t('字号', 'Font Size')}>
          <SlideSegmented<FontScale>
            items={[
              { id: 'sm',      label: t('小',   'Sm')      },
              { id: 'default', label: t('默认', 'Default') },
              { id: 'lg',      label: t('大',   'Lg')      },
              { id: 'xl',      label: t('特大', 'XL')      },
            ]}
            value={settings.fontScale ?? 'default'}
            onChange={(scale) => fireAndForget(setFontScale(scale), 'set font scale')}
          />
        </SettingsRow>

        {/* 字体 */}
        <SettingsRow label={t('字体', 'Font')}>
          <SlideSegmented<UiFont>
            items={[
              { id: 'default',   label: t('系统默认', 'Default') },
              { id: 'sourcehan', label: '思源黑体'               },
              { id: 'wenkai',    label: '霞鹜文楷'               },
            ]}
            value={settings.uiFont ?? 'default'}
            onChange={(font) => fireAndForget(setUiFont(font), 'set font')}
          />
        </SettingsRow>

        {/* 界面语言 */}
        <SettingsRow label={t('界面语言', 'Language')} last>
          <SlideSegmented<AppLanguage>
            items={[
              { id: 'zh', label: '中文'    },
              { id: 'en', label: 'English' },
            ]}
            value={language}
            onChange={(lang) => fireAndForget(setLanguage(lang), 'set language')}
          />
        </SettingsRow>
      </div>
    </div>
  )
}
