import { isTauri } from '@/data/tauriFs'

/** The only public release channel used by desktop clients. */
export const RELEASES_PAGE = 'https://github.com/vanemacus486-bit/CaILens/releases/latest'

export interface UpdateInfo {
  /** Version embedded in the installed application. */
  currentVersion: string
  /** Version declared by the signed updater manifest. */
  version: string
  /** GitHub Release body, supplied by Tauri's latest.json. */
  notes: string
  /** Downloads, verifies the signature, then stages the installer. */
  downloadAndInstall: (onProgress?: (pct: number) => void) => Promise<void>
}

export type UpdateCheckResult =
  | { status: 'available'; info: UpdateInfo }
  | { status: 'latest' }
  | { status: 'error'; message: string }

interface TauriUpdaterEvent {
  event: 'Started' | 'Progress' | 'Finished'
  data?: { contentLength?: number; chunkLength?: number }
}

/** Converts opaque updater errors into actionable feedback for the user. */
function describeUpdateError(error: unknown, action: 'check' | 'install'): string {
  const detail = error instanceof Error ? error.message : String(error)
  const lower = detail.toLowerCase()
  let reason: string

  if (/not found|404/.test(lower)) {
    reason = '该版本的更新文件不完整（缺少安装包、签名或更新清单）。'
  } else if (/timeout|timed out/.test(lower)) {
    reason = '连接更新服务器超时，请检查网络后重试。'
  } else if (/network|dns|connect|fetch|http|status code/.test(lower)) {
    reason = '无法连接 GitHub 更新服务器。请检查网络、代理或防火墙设置后重试。'
  } else if (/signature|signatur|verify|verification|pubkey/.test(lower)) {
    reason = '下载包的安全校验未通过，已停止安装。请稍后重试。'
  } else {
    reason = action === 'check'
      ? '检查更新时发生错误。'
      : '下载或安装更新时发生错误，当前版本没有被修改。'
  }

  return `${reason} 详细信息：${detail || '未知错误'}`
}

/**
 * Checks only the signed Tauri channel. A GitHub API fallback is deliberately
 * excluded: it can advertise a release that has no verified installer.
 */
export async function checkForUpdateVerbose(): Promise<UpdateCheckResult> {
  if (!isTauri()) return { status: 'latest' }

  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check({ timeout: 15_000 })
    if (!update) return { status: 'latest' }

    return {
      status: 'available',
      info: {
        currentVersion: update.currentVersion,
        version: update.version,
        notes: update.body?.trim() || '此版本包含改进和问题修复。',
        downloadAndInstall: async (onProgress) => {
          let contentLength = 0
          let downloaded = 0
          await update.downloadAndInstall((event: TauriUpdaterEvent) => {
            if (event.event === 'Started') {
              contentLength = event.data?.contentLength ?? 0
              onProgress?.(0)
            } else if (event.event === 'Progress') {
              downloaded += event.data?.chunkLength ?? 0
              if (contentLength > 0) {
                onProgress?.(Math.min(Math.round((downloaded / contentLength) * 100), 99))
              }
            } else {
              onProgress?.(100)
            }
          }, { timeout: 10 * 60_000 })
        },
      },
    }
  } catch (error) {
    return { status: 'error', message: describeUpdateError(error, 'check') }
  }
}

/** Download, verify and stage the already-checked update, preserving its error. */
export async function installUpdate(info: UpdateInfo, onProgress?: (pct: number) => void): Promise<void> {
  try {
    await info.downloadAndInstall(onProgress)
  } catch (error) {
    throw new Error(describeUpdateError(error, 'install'), { cause: error })
  }
}

/** Relaunch is separate because the installer must finish staging first. */
export async function relaunchApp(): Promise<void> {
  try {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  } catch (error) {
    throw new Error(describeUpdateError(error, 'install'), { cause: error })
  }
}

/** Startup helper: failures are returned to the UI instead of being swallowed. */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  return checkForUpdateVerbose()
}
