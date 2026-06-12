/** 原型 mock 数据 — 无后端，全部本地常量。类型独立于 src/domain。 */

export type Cat = 'accent' | 'sage' | 'sand' | 'sky' | 'rose' | 'stone'
export type Pri = 'high' | 'medium' | 'low'

export const CAT_LABEL: Record<Cat, string> = {
  accent: '工作', sage: '健康', sand: '学习', sky: '社交', rose: '生活', stone: '杂项',
}

export interface MockEvent {
  id: string
  title: string
  day: number   // 0 = 周一 … 6 = 周日
  start: number // 距 00:00 的分钟数
  end: number
  cat: Cat
  location?: string
  note?: string
}

/** start/end 用分钟，便于布局。一周的典型作息。 */
export const EVENTS: MockEvent[] = [
  // 周一
  { id: 'e1', title: '睡眠', day: 0, start: 0, end: 7 * 60, cat: 'sage', note: '入睡 23:40，醒 07:00' },
  { id: 'e2', title: '早餐 · 燕麦+鸡蛋', day: 0, start: 7 * 60 + 30, end: 8 * 60, cat: 'rose', location: '家' },
  { id: 'e3', title: '深度工作 · 重构', day: 0, start: 9 * 60, end: 12 * 60, cat: 'accent', location: '工作室' },
  { id: 'e4', title: '午餐', day: 0, start: 12 * 60 + 30, end: 13 * 60 + 10, cat: 'rose' },
  { id: 'e5', title: '需求评审', day: 0, start: 14 * 60, end: 15 * 60 + 30, cat: 'accent' },
  { id: 'e6', title: '跑步 5km', day: 0, start: 18 * 60, end: 18 * 60 + 45, cat: 'sage' },
  { id: 'e7', title: '阅读 · 《深度工作》', day: 0, start: 21 * 60, end: 22 * 60, cat: 'sand' },

  // 周二
  { id: 'e10', title: '睡眠', day: 1, start: 0, end: 7 * 60 + 20, cat: 'sage' },
  { id: 'e11', title: '深度工作', day: 1, start: 9 * 60, end: 11 * 60 + 30, cat: 'accent' },
  { id: 'e12', title: '与设计师同步', day: 1, start: 11 * 60 + 30, end: 12 * 60, cat: 'sky' },
  { id: 'e13', title: '午餐 · 沙拉', day: 1, start: 12 * 60 + 30, end: 13 * 60, cat: 'rose' },
  { id: 'e14', title: '写作', day: 1, start: 15 * 60, end: 17 * 60, cat: 'sand' },
  { id: 'e15', title: '晚餐 · 朋友', day: 1, start: 19 * 60, end: 20 * 60 + 30, cat: 'sky', location: '城西小馆' },

  // 周三
  { id: 'e20', title: '睡眠', day: 2, start: 0, end: 6 * 60 + 50, cat: 'sage' },
  { id: 'e21', title: '晨间冥想', day: 2, start: 7 * 60, end: 7 * 60 + 20, cat: 'sage' },
  { id: 'e22', title: '深度工作 · 发布', day: 2, start: 9 * 60, end: 12 * 60, cat: 'accent' },
  { id: 'e23', title: '午餐', day: 2, start: 12 * 60 + 30, end: 13 * 60, cat: 'rose' },
  { id: 'e24', title: '1:1', day: 2, start: 14 * 60, end: 14 * 60 + 40, cat: 'accent' },
  { id: 'e25', title: '健身房', day: 2, start: 18 * 60 + 30, end: 19 * 60 + 30, cat: 'sage' },
  { id: 'e26', title: '阅读', day: 2, start: 21 * 60 + 30, end: 22 * 60 + 30, cat: 'sand' },

  // 周四
  { id: 'e30', title: '睡眠', day: 3, start: 0, end: 7 * 60, cat: 'sage' },
  { id: 'e31', title: '深度工作', day: 3, start: 9 * 60, end: 12 * 60, cat: 'accent' },
  { id: 'e32', title: '午餐 · 面', day: 3, start: 12 * 60 + 30, end: 13 * 60, cat: 'rose' },
  { id: 'e33', title: '课程 · 系统设计', day: 3, start: 15 * 60, end: 16 * 60 + 30, cat: 'sand' },
  { id: 'e34', title: '散步', day: 3, start: 18 * 60, end: 18 * 60 + 30, cat: 'sage' },
  { id: 'e35', title: '家庭电话', day: 3, start: 20 * 60, end: 20 * 60 + 40, cat: 'sky' },

  // 周五
  { id: 'e40', title: '睡眠', day: 4, start: 0, end: 7 * 60 + 30, cat: 'sage' },
  { id: 'e41', title: '收尾 + 周报', day: 4, start: 9 * 60, end: 11 * 60, cat: 'accent' },
  { id: 'e42', title: '团队午餐', day: 4, start: 12 * 60, end: 13 * 60 + 30, cat: 'sky' },
  { id: 'e43', title: '复盘本周', day: 4, start: 16 * 60, end: 17 * 60, cat: 'stone' },
  { id: 'e44', title: '电影', day: 4, start: 20 * 60, end: 22 * 60, cat: 'rose' },

  // 周六
  { id: 'e50', title: '睡眠', day: 5, start: 0, end: 8 * 60 + 30, cat: 'sage' },
  { id: 'e51', title: '长跑 12km', day: 5, start: 9 * 60, end: 10 * 60 + 30, cat: 'sage' },
  { id: 'e52', title: '采购 + 做饭', day: 5, start: 11 * 60, end: 13 * 60, cat: 'rose' },
  { id: 'e53', title: '副业项目', day: 5, start: 15 * 60, end: 18 * 60, cat: 'accent' },
  { id: 'e54', title: '朋友聚会', day: 5, start: 19 * 60 + 30, end: 22 * 60 + 30, cat: 'sky' },

  // 周日
  { id: 'e60', title: '睡眠', day: 6, start: 0, end: 8 * 60, cat: 'sage' },
  { id: 'e61', title: '早午餐', day: 6, start: 10 * 60, end: 11 * 60, cat: 'rose' },
  { id: 'e62', title: '阅读 + 笔记', day: 6, start: 14 * 60, end: 16 * 60, cat: 'sand' },
  { id: 'e63', title: '下周计划', day: 6, start: 17 * 60, end: 17 * 60 + 45, cat: 'stone' },
  { id: 'e64', title: '早睡准备', day: 6, start: 22 * 60, end: 22 * 60 + 30, cat: 'sage' },
]

