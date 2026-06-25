import { isTauri } from '@/data/tauriFs'

/**
 * 应用更新检查（桌面端）
 * ────────────────────────────────────────────────────────────
 * Tauri 端优先使用官方 updater 插件（check → downloadAndInstall → relaunch）。
 * 不可用时降级到 GitHub Releases API（仅提示去下载）。
 * Web / 移动端静默返回 latest。
 */

export const UPDATE_REPO = 'vanemacus486-bit/CaILens'

const RELEASES_API = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`
export const RELEASES_PAGE = `https://github.com/${UPDATE_REPO}/releases/latest`

export interface UpdateInfo {
  /** 最新版本号（不含前缀 v），如 "3.24.0" */
  version: string
  /** 下载页 / Release 页 URL */
  url: string
  /** 仅 Tauri updater 可用：下载+安装，回调进度百分比 (0–100) */
  downloadAndInstall?: (onProgress?: (pct: number) => void) => Promise<void>
}

export type UpdateCheckResult =
  | { status: 'available'; info: UpdateInfo }
  | { status: 'latest' }
  | { status: 'error' }

/** 比较 x.y.z 版本：a 比 b 新返回正数、旧返回负数、相同返回 0。 */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

// ── Tauri 官方 updater 路径 ─────────────────────────────────────

interface TauriUpdaterEvent {
  event: 'Started' | 'Progress' | 'Finished'
  data?: { contentLength?: number; chunkLength?: number }
}

async function checkViaTauriUpdater(): Promise<UpdateCheckResult> {
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) return { status: 'latest' }
    return {
      status: 'available',
      info: {
        version: update.version,
        url: RELEASES_PAGE,
        downloadAndInstall: async (onProgress) => {
          let contentLength = 0
          let downloaded = 0
          await update.downloadAndInstall((ev: TauriUpdaterEvent) => {
            if (ev.event === 'Started') {
              contentLength = ev.data?.contentLength ?? 0
            } else if (ev.event === 'Progress') {
              downloaded += ev.data?.chunkLength ?? 0
              if (contentLength > 0 && onProgress) {
                onProgress(Math.min(Math.round((downloaded / contentLength) * 100), 99))
              }
            } else if (ev.event === 'Finished') {
              if (onProgress) onProgress(100)
            }
          })
        },
      },
    }
  } catch {
    return { status: 'error' }
  }
}

/** 调用 Tauri process 插件重启桌面应用 */
export async function relaunchApp(): Promise<void> {
  try {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  } catch {
    // relaunch not available (web / mobile) — no-op
  }
}

// ── GitHub API 降级路径 ──────────────────────────────────────────

async function checkViaGitHubApi(): Promise<UpdateCheckResult> {
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) return { status: 'error' }
    const data = (await res.json()) as { tag_name?: string; html_url?: string }
    const latest = (data.tag_name ?? '').replace(/^v/, '')
    if (!latest) return { status: 'error' }
    if (compareVersions(latest, __APP_VERSION__) <= 0) return { status: 'latest' }
    return { status: 'available', info: { version: latest, url: data.html_url || RELEASES_PAGE } }
  } catch {
    return { status: 'error' }
  }
}

// ── 公开 API ─────────────────────────────────────────────────────

/**
 * 检查更新（带状态）。
 * Tauri 端优先走官方 updater，不可用时降级到 GitHub API。
 * Web / 移动端直接返回 latest。
 */
export async function checkForUpdateVerbose(): Promise<UpdateCheckResult> {
  if (!isTauri()) return { status: 'latest' }

  // 优先 Tauri updater
  const tauriResult = await checkViaTauriUpdater()
  if (tauriResult.status !== 'error') return tauriResult

  // 降级 GitHub API
  return checkViaGitHubApi()
}

/** 检查更新（静默）。有新版本返回信息，否则返回 null。用于启动横幅。 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const r = await checkForUpdateVerbose()
  return r.status === 'available' ? r.info : null
}
