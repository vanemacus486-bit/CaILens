import { ExternalLink, Sparkles } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { openExternal } from '@/lib/platform'
import { fireAndForget } from '@/lib/fireAndForget'
import { RELEASES_PAGE } from '@/lib/appUpdate'
import { useT } from '@/i18n/useT'
import { LANGUAGE_LABELS, LANGUAGE_ORDER } from '@/i18n/types'
import {
  SettingsButton,
  SettingsHeader,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
} from './ui'

/**
 * 「关于」页。
 *
 * 版本号、检查更新、自动更新、版本回退**不在这里**——它们在「版本」页。
 * 这一页只回答「这是哪个应用、界面用什么语言、出问题找谁」，
 * 所以它短：语言一组、帮助一组。
 */
export function SettingsAbout() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const setLanguage = useAppSettingsStore((s) => s.setLanguage)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const t = useT()

  const languageItems = LANGUAGE_ORDER.map((lang) => ({
    id: lang,
    label: LANGUAGE_LABELS[lang],
  }))

  return (
    <div className="flex flex-col gap-7">
      <SettingsHeader title={t('settings.about')} description={t('settings.aboutDesc')} />

      {/* ── 语言 ── */}
      <SettingsSection title={t('settings.language')}>
        <SettingsRow
          anchor="about-language"
          title={t('settings.interfaceLanguage')}
          description={t('settings.languageHint')}
        >
          <SettingsSelect
            value={language}
            onChange={(next) => fireAndForget(setLanguage(next), 'set language')}
            items={languageItems}
            label={t('settings.language')}
          />
        </SettingsRow>
      </SettingsSection>

      {/* ── 帮助 ── */}
      <SettingsSection title={t('settings.section.help')} description={t('settings.helpHint')}>
        <SettingsRow
          anchor="about-versions"
          title={t('settings.versions')}
          description={t('settings.versionsDesc')}
        >
          <SettingsButton onClick={() => setActiveSettingsTab('versions')}>
            <Sparkles size={13} strokeWidth={1.75} />
            {t('settings.versions')}
          </SettingsButton>
        </SettingsRow>

        <SettingsRow
          anchor="about-help"
          title={t('settings.versionChangelog')}
          description={t('settings.help.changelogHint')}
        >
          <SettingsButton onClick={() => void openExternal(RELEASES_PAGE)}>
            <ExternalLink size={13} strokeWidth={1.75} />
            {t('settings.update.viewDownloads')}
          </SettingsButton>
        </SettingsRow>

        <SettingsRow
          anchor="about-privacy"
          title={t('settings.privacyPolicy')}
          description={t('settings.help.privacyHint')}
        >
          <SettingsButton
            onClick={() =>
              void openExternal(
                'https://github.com/vanemacus486-bit/CaILens/blob/main/PRIVACY.md',
              )
            }
          >
            <ExternalLink size={13} strokeWidth={1.75} />
            {t('support.open')}
          </SettingsButton>
        </SettingsRow>

        <SettingsRow
          anchor="about-support"
          title={t('support.title')}
          description={t('support.description')}
        >
          <SettingsButton onClick={() => setActiveSettingsTab('support')}>
            {t('support.open')}
          </SettingsButton>
        </SettingsRow>
      </SettingsSection>

      <p className="font-sans text-xs leading-relaxed text-text-tertiary">
        {t('settings.footer')}
      </p>
    </div>
  )
}
