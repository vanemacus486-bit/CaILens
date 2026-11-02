import { useUIStore } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { fireAndForget } from '@/lib/fireAndForget'
import { useT } from '@/i18n/useT'
import { LANGUAGE_LABELS } from '@/i18n/types'
import type { DefaultView } from '@/domain/settings'
import { SlideSegmented } from '@/components/nav/SlideSegmented'
import { SettingsAccount } from './SettingsAccount'
import { SettingsButton, SettingsHeader, SettingsRow, SettingsSection } from './ui'

/**
 * 「界面」页：账户 + 显示偏好。
 *
 * 结构与 Obsidian 一致：账户一张卡、显示一张卡；语言不在这里再做一份开关，
 * 只给一个入口跳到「关于」（那边是版本与语言的所在地），避免两个页面各写一份状态。
 */
export function SettingsInterface() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const defaultView = useAppSettingsStore((s) => s.settings.defaultView)
  const setDefaultView = useAppSettingsStore((s) => s.setDefaultView)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const t = useT()

  return (
    <div className="flex flex-col gap-7">
      <SettingsHeader
        title={t('settings.tab.interface')}
        description={t('settings.tab.interface.desc')}
      />

      <SettingsSection title={t('account.account')}>
        <SettingsAccount />
      </SettingsSection>

      <SettingsSection title={t('settings.section.display')}>
        <SettingsRow
          anchor="interface-default-view"
          title={t('settings.defaultView')}
          description={t('settings.defaultViewHint')}
        >
          <SlideSegmented<DefaultView>
            items={[
              { id: 'week', label: t('settings.weekView') },
              { id: 'month', label: t('settings.monthView') },
            ]}
            value={defaultView ?? 'week'}
            onChange={(v) => fireAndForget(setDefaultView(v), 'set default view')}
          />
        </SettingsRow>

        <SettingsRow
          anchor="interface-language"
          title={t('settings.language')}
          description={t('settings.languageHint')}
        >
          <SettingsButton onClick={() => setActiveSettingsTab('about')}>
            {LANGUAGE_LABELS[language]}
          </SettingsButton>
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}
