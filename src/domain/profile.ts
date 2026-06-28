/**
 * # 个人档案（Profile）
 *
 * 记录用户的身体指标和作息基线数据。
 * "身体"段数据由用户手动录入，"作息基线"段从睡眠统计派生。
 */

// ── 身体指标 ────────────────────────────────────────

export interface BodyMetrics {
  /** 身高 cm */
  height: number | null
  /** 体重 kg */
  weight: number | null
  /** 体脂率 % */
  bodyFat: number | null
  /** 静息心率 bpm */
  restingHR: number | null
  /** 收缩压 mmHg */
  bloodPressureSystolic: number | null
  /** 舒张压 mmHg */
  bloodPressureDiastolic: number | null
  /** 左眼视力 */
  visionLeft: number | null
  /** 右眼视力 */
  visionRight: number | null
  /** 最近一次验光时间 YYYY-MM */
  visionLastCheck: string | null
}

// ── 个人档案 ─────────────────────────────────────────

export interface Profile {
  id: 'default'
  /** 用户名称（空串时显示兜底文案） */
  name: string
  /** 头像（emoji 字符；空串时用名称首字母或 🐱 兜底） */
  avatar: string
  body: BodyMetrics
  /** 最后更新时间 YYYY-MM-DD */
  updatedAt: string | null
}

// ── 默认值 ──────────────────────────────────────────

export const DEFAULT_BODY_METRICS: BodyMetrics = {
  height: null,
  weight: null,
  bodyFat: null,
  restingHR: null,
  bloodPressureSystolic: null,
  bloodPressureDiastolic: null,
  visionLeft: null,
  visionRight: null,
  visionLastCheck: null,
}

export const DEFAULT_PROFILE: Profile = {
  id: 'default',
  name: '',
  avatar: '',
  body: { ...DEFAULT_BODY_METRICS },
  updatedAt: null,
}
