import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpCircle, Download, Loader2, X } from 'lucide-react'
import { checkForUpdate, installUpdate, relaunchApp, type UpdateCheckResult } from '@/lib/appUpdate'
import { useT } from '@/i18n/useT'

const DISMISS_KEY = 'cailens.updateDismissed'

/** Startup update UI for desktop builds. It never uses an unsigned download fallback. */
export function UpdateBanner() {
  const t = useT()
  const [result, setResult] = useState<UpdateCheckResult | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void checkForUpdate().then((next) => {
      if (!alive || next.status === 'latest') return
      if (next.status === 'available') {
        try {
          if (localStorage.getItem(DISMISS_KEY) === next.info.version) return
        } catch { /* Storage is optional. */ }
      }
      setResult(next)
    })
    return () => { alive = false }
  }, [])

  if (!result) return null

  const dismiss = () => {
    if (result.status === 'available') {
      try { localStorage.setItem(DISMISS_KEY, result.info.version) } catch { /* ignore */ }
    }
    setResult(null)
  }

  const handleUpdate = async () => {
    if (result.status !== 'available') return
    setDownloading(true)
    setProgress(0)
    setInstallError(null)
    try {
      await installUpdate(result.info, setProgress)
      setDownloading(false)
      setInstalling(true)
      await relaunchApp()
    } catch (error) {
      setDownloading(false)
      setInstalling(false)
      setInstallError(error instanceof Error ? error.message : String(error))
    }
  }

  const error = result.status === 'error' ? result.message : installError
  const info = result.status === 'available' ? result.info : null

  return createPortal(
    <div
      role={error ? 'alert' : 'status'}
      className="fixed bottom-4 left-4 z-[200] w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 shadow-lg font-sans text-sm text-text-primary animate-settings-fade-in"
    >
      <div className="flex items-start gap-3">
        {installing ? <Loader2 size={18} className="mt-0.5 shrink-0 text-accent animate-spin" />
          : downloading ? <Download size={18} className="mt-0.5 shrink-0 text-accent animate-pulse" />
            : <ArrowUpCircle size={18} className="mt-0.5 shrink-0 text-accent" />}
        <div className="min-w-0 flex-1">
          {error ? (
            <p className="text-xs leading-relaxed text-red-600 dark:text-red-300">{error}</p>
          ) : installing ? (
            <p>{t('settings.update.installing')}</p>
          ) : downloading ? (
            <p>{t('settings.update.downloading')} {progress}%</p>
          ) : info ? (
            <>
              <p className="font-medium">{t('settings.update.newVersion')} v{info.version}</p>
              <p className="mt-0.5 text-xs text-text-tertiary">v{info.currentVersion} → v{info.version}</p>
              <p className="mt-2 max-h-20 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-text-tertiary">{info.notes}</p>
              <button onClick={() => void handleUpdate()} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors cursor-pointer">
                <Download size={13} />{t('settings.update.updateNow')}
              </button>
            </>
          ) : null}
        </div>
        {!installing && (
          <button onClick={dismiss} aria-label={t('common.close')} className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer">
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
