/**
 * # 个人档案（Profile）
 *
 * 记录用户的个人基本信息。
 */

// ── 个人档案 ─────────────────────────────────────────

export interface Profile {
  id: 'default'
  /** 用户名称（空串时显示兜底文案） */
  name: string
  /** 头像（emoji 字符；空串时用名称首字母或 🐱 兜底） */
  avatar: string
  /** 最后更新时间 YYYY-MM-DD */
  updatedAt: string | null
}

// ── 默认值 ──────────────────────────────────────────

export const DEFAULT_PROFILE: Profile = {
  id: 'default',
  name: '',
  avatar: '',
  updatedAt: null,
}
