/**
 * # 开发模板数据播种（DEV-only）
 *
 * 仅在开发服务器（`import.meta.env.DEV`）且事件表为空时运行：
 * 用真实结构的 28 天数据填充本地 IndexedDB，让浏览器每次访问都能
 * 直接看到完整的日历 / 规划 / 复盘效果（已越过"需要至少 3 天数据"的成熟度门槛）。
 *
 * 生产构建（Tauri exe，`import.meta.env.DEV === false`）永不播种，
 * 调用点已用 DEV 守卫做死代码消除，本模块不会进入生产包。
 * 任何情况下都遵守"事件表非空即退出"，绝不覆盖用户已有数据。
 */

import type {
  CreateEventInput, EventColor, MealOrder, MealSource, MealTag,
} from '@/domain/event'
import type { Todo, TodoPriority } from '@/domain/todo'
import { getEventRepo, getProjectRepo, getTodoRepo } from './getRepositories'

type Cat = EventColor
type Quality = 1 | 2 | 3 | 4 | 5

const DAYS = 28
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

// ── 确定性伪随机（按种子稳定，保证每次播种结果一致） ──────────
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dayDate(daysAgo: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d
}
/** 当天 hour:min 的本地时间戳 */
function at(base: Date, hour: number, min: number): number {
  const d = new Date(base)
  d.setHours(hour, min, 0, 0)
  return d.getTime()
}
/** 当天 0 点 + totalMin 分钟（避免跨小时进位的手算） */
function atMin(base: Date, totalMin: number): number {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  return d.getTime() + totalMin * 60_000
}
function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)]
}

const ACCENT_TITLES = ['深度工作', '产品打磨', '方案攻坚', '核心开发', '写作输出'] as const
const SAGE_WORK = ['团队同步', '邮件处理', '需求评审', '文档整理'] as const
const SAGE_SPORT = ['跑步训练', '力量训练', '游泳'] as const
const SKY_TITLES = ['技术阅读', '英语学习', '在线课程', '读书笔记'] as const
const ROSE_TITLES = ['看剧', '玩游戏', '散步', '听播客'] as const
const ROSE_OUT = ['朋友聚会', '城市漫步', '逛展'] as const
const SAND_CHORES = ['通勤', '采购', '家务整理', '杂务'] as const

