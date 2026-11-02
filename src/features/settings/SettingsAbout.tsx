import { useState } from 'react'
import { Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { isTauri } from '@/data/tauriFs'
import { openExternal } from '@/lib/platform'
import { fireAndForget } from '@/lib/fireAndForget'
import {
  checkForUpdateVerbose,
  installUpdate,
  relaunchApp,
  RELEASES_PAGE,
  type UpdateCheckResult,
} from '@/lib/appUpdate'
import { useT } from '@/i18n/useT'
import { LANGUAGE_LABELS, LANGUAGE_LOCALE, LANGUAGE_ORDER } from '@/i18n/types'
import {
  SettingsButton,
  SettingsHeader,
  SettingsNotice,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsToggle,
} from './ui'

/**
 * 「关于」页。
 *
 * 结构照 Obsidian：一张卡片讲应用与更新，一张讲语言，一张放帮助入口；
 * 每行左侧标题 + 说明、右侧控件。更新结果不再另起一张卡，而是挂在版本行下方
 * （`SettingsRow` 的 footer），因为你点「检查更新」时视线就在那一行。
 */
export function SettingsAbout() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const autoUpdateCheck = useAppSettingsStore((s) => s.settings.autoUpdateCheck)
  const setAutoUpdateCheck = useAppSettingsStore((s) => s.setAutoUpdateCheck)
  const setLanguage = useAppSettingsStore((s) => s.setLanguage)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const t = useT()

  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<UpdateCheckResult | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  const runUpdateCheck = async () => {
    setChecking(true)
    setResult(null)
    setInstallError(null)
    try {
      setResult(await checkForUpdateVerbose())
    } finally {
      setChecking(false)
    }
  }

  const handleInstallUpdate = async (
    update: Extract<UpdateCheckResult, { status: 'available' }>,
  ) => {
    setDownloading(true)
    setProgress(0)
    setInstallError(null)
    try {
      await installUpdate(update.info, setProgress)
      setDownloading(false)
      setInstalling(true)
      // The updater has verified and staged the NSIS package. Restart hands
      // control to it and replaces the running installation.
      await relaunchApp()
    } catch (error) {
      setDownloading(false)
      setInstalling(false)
      setInstallError(error instanceof Error ? error.message : String(error))
    }
  }

  const buildTime = (() => {
    try {
      const d = new Date(__BUILD_TIME__)
      const locale = LANGUAGE_LOCALE[language] ?? 'zh-CN'
      return d.toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return __BUILD_TIME__
    }
  })()

  const languageItems = LANGUAGE_ORDER.map((lang) => ({
    id: lang,
    label: LANGUAGE_LABELS[lang],
  }))

  const hasUpdateDetail =
    !isTauri() || result !== null || installError !== null

  return (
    <div className="flex flex-col gap-7">
      <SettingsHeader title={t('settings.about')} description={t('settings.aboutDesc')} />

      {/* ── 应用与更新 ── */}
      <SettingsSection title={t('settings.section.application')}>
        <SettingsRow
          anchor="about-version"
          title={
            <span className="flex flex-wrap items-baseline gap-2">
              <span>{t('settings.currentVersion')}</span>
              <span className="font-mono text-base font-medium text-text-primary">
                v{__APP_VERSION__}
              </span>
            </span>
          }
          description={`${t('settings.built')}${buildTime}`}
          footer={
            hasUpdateDetail ? (
              <div className="flex flex-col gap-2">
                {!isTauri() && (
                  <p className="font-sans text-xs text-text-tertiary">
                    {t('settings.update.desktopOnly')}
                  </p>
                )}

                {result?.status === 'latest' && (
                  <p role="status" className="font-sans text-xs text-text-tertiary">
                    {t('settings.update.upToDate')}
                  </p>
                )}

                {result?.status === 'error' && (
                  <SettingsNotice tone="danger">{result.message}</SettingsNotice>
                )}

                {installError && (
                  <SettingsNotice tone="danger">{installError}</SettingsNotice>
                )}

                {result?.status === 'available' && (
                  <div className="rounded-lg border border-accent/25 bg-surface-base px-4 py-3">
                    <p className="font-sans text-sm font-medium text-text-primary">
                      {t('settings.update.newVersion')}:{' '}
                      <span className="font-mono">v{result.info.version}</span>
                    </p>
                    <p className="mt-1 font-sans text-xs text-text-tertiary">
                      {t('settings.currentVersion')}:{' '}
                      <span className="font-mono">v{result.info.currentVersion}</span>
                    </p>
                    <p className="mt-3 font-sans text-xs font-medium text-text-secondary">
                      {t('settings.update.notes')}
                    </p>
                    <p className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-text-tertiary">
                      {result.info.notes}
                    </p>

                    {downloading ? (
                      <div className="mt-3 flex items-center gap-2 font-sans text-xs text-text-secondary">
                        <Download size={13} strokeWidth={1.75} className="animate-pulse" />
                        {t('settings.update.downloading')} {progress}%
                      </div>
                    ) : installing ? (
                      <div className="mt-3 flex items-center gap-2 font-sans text-xs text-text-secondary">
                        <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
                        {t('settings.update.installing')}
                      </div>
                    ) : (
                      <SettingsButton
                        variant="primary"
                        className="mt-3"
                        onClick={() => void handleInstallUpdate(result)}
                      >
                        <Download size={13} strokeWidth={1.75} />
                        {t('settings.update.updateNow')}
                      </SettingsButton>
                    )}
                  </div>
                )}
              </div>
            ) : null
          }
        >
          <SettingsButton
            onClick={runUpdateCheck}
            disabled={checking || downloading || installing}
          >
            <RefreshCw
              size={13}
              strokeWidth={1.75}
              className={checking ? 'animate-spin' : undefined}
            />
            {checking ? t('settings.update.checking') : t('settings.update.checkForUpdates')}
          </SettingsButton>
        </SettingsRow>
      </SettingsSection>

      {/* ── 更新 ── */}
      <SettingsSection title={t('settings.section.updates')}>
        <SettingsRow
          anchor="about-auto-update"
          title={t('settings.autoUpdate')}
          description={t('settings.autoUpdateHint')}
        >
          <SettingsToggle
            checked={autoUpdateCheck !== false}
            onChange={(v) => fireAndForget(setAutoUpdateCheck(v), 'set auto update')}
            label={t('settings.autoUpdate')}
          />
        </SettingsRow>
      </SettingsSection>

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
