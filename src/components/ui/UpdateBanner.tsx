import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpCircle, Download, Loader2, X } from 'lucide-react'
import { checkForUpdate, type UpdateInfo, relaunchApp } from '@/lib/appUpdate'
import { openExternal } from '@/lib/platform'
import { useAppSettingsStore } from '@/stores/settingsStore'

const DISMISS_KEY = 'cailens.updateDismissed'

/**
 * 启动时检查新版本（仅桌面端）。有新版本且用户没关过该版本，
 * 在左下角弹一条可关闭的提示。
 *
 * Tauri updater 可用时：点击 → 下载+安装（展示进度%）→ 自动重启。
 * 降级 GitHub API 时：点击 → 打开 GitHub Releases 下载页。
 * Web / 移动端不会触发（checkForUpdate 返回 null）。
 */
export function UpdateBanner() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [installing, setInstalling] = useState(false)

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
    // Tauri updater path: download + install + relaunch
    if (info.downloadAndInstall) {
      try {
        setDownloading(true)
        setProgress(0)
        await info.downloadAndInstall((pct) => {
          setProgress(pct)
        })
        setDownloading(false)
        setInstalling(true)
        // Brief delay so user sees "installing" state
        await new Promise((r) => setTimeout(r, 800))
        await relaunchApp()
      } catch {
        setDownloading(false)
        setInstalling(false)
        // Fallback: open download page
        openExternal(info.url)
      }
      return
    }
    // GitHub API fallback: open download page
    openExternal(info.url)
  }

  return createPortal(
    <div
      role="alert"
      className="fixed bottom-4 left-4 z-[200] flex items-center gap-3 bg-surface-raised border border-border-subtle rounded-lg shadow-lg px-4 py-2.5 font-sans text-sm text-text-primary animate-settings-fade-in"
    >
      {installing ? (
        <Loader2 size={16} strokeWidth={1.75} className="text-accent flex-shrink-0 animate-spin" />
      ) : downloading ? (
        <Download size={16} strokeWidth={1.75} className="text-accent flex-shrink-0 animate-pulse" />
      ) : (
        <ArrowUpCircle size={16} strokeWidth={1.75} className="text-accent flex-shrink-0" />
      )}
      <span>
        {installing
          ? t('正在安装，即将重启…', 'Installing, will restart…')
          : downloading
            ? t('下载中', 'Downloading') + ` ${progress}%`
            : (
                <>
                  {t('发现新版本', 'New version')}{' '}
                  <span className="font-mono font-medium">v{info.version}</span>
                </>
              )}
      </span>
      {!downloading && !installing && (
        <button
          onClick={handleUpdate}
          className="font-medium text-accent hover:text-accent-hover transition-colors duration-200 cursor-pointer"
        >
          {info.downloadAndInstall
            ? t('立即更新', 'Update')
            : t('下载', 'Download')}
        </button>
      )}
      {!installing && (
        <button
          onClick={dismiss}
          aria-label={t('关闭', 'Dismiss')}
          className="text-text-tertiary hover:text-text-secondary transition-colors duration-200 cursor-pointer"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>,
    document.body,
  )
}