export async function seedDemoData(): Promise<void> {
  const eventRepo = getEventRepo()
  const existing = await eventRepo.getAll()
  if (existing.length > 0) return // 已有数据 → 绝不覆盖

  // ── 1. 项目 ──────────────────────────────────────────────
  const projectRepo = getProjectRepo()
  const pCore = await projectRepo.create({ name: '核心项目 · 产品打磨', categoryId: 'accent', description: '当前阶段的主战场' })
  const pFit = await projectRepo.create({ name: '体能训练', categoryId: 'sage', description: '每周三次，沉到底' })
  const pRead = await projectRepo.create({ name: '技术阅读', categoryId: 'sky', description: '长期输入' })
  const pWatch = await projectRepo.create({ name: '影集观影', categoryId: 'rose', description: '放松，不评判' })

  // ── 2. 事件（28 天） ─────────────────────────────────────
  const events: CreateEventInput[] = []
  const block = (color: Cat, title: string, start: number, end: number, projectId?: string) =>
    events.push({ title, startTime: start, endTime: end, color, categoryId: color, projectId })
  const meal = (start: number, end: number, mealOrder: MealOrder, foodTags: MealTag[], source: MealSource, title: string) =>
    events.push({
      title, startTime: start, endTime: end, color: 'sand', categoryId: 'sand',
      typedKey: 'meal', typedData: { type: 'meal', mealOrder, foodTags, source },
    })
  const sleep = (start: number, end: number, sub: 'main' | 'nap', quality: Quality, title: string, awake = false) =>
    events.push({
      title, startTime: start, endTime: end, color: 'stone', categoryId: 'stone',
      typedKey: 'sleep', typedData: { type: 'sleep', sleepType: sub, quality, hasAwakening: awake, bedtime: start, wakeTime: end },
    })

  for (let d = DAYS - 1; d >= 0; d--) {
    const r = rng(d * 101 + 7)
    const base = dayDate(d)
    const prev = dayDate(d + 1)
    const weekday = base.getDay() // 0=周日 .. 6=周六
    const isWeekend = weekday === 0 || weekday === 6

    // 主睡眠（前夜 → 今晨）
    const bedMin = (isWeekend ? 10 : 23 * 60 + 10) + Math.floor(r() * 40)
    const bedBase = isWeekend ? base : prev // 周末凌晨 00:xx 属于今天
    const wakeMin = (isWeekend ? 8 * 60 + 20 : 6 * 60 + 50) + Math.floor(r() * 30)
    sleep(atMin(bedBase, bedMin), atMin(base, wakeMin), 'main', (3 + Math.floor(r() * 3)) as Quality, '睡眠', r() < 0.25)

    // 早餐
    const bfTags: MealTag[] = ['staple', 'protein']
    if (r() < 0.7) bfTags.push('caffeine')
    meal(at(base, 7, 50 + Math.floor(r() * 20)), at(base, 8, 20 + Math.floor(r() * 15)), 'breakfast', bfTags, r() < 0.5 ? 'home' : 'convenience', '早餐')

    if (isWeekend) {
      block('rose', pick(r, ROSE_OUT), at(base, 10, 0), at(base, 12, 30), pWatch.id)
      meal(at(base, 12, 45), at(base, 13, 40), 'lunch', ['staple', 'protein', 'vegetable'], 'dine_in', '午餐')
      block('rose', pick(r, ROSE_TITLES), at(base, 15, 0), at(base, 17, 0))
      block('sky', pick(r, SKY_TITLES), at(base, 17, 30), at(base, 18, 30), pRead.id)
    } else {
      block('accent', pick(r, ACCENT_TITLES), at(base, 9, Math.floor(r() * 20)), at(base, 12, Math.floor(r() * 10)), pCore.id)
      meal(at(base, 12, 30), at(base, 13, 10), 'lunch', ['staple', 'protein', 'vegetable'], r() < 0.4 ? 'home' : 'takeout', '午餐')
      if (r() < 0.4) sleep(at(base, 13, 30), at(base, 14, 5 + Math.floor(r() * 20)), 'nap', (3 + Math.floor(r() * 3)) as Quality, '小憩')
      block('sage', pick(r, SAGE_WORK), at(base, 14, 30), at(base, 17, Math.floor(r() * 30)))
      if (r() < 0.5) block('sand', pick(r, SAND_CHORES), at(base, 17, 30), at(base, 18, 0))
      if (r() < 0.55) block('sage', pick(r, SAGE_SPORT), at(base, 18, 10), at(base, 19, 0), pFit.id)
    }

    // 晚餐
    const dinTags: MealTag[] = ['protein', 'vegetable']
    if (isWeekend && r() < 0.5) dinTags.push('alcohol')
    if (r() < 0.3) dinTags.push('fried')
    meal(at(base, 19, 10 + Math.floor(r() * 20)), at(base, 19, 55 + Math.floor(r() * 10)), 'dinner', dinTags, isWeekend ? 'dine_in' : 'home', '晚餐')

    // 晚间休闲 + 阅读
    block('rose', pick(r, ROSE_TITLES), at(base, 20, 10), at(base, 21, 0), r() < 0.5 ? pWatch.id : undefined)
    if (!isWeekend && r() < 0.7) block('sky', pick(r, SKY_TITLES), at(base, 21, 15), at(base, 22, 15), pRead.id)
    if (r() < 0.3) meal(at(base, 22, 30), at(base, 22, 50), 'night_snack', r() < 0.5 ? ['sugar'] : ['fried'], 'convenience', '宵夜')
  }

  await eventRepo.bulkCreate(events)
  for (const p of [pCore, pFit, pRead, pWatch]) await projectRepo.refreshStats(p.id)

  // ── 3. 待办 ──────────────────────────────────────────────
  const now = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)
  let order = 0
  const todos: Todo[] = []
  const mk = (
    title: string,
    color: Cat | null,
    priority: TodoPriority,
    status: Todo['status'],
    opts: Partial<Pick<Todo, 'description' | 'dueDate' | 'projectId' | 'createdAt' | 'completedAt' | 'repeatPattern'>> = {},
  ) => {
    todos.push({
      id: crypto.randomUUID(),
      title,
      description: opts.description ?? '',
      status,
      priority,
      domain: opts.projectId ? null : color,
      dueDate: opts.dueDate ?? null,
      sortOrder: order++,
      projectId: opts.projectId ?? null,
      categoryId: color,
      createdAt: opts.createdAt ?? now - 3 * DAY_MS,
      updatedAt: now,
      completedAt: status === 'done' ? (opts.completedAt ?? now) : null,
      repeatPattern: opts.repeatPattern ?? null,
      listId: 'default',
      goalId: null,
      isStarred: false,
    })
  }

  mk('完成产品方案终稿', 'accent', 'high', 'todo', { dueDate: todayStart, description: '今天必须收口' })
  mk('攻克核心模块性能问题', 'accent', 'high', 'in_progress', { projectId: pCore.id })
  mk('梳理 v2 路线图', 'accent', 'medium', 'todo', { projectId: pCore.id })
  mk('回复重要邮件', 'sage', 'medium', 'todo', { dueDate: todayStart })
  mk('准备团队周会材料', 'sage', 'medium', 'todo', { dueDate: todayStart + 2 * DAY_MS })
  mk('晨跑 5km', 'sage', 'low', 'todo', { dueDate: todayStart, projectId: pFit.id, repeatPattern: 'daily' })
  mk('读完《深度工作》第 3 章', 'sky', 'medium', 'todo', { projectId: pRead.id })
  mk('整理本周观影清单', 'rose', 'low', 'todo')
  mk('预约牙医', 'sand', null, 'todo')
  mk('缴纳水电费', 'sand', 'medium', 'done', { dueDate: todayStart, completedAt: todayStart + 9 * HOUR_MS })
  mk('提交季度复盘报告', 'accent', 'high', 'done', { createdAt: now - 5 * DAY_MS, completedAt: todayStart - DAY_MS + 16 * HOUR_MS })
  mk('完成在线课程作业', 'sky', 'low', 'done', { projectId: pRead.id, createdAt: now - 6 * DAY_MS, completedAt: todayStart - 2 * DAY_MS + 20 * HOUR_MS })
  mk('读完算法章节', 'sky', 'medium', 'done', { projectId: pRead.id, completedAt: todayStart + 11 * HOUR_MS })

  await getTodoRepo().bulkPut(todos)
}
