/**
 * # 卫生活动配置（Hygiene Activity）
 *
 * 用户自定义"哪些事件计入卫生 + 染成什么颜色"。
 * 每条活动 = 名称 + 匹配关键词 + 调色板颜色 + 图标。
 * 事件通过 typedData.hygiene.activity 引用活动 id；默认活动 id 与历史枚举值一致，向后兼容。
 * 纯数据 + 纯函数，无副作用、无浏览器依赖。
 */

// ── 类型 ────────────────────────────────────────────────────

export interface HygieneActivityDef {
  /** 稳定 id，被事件 typedData.hygiene.activity 引用（改名不改 id） */
  id: string
  /** 显示名称 */
  name: string
  /** 标题匹配关键词（命中即计入该活动） */
  keywords: string[]
  /** 调色板颜色 key（见 HYGIENE_PALETTE） */
  color: string
  /** 图标（emoji） */
  icon: string
}

// ── 调色板 ──────────────────────────────────────────────────

/** 内置调色板：与应用设计系统一致，深浅色自动适配 */
export const HYGIENE_PALETTE: readonly { key: string; varName: string }[] = [
  { key: 'shower',   varName: '--tag-hygiene-shower' },
  { key: 'teeth',    varName: '--tag-hygiene-brush-teeth' },
  { key: 'skincare', varName: '--tag-hygiene-skincare' },
  { key: 'shave',    varName: '--tag-hygiene-shave' },
  { key: 'hair',     varName: '--tag-hygiene-hair-wash' },
  { key: 'nail',     varName: '--tag-hygiene-nail-care' },
  { key: 'accent',   varName: '--event-accent-fill' },
  { key: 'sage',     varName: '--event-sage-fill' },
  { key: 'sky',      varName: '--event-sky-fill' },
  { key: 'rose',     varName: '--event-rose-fill' },
]

/** 调色板 key → CSS 变量引用；未知 key 回退中性色 */
export function hygieneColorVar(colorKey: string): string {
  const found = HYGIENE_PALETTE.find((c) => c.key === colorKey)
  return `var(${found ? found.varName : '--event-sand-fill'})`
}

// ── 默认活动 ────────────────────────────────────────────────

/** 默认卫生活动（id 与历史枚举值一致，保证旧事件仍能解析） */
export const DEFAULT_HYGIENE_ACTIVITIES: readonly HygieneActivityDef[] = [
  { id: 'shower',      name: '洗澡',     icon: '🚿', color: 'shower',   keywords: ['洗澡', 'shower', 'bath'] },
  { id: 'brush_teeth', name: '刷牙',     icon: '🪥', color: 'teeth',    keywords: ['刷牙', 'brush teeth', 'brush'] },
  { id: 'skincare',    name: '护肤',     icon: '🧴', color: 'skincare', keywords: ['护肤', '面膜', 'skincare', 'skin care'] },
  { id: 'shave',       name: '刮胡子',   icon: '🪒', color: 'shave',    keywords: ['刮胡子', '剃须', '刮胡', 'shave'] },
  { id: 'hair_wash',   name: '洗头',     icon: '🧖', color: 'hair',     keywords: ['洗头', '洗发', 'wash hair', 'hair wash', 'shampoo'] },
  { id: 'nail_care',   name: '修剪指甲', icon: '💅', color: 'nail',     keywords: ['修剪指甲', '剪指甲', '指甲', 'nail'] },
]

// ── 纯函数 ──────────────────────────────────────────────────

/** 从事件标题推断卫生活动 id；遍历用户活动列表，命中关键词即返回其 id；无匹配返回 null */
export function inferHygieneActivity(
  title: string,
  activities: readonly HygieneActivityDef[],
): string | null {
  const t = title.trim().toLowerCase()
  if (!t) return null
  for (const a of activities) {
    for (const kw of a.keywords) {
      const k = kw.trim().toLowerCase()
      if (k && t.includes(k)) return a.id
    }
  }
  return null
}

/** 按 id 查活动定义 */
export function findHygieneActivity(
  activities: readonly HygieneActivityDef[],
  id: string,
): HygieneActivityDef | undefined {
  return activities.find((a) => a.id === id)
}
