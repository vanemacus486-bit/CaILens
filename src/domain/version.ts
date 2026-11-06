/**
 * # 版本历史
 *
 * 设置页「版本」面板的唯一事实源。`package.json` 的 `version` 是**当前**版本，
 * 这里记录**所有**发布过的版本与更新内容——两者职责不同，不要合并。
 *
 * 约定：
 * - 新版本发布时在 `VERSION_HISTORY` **头部**插入一条，`version` 与 `package.json` 一致。
 * - `releasedAt` 用 `YYYY-MM-DD`（本地发布日，不做时区换算）。
 * - `sections` 的 `kind` 决定小标题，顺序即渲染顺序。
 * - issue 号直接写在文案末尾，不单独建字段。
 * - 比 `ARCHIVED_BEFORE` 更早的版本只记数量，正文留在 `CHANGELOG.md`。
 */

export type VersionSectionKind = 'new' | 'fix' | 'improve' | 'remove'

export interface VersionSection {
  kind: VersionSectionKind
  items: readonly string[]
}

export interface VersionNote {
  /** 语义化版本，不带 `v` 前缀。 */
  version: string
  /** 发布日，`YYYY-MM-DD`。 */
  releasedAt: string
  /** 一句话概述，展开后显示在版本号下方。 */
  summary: string
  sections: readonly VersionSection[]
}

/** GitHub 仓库 `owner/name`，回退链接与更新清单都指向这里。 */
export const REPO = 'vanemacus486-bit/CaILens'

/**
 * 全部发布记录，**最新在最前**。
 *
 * v4.0.0 是新的计数起点：设置页重做为「版本」面板，插件架构收敛，
 * 视觉只剩石墨一套。3.24.x 保留在这里，因为它们是真实存在、可回退的安装包。
 */
export const VERSION_HISTORY: readonly VersionNote[] = [
  {
    version: '4.0.0',
    releasedAt: '2026-11-02',
    summary:
      '新的版本起点：设置页拆出可回退的版本面板，界面收敛到石墨一套，桌面端为唯一目标平台。',
    sections: [
      {
        kind: 'new',
        items: [
          '设置页新增「版本」面板：列出全部已发布版本、展开查看更新内容、可回退并固定在所选版本。',
          '回退后会固定在所选版本，不再提示新版本；随时可在同一面板解除固定。',
        ],
      },
      {
        kind: 'improve',
        items: [
          '设置页统一为分组卡片：组标题在卡片外、行间细线分隔，不再每行一张卡片。',
          '视觉风格只保留石墨一套，旧的 nocturne / carbon / tide / indigo 读取时静默回退。',
          '版本、更新与语言从「关于」页独立出来，关于页只留说明与帮助入口。',
        ],
      },
      {
        kind: 'remove',
        items: ['移除移动端布局与 Capacitor 壳，桌面端为唯一目标平台。'],
      },
    ],
  },
  {
    version: '3.24.6',
    releasedAt: '2026-09-03',
    summary: '发布流程搬到 GitHub Actions，不再依赖本机 Git 环境。',
    sections: [
      {
        kind: 'improve',
        items: [
          '发布改为在 GitHub 网页 Actions 中一键执行。',
          '云端自动创建版本标签、Release、签名安装包与更新清单。',
        ],
      },
    ],
  },
  {
    version: '3.24.5',
    releasedAt: '2026-09-03',
    summary: 'Windows 桌面版支持应用内自动更新。',
    sections: [
      {
        kind: 'new',
        items: ['发现新版本后可直接下载、校验、安装并自动重启。'],
      },
      {
        kind: 'fix',
        items: ['统一显示版本、安装包版本与更新器版本的来源，避免更新后版本号不一致。'],
      },
    ],
  },
  {
    version: '3.24.3',
    releasedAt: '2026-09-02',
    summary: '修复构建失败，恢复完整多语言翻译文件。',
    sections: [
      { kind: 'fix', items: ['修复 3.24.2 构建失败的问题。', '保留「查看最新版」下载入口。'] },
    ],
  },
  {
    version: '3.24.0',
    releasedAt: '2026-09-02',
    summary: '桌面端视觉语言打磨：颜色、边框与层级更沉静。',
    sections: [
      {
        kind: 'improve',
        items: [
          '各主要区域补充语义化类名与数据属性，便于主题扩展。',
          '优化桌面端整体色彩层次与边框质感。',
        ],
      },
    ],
  },
]

/**
 * 未逐条登记、只在 CHANGELOG 里留档的更早版本数量。
 *
 * 面板底部据此显示「显示更早的 N 个版本」，点进去是 CHANGELOG 而不是空列表。
 */
export const ARCHIVED_BEFORE = '3.24.0'
export const ARCHIVED_COUNT = 16

/** 当前版本在历史里的下标；未登记返回 -1。 */
export function findVersionIndex(
  history: readonly VersionNote[],
  version: string,
): number {
  return history.findIndex((note) => note.version === version)
}

/**
 * 发布日到 `now` 的自然日差：0 = 今天，1 = 昨天。
 *
 * 只比日期不比时刻——「今天」不该因为发布时刻早了 3 小时就变成「昨天」。
 */
export function daysSinceRelease(releasedAt: string, now: number): number {
  const released = new Date(`${releasedAt}T00:00:00`)
  if (Number.isNaN(released.getTime())) return 0
  const today = new Date(now)
  const releasedDay = Date.UTC(released.getFullYear(), released.getMonth(), released.getDate())
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(0, Math.round((todayDay - releasedDay) / 86_400_000))
}

/** 相对时间标签：今天 / 昨天 / N 天前。 */
export function releaseAgeLabel(releasedAt: string, now: number): string {
  const days = daysSinceRelease(releasedAt, now)
  if (days === 0) return '\u4eca\u5929'
  if (days === 1) return '\u6628\u5929'
  return `${days} \u5929\u524d`
}

/** 某个版本在 GitHub Releases 上的页面（回退时把用户送到对应 tag）。 */
export function versionReleaseUrl(version: string): string {
  return `https://github.com/${REPO}/releases/tag/v${version}`
}