export interface MockTodo {
  id: string
  title: string
  cat: Cat
  pri: Pri
  done: boolean
  project?: string
  focus?: boolean
}

export const TODOS: MockTodo[] = [
  { id: 't1', title: '重构事件布局算法', cat: 'accent', pri: 'high', done: false, project: '原型', focus: true },
  { id: 't2', title: '统一设计 token', cat: 'accent', pri: 'high', done: false, project: '原型', focus: true },
  { id: 't3', title: '给 domain/layout 补测试', cat: 'accent', pri: 'medium', done: false, project: '原型' },
  { id: 't4', title: '回复邮件', cat: 'sky', pri: 'low', done: false },
  { id: 't5', title: '预约体检', cat: 'sage', pri: 'medium', done: false },
  { id: 't6', title: '读完《深度工作》第 3 章', cat: 'sand', pri: 'low', done: false, project: '阅读计划' },
  { id: 't7', title: '整理桌面', cat: 'stone', pri: 'low', done: true },
  { id: 't8', title: '写周报', cat: 'accent', pri: 'medium', done: true, project: '原型' },
  { id: 't9', title: '买跑鞋', cat: 'sage', pri: 'low', done: true },
  { id: 't10', title: '调研图表方案', cat: 'sand', pri: 'high', done: false, project: '原型', focus: true },
]

export interface MockProject {
  id: string
  name: string
  cat: Cat
  active: number
  done: number
}

export const PROJECTS: MockProject[] = [
  { id: 'p1', name: '前端原型', cat: 'accent', active: 4, done: 7 },
  { id: 'p2', name: '阅读计划', cat: 'sand', active: 2, done: 5 },
  { id: 'p3', name: '健康习惯', cat: 'sage', active: 1, done: 12 },
  { id: 'p4', name: '家庭', cat: 'rose', active: 3, done: 2 },
]

/** 复盘：每周各类别小时数（最近 8 周）。 */
export interface WeekPoint { week: string; accent: number; sage: number; sand: number; sky: number; rose: number }
export const WEEK_TREND: WeekPoint[] = [
  { week: 'W18', accent: 32, sage: 9,  sand: 7,  sky: 6,  rose: 10 },
  { week: 'W19', accent: 35, sage: 8,  sand: 9,  sky: 5,  rose: 9 },
  { week: 'W20', accent: 30, sage: 11, sand: 8,  sky: 8,  rose: 11 },
  { week: 'W21', accent: 28, sage: 12, sand: 10, sky: 7,  rose: 10 },
  { week: 'W22', accent: 33, sage: 10, sand: 6,  sky: 9,  rose: 8 },
  { week: 'W23', accent: 31, sage: 13, sand: 9,  sky: 6,  rose: 12 },
  { week: 'W24', accent: 29, sage: 11, sand: 11, sky: 8,  rose: 9 },
  { week: 'W25', accent: 34, sage: 12, sand: 8,  sky: 7,  rose: 10 },
]

/** 睡眠散点：最近 21 天的入睡 / 起床（分钟，跨午夜用负值表示前一天） */
export interface SleepPoint { day: number; sleep: number; wake: number }
export const SLEEP: SleepPoint[] = Array.from({ length: 21 }, (_, i) => {
  const drift = Math.sin(i / 3) * 35
  const sleep = 23 * 60 + 30 + Math.round(drift) + (i % 4 === 0 ? 40 : 0)
  const wake = 7 * 60 + Math.round(Math.cos(i / 4) * 25)
  return { day: i, sleep, wake }
})

/** 年度热力图：最近 18 周 × 7 天的活跃度 0–4 */
export const HEATMAP: number[] = Array.from({ length: 18 * 7 }, (_, i) => {
  const r = Math.sin(i * 0.7) * Math.cos(i * 0.3)
  const v = Math.round((r + 1) * 2)
  return Math.max(0, Math.min(4, v))
})

export const CAT_VAR: Record<Cat, string> = {
  accent: 'var(--c-accent)', sage: 'var(--c-sage)', sand: 'var(--c-sand)',
  sky: 'var(--c-sky)', rose: 'var(--c-rose)', stone: 'var(--c-stone)',
}
export const CAT_BG: Record<Cat, string> = {
  accent: 'var(--c-accent-bg)', sage: 'var(--c-sage-bg)', sand: 'var(--c-sand-bg)',
  sky: 'var(--c-sky-bg)', rose: 'var(--c-rose-bg)', stone: 'var(--c-stone-bg)',
}

export function fmtMin(min: number): string {
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function durLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分`
}
