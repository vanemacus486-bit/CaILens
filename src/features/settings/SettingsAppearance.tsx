import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { AppTheme, FontScale, UiFont } from '@/domain/settings'
import { useT } from '@/i18n/useT'
import { SlideSegmented } from '@/components/nav/SlideSegmented'
import { SettingsHeader, SettingsRow, SettingsSection } from './ui'

/**
 * 「外观」页：主题、排版、布局三组。
 *
 * 每组是一张卡片（`SettingsSection`），组标题在卡片外；行与行之间是细线，
 * 不再是「一行一张卡」。视觉风格只剩石墨一套，不再提供切换控件。
 */
export function SettingsAppearance() {
  const settings = useAppSettingsStore((s) => s.settings)
  const setTheme = useAppSettingsStore((s) => s.setTheme)
  const setFontScale = useAppSettingsStore((s) => s.setFontScale)
  const setUiFont = useAppSettingsStore((s) => s.setUiFont)

  const t = useT()

  return (
    <div className="settings-appearance flex flex-col gap-7">
      <SettingsHeader
        title={t('settings.appearance')}
        description={t('settings.appearanceDesc')}
      />

      {/* 主题 */}
      <SettingsSection title={t('settings.theme')}>
        <SettingsRow
          anchor="appearance-theme"
          title={t('settings.themeMode')}
          description={t('settings.themeModeHint')}
        >
          <SlideSegmented<AppTheme>
            items={[
              { id: 'auto', label: t('settings.auto') },
              { id: 'light', label: t('settings.light') },
              { id: 'dark', label: t('settings.dark') },
            ]}
            value={settings.theme ?? 'light'}
            onChange={(theme) => fireAndForget(setTheme(theme), 'set theme')}
          />
        </SettingsRow>
      </SettingsSection>

      {/* 排版 */}
      <SettingsSection title={t('settings.section.typography')}>
        <SettingsRow
          anchor="appearance-font-size"
          title={t('settings.fontSize')}
          description={t('settings.fontSizeHint')}
        >
          <SlideSegmented<FontScale>
            items={[
              { id: 'sm', label: t('settings.small') },
              { id: 'default', label: t('settings.default') },
              { id: 'lg', label: t('settings.large') },
              { id: 'xl', label: t('settings.xlarge') },
            ]}
            value={settings.fontScale ?? 'default'}
            onChange={(scale) => fireAndForget(setFontScale(scale), 'set font scale')}
          />
        </SettingsRow>

        <SettingsRow
          anchor="appearance-font"
          title={t('settings.font')}
          description={t('settings.fontHint')}
        >
          <SlideSegmented<UiFont>
            items={[
              { id: 'default', label: t('settings.fontDefault') },
              { id: 'sourcehan', label: '思源黑体' },
              { id: 'wenkai', label: '霞鹜文楷' },
            ]}
            value={settings.uiFont ?? 'default'}
            onChange={(font) => fireAndForget(setUiFont(font), 'set font')}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}
