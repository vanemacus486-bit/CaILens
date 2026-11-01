import { useState } from 'react'
import { Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { isTauri } from '@/data/tauriFs'
import { openExternal } from '@/lib/platform'
import { fireAndForget } from '@/lib/fireAndForget'
import { checkForUpdateVerbose, installUpdate, relaunchApp, RELEASES_PAGE, type UpdateCheckResult } from '@/lib/appUpdate'
import { useT } from '@/i18n/useT'
import { LANGUAGE_LABELS, LANGUAGE_LOCALE, LANGUAGE_ORDER } from '@/i18n/types'
import type { AppLanguage } from '@/i18n/types'
import { cn } from '@/lib/utils'

/** 一行「标题 + 右侧控件」，与外观页保持同一节奏 */
function AboutRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-sans font-medium text-text-primary">{label}</p>
        {hint && <p className="mt-1 text-xs font-sans leading-relaxed text-text-tertiary">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

/** 开关：与插件开关同一套视觉语言 */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative mt-1 h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        checked ? 'bg-accent' : 'bg-surface-sunken',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200',
          checked ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

export function SettingsAbout() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const autoUpdateCheck = useAppSettingsStore((s) => s.settings.autoUpdateCheck)
  const setAutoUpdateCheck = useAppSettingsStore((s) => s.setAutoUpdateCheck)
  const setLanguage = useAppSettingsStore((s) => s.setLanguage)
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
        <p className="text-sm text-text-tertiary mt-1 font-sans">{t('settings.aboutDesc')}</p>
      </div>

      {/* ── 版本 ── */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-3">
            {t('settings.currentVersion')}
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-medium text-text-primary">v{__APP_VERSION__}</span>
          </div>
          <p className="text-xs text-text-tertiary mt-2 font-mono">{t('settings.built')}{buildTime}</p>

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

            {!isTauri() && (
              <p className="text-xs font-sans text-text-tertiary">{t('settings.update.desktopOnly')}</p>
            )}
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
                <p className="mt-3 text-xs font-sans font-medium text-text-secondary">{t('settings.update.notes')}</p>
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
        </div>
      </div>

      {/* ── 自动更新 + 语言 ── */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="border-b border-border-subtle">
          <AboutRow label={t('settings.autoUpdate')} hint={t('settings.autoUpdateHint')}>
            <Toggle
              checked={autoUpdateCheck !== false}
              onChange={(v) => fireAndForget(setAutoUpdateCheck(v), 'set auto update')}
              label={t('settings.autoUpdate')}
            />
          </AboutRow>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm font-sans font-medium text-text-primary">{t('settings.language')}</p>
          <div className="mt-3 flex flex-wrap gap-0.5 rounded-lg bg-surface-sunken p-0.5">
            {LANGUAGE_ORDER.map((lang) => (
              <button
                key={lang}
                onClick={() => fireAndForget(setLanguage(lang as AppLanguage), 'set language')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-sans font-medium transition-all duration-200 cursor-pointer border-none whitespace-nowrap',
                  language === lang
                    ? 'bg-surface-raised text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-text-tertiary font-sans leading-relaxed">{t('settings.footer')}</p>
      <p className="text-xs text-text-tertiary font-sans leading-relaxed">
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
