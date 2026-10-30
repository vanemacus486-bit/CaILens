import { isTauri } from '@tauri-apps/api/core'

/** True when running as a Tauri desktop app. */
export function isTauriDesktop(): boolean {
  return isTauri()
}

/**
 * 在系统浏览器打开外部链接。
 * - Tauri 桌面端通过 opener 插件交给系统默认浏览器
 * - 网页使用 window.open
 */
export async function openExternal(url: string): Promise<boolean> {
  if (isTauriDesktop()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
      return true
    } catch {
      return false
    }
  }

  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    return w != null
  } catch {
    return false
  }
}
