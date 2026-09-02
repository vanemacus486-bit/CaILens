import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpCircle, ExternalLink, Loader2, X } from 'lucide-react'
import { checkForUpdate, type UpdateInfo } from '@/lib/appUpdate'
import { openExternal } from '@/lib/platform'
import { useT } from '@/i18n/useT'

const DISMISS_KEY = 'cailens.updateDismissed'

/**
 * 启动时检查新版本（仅桌面端）。有新版本且用户没关过该版本，
 * 在左下角弹一条可关闭的提示。
 *
 * 点击后由系统默认浏览器打开 GitHub Releases 下载页。
 * Web / 移动端不会触发（checkForUpdate 返回 null）。
 */
export function UpdateBanner() {
  const t = useT()
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [opening, setOpening] = useState(false)
  const [openFailed, setOpenFailed] = useState(false)

  useEffect(() => {
    let alive = true
    void checkForUpdate().then((u) => {
      if (!alive || !u) return
      try {
        if (localStorage.getItem(DISMISS_KEY) === u.version) return
      } catch { /* ignore */ }
      setInfo(u)
    })
    return () => { alive = false }
  }, [])

  if (!info) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, info.version) } catch { /* ignore */ }
    setInfo(null)
  }

  const handleUpdate = async () => {
    setOpening(true)
    setOpenFailed(false)
    try {
      if (!await openExternal(info.url)) setOpenFailed(true)
    } finally {
      setOpening(false)
    }
  }

  return createPortal(
    <div
      role="alert"
      className="fixed bottom-4 left-4 z-[200] flex items-center gap-3 bg-surface-raised border border-border-subtle rounded-lg shadow-lg px-4 py-2.5 font-sans text-sm text-text-primary animate-settings-fade-in"
    >
      {opening ? (
        <Loader2 size={16} strokeWidth={1.75} className="text-accent flex-shrink-0 animate-spin" />
      ) : (
        <ArrowUpCircle size={16} strokeWidth={1.75} className="text-accent flex-shrink-0" />
      )}
      <span>
        {openFailed
          ? t('settings.update.browserOpenFailedShort')
          : (
              <>
                {t('settings.update.newVersion')}{' '}
                <span className="font-mono font-medium">v{info.version}</span>
              </>
            )}
      </span>
      {!opening && (
        <button
          onClick={() => void handleUpdate()}
          className="font-medium text-accent hover:text-accent-hover transition-colors duration-200 cursor-pointer"
        >
          <span className="inline-flex items-center gap-1">
            <ExternalLink size={13} strokeWidth={1.75} />
            {t('settings.update.download')}
          </span>
        </button>
      )}
      {(
        <button
          onClick={dismiss}
          aria-label={t('common.close')}
          className="text-text-tertiary hover:text-text-secondary transition-colors duration-200 cursor-pointer"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>,
    document.body,
  )
}
