import { useState } from 'react'
import { Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { isTauri } from '@/data/tauriFs'
import { openExternal } from '@/lib/platform'
import { checkForUpdateVerbose, installUpdate, relaunchApp, RELEASES_PAGE, type UpdateCheckResult } from '@/lib/appUpdate'
import { useT } from '@/i18n/useT'
import { LANGUAGE_LOCALE } from '@/i18n/types'

export function SettingsAbout() {
  const language = useAppSettingsStore((s) => s.settings.language)
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

  const handleInstallUpdate = async (update: Extract<UpdateCheckResult, { status: 'available' }>) => {
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
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return __BUILD_TIME__
    }
  })()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">{t('settings.about')}</h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">{t('settings.versionChangelog')}</p>
      </div>

      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-3">
            {t('settings.currentVersion')}
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-medium text-text-primary">v{__APP_VERSION__}</span>
          </div>
          <p className="text-xs text-text-tertiary mt-2 font-mono">{t('settings.built')}{buildTime}</p>

          {isTauri() && (
            <div className="mt-4 flex flex-col items-start gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={runUpdateCheck}
                  disabled={checking || downloading || installing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-sans font-medium text-text-secondary hover:text-text-primary hover:bg-surface-base transition-colors duration-200 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} strokeWidth={1.75} className={checking ? 'animate-spin' : undefined} />
                  {checking ? t('settings.update.checking') : t('settings.update.checkForUpdates')}
                </button>
                <button
                  onClick={() => openExternal(RELEASES_PAGE)}
                  className="inline-flex items-center gap-1.5 text-xs font-sans text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
                >
                  <ExternalLink size={13} strokeWidth={1.75} />
                  {t('settings.update.viewDownloads')}
                </button>
              </div>

              {result?.status === 'latest' && (
                <p role="status" className="text-xs font-sans text-text-tertiary">{t('settings.update.upToDate')}</p>
              )}
              {result?.status === 'error' && (
                <p role="alert" className="max-w-xl text-xs font-sans leading-relaxed text-red-600 dark:text-red-300">{result.message}</p>
              )}
              {installError && (
                <p role="alert" className="max-w-xl text-xs font-sans leading-relaxed text-red-600 dark:text-red-300">{installError}</p>
              )}

              {result?.status === 'available' && (
                <div className="w-full max-w-2xl rounded-lg border border-accent/25 bg-surface-base px-4 py-3">
                  <p className="text-sm font-sans font-medium text-text-primary">
                    {t('settings.update.newVersion')}: <span className="font-mono">v{result.info.version}</span>
                  </p>
                  <p className="mt-1 text-xs font-sans text-text-tertiary">
                    {t('settings.currentVersion')}: <span className="font-mono">v{result.info.currentVersion}</span>
                  </p>
                  <p className="mt-3 text-xs font-sans font-medium text-text-secondary">更新内容</p>
                  <p className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap text-xs font-sans leading-relaxed text-text-tertiary">
                    {result.info.notes}
                  </p>

                  {downloading ? (
                    <div className="mt-3 flex items-center gap-2 text-xs font-sans text-text-secondary">
                      <Download size={13} strokeWidth={1.75} className="animate-pulse" />
                      {t('settings.update.downloading')} {progress}%
                    </div>
                  ) : installing ? (
                    <div className="mt-3 flex items-center gap-2 text-xs font-sans text-text-secondary">
                      <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
                      {t('settings.update.installing')}
                    </div>
                  ) : (
                    <button
                      onClick={() => void handleInstallUpdate(result)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-sans font-medium text-white hover:bg-accent-hover transition-colors cursor-pointer"
                    >
                      <Download size={13} strokeWidth={1.75} />
                      {t('settings.update.updateNow')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-text-tertiary font-sans leading-relaxed">{t('settings.footer')}</p>
      <p className="text-[11px] text-text-tertiary font-sans leading-relaxed">
        <button
          onClick={() => openExternal('https://github.com/vanemacus486-bit/CaILens/blob/main/PRIVACY.md')}
          className="underline hover:text-text-secondary transition-colors cursor-pointer"
        >
          {t('settings.privacyPolicy')}
        </button>
      </p>
    </div>
  )
}
