import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { isTauri } from '@/data/tauriFs'
import { openExternal } from '@/lib/platform'
import { RELEASES_PAGE } from '@/lib/appUpdate'
import { useT } from '@/i18n/useT'
import { LANGUAGE_LOCALE } from '@/i18n/types'

export function SettingsAbout() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = useT()
  const [openingRelease, setOpeningRelease] = useState(false)
  const [releaseOpenFailed, setReleaseOpenFailed] = useState(false)
  const [releaseLinkCopied, setReleaseLinkCopied] = useState(false)

  const openLatestRelease = async () => {
    setOpeningRelease(true)
    setReleaseOpenFailed(false)
    try {
      if (!await openExternal(RELEASES_PAGE)) setReleaseOpenFailed(true)
    } finally {
      setOpeningRelease(false)
    }
  }

  const copyReleaseLink = async () => {
    try {
      await navigator.clipboard.writeText(RELEASES_PAGE)
      setReleaseLinkCopied(true)
      setTimeout(() => setReleaseLinkCopied(false), 1800)
    } catch {
      // 链接仍然可见，用户可手动复制
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          {t('settings.about')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          {t('settings.versionChangelog')}
        </p>
      </div>

      {/* Version card */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-3">
            {t('settings.currentVersion')}
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-medium text-text-primary">
              v{__APP_VERSION__}
            </span>
          </div>
          <p className="text-xs text-text-tertiary mt-2 font-mono">
            {t('settings.built')}
            {buildTime}
          </p>

          {isTauri() && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void openLatestRelease()}
                disabled={openingRelease}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-sans font-medium text-text-secondary hover:text-text-primary hover:bg-surface-base disabled:cursor-wait disabled:opacity-70 transition-colors duration-200 cursor-pointer"
              >
                {openingRelease
                  ? <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
                  : <ExternalLink size={13} strokeWidth={1.75} />}
                {openingRelease ? t('settings.update.openingBrowser') : t('settings.update.viewDownloads')}
              </button>
              {releaseOpenFailed ? (
                <div role="status" className="flex flex-wrap items-center gap-2 text-xs font-sans text-text-secondary">
                  <span>{t('settings.update.browserOpenFailed')}</span>
                  <code className="max-w-full break-all rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px]">
                    {RELEASES_PAGE}
                  </code>
                  <button
                    onClick={() => void copyReleaseLink()}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-accent hover:bg-surface-base cursor-pointer"
                  >
                    {releaseLinkCopied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.75} />}
                    {releaseLinkCopied ? t('settings.update.copied') : t('settings.update.copyReleaseLink')}
                  </button>
                </div>
              ) : (
                <span className="text-xs font-sans text-text-tertiary">{t('settings.update.downloadHint')}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-text-tertiary font-sans leading-relaxed">
        {t('settings.footer')}
      </p>

      {/* Privacy policy link */}
      <p className="text-[11px] text-text-tertiary font-sans leading-relaxed">
        <button
          onClick={() => void openExternal('https://github.com/vanemacus486-bit/CaILens/blob/main/PRIVACY.md')}
          className="underline hover:text-text-secondary transition-colors cursor-pointer"
        >
          {t('settings.privacyPolicy')}
        </button>
      </p>
    </div>
  )
}
