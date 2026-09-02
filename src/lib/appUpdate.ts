import { isTauri } from '@/data/tauriFs'

/**
 * 应用更新检查（桌面端）
 * ────────────────────────────────────────────────────────────
 * 简单发布模式：通过 GitHub Releases API 检测版本，
 * 再由界面打开下载页。不会在应用内下载或替换 EXE。
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

// ── GitHub Releases 检测 ─────────────────────────────────────────

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
 * Web / 移动端直接返回 latest。
 */
export async function checkForUpdateVerbose(): Promise<UpdateCheckResult> {
  if (!isTauri()) return { status: 'latest' }

  return checkViaGitHubApi()
}

/** 检查更新（静默）。有新版本返回信息，否则返回 null。用于启动横幅。 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const r = await checkForUpdateVerbose()
  return r.status === 'available' ? r.info : null
}
