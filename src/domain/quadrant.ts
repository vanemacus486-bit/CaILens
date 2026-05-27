/**
 * # Quadrant — 四象限位置计算
 *
 * 纯粹函数，根据项目分类 + 关联事件时间计算每个项目在四象限中的位置。
 *
 * Y 轴（重要性）：由分类决定，5 个固定带
 * X 轴（紧迫性）：由最近的未来事件时间决定，30 天窗口期
 */

import type { CategoryId } from './category'
import type { Project } from './project'
import type { CalendarEvent } from './event'
import type { Todo } from './todo'

// ── 公共类型 ────────────────────────────────────────────────

export interface QuadrantPosition {
  projectId: string
  projectName: string
  x: number          // 紧迫度 0–1
  y: number          // 重要度 0–1
  categoryId: CategoryId
  categoryName: string
  todoCount: number
  doneCount: number
}

// ── 常量 ────────────────────────────────────────────────────

const CATEGORY_Y: Record<CategoryId, number> = {
  accent: 0.90,
  sage:   0.70,
  sky:    0.50,
  sand:   0.30,
  rose:   0.10,
  stone:  0,         // 不参与
}

const CATEGORY_NAMES: Record<CategoryId, string> = {
  accent: '主要矛盾',
  sage:   '次要矛盾',
  sky:    '个人提升',
  sand:   '庶务时间',
  rose:   '娱乐休息',
  stone:  '睡眠时长',
}

/** 参与象限的分类及显示顺序 */
const ACTIVE_CATEGORIES: CategoryId[] = ['accent', 'sage', 'sky', 'sand', 'rose']

/** 紧迫度窗口期（天） */
const URGENCY_WINDOW_DAYS = 30

/** 同层微调幅度（± 占整个画布的比例） */
const SPREAD_RANGE = 0.07

// ── 计算入口 ────────────────────────────────────────────────

export function calcQuadrantPositions(
  projects: Project[],
  allEvents: CalendarEvent[],
  todosByProject: Record<string, Todo[]>,
  now: number,
): QuadrantPosition[] {
  const active = projects.filter((p) => p.status === 'active')

  // 按分类分组
  const byCategory: Record<string, Project[]> = {}
  for (const p of active) {
    if (p.categoryId === 'stone') continue
    if (!byCategory[p.categoryId]) byCategory[p.categoryId] = []
    byCategory[p.categoryId].push(p)
  }

  const result: QuadrantPosition[] = []

  for (const catId of ACTIVE_CATEGORIES) {
    const group = byCategory[catId]
    if (!group || group.length === 0) continue

    const baseY = CATEGORY_Y[catId]

    for (const p of group) {
      const x = calcUrgency(p, allEvents, now)
      const yOffset = calcYOffset(p, group, todosByProject, now)
      const todos = todosByProject[p.id] || []
      const done = todos.filter((t) => t.status === 'done').length

      result.push({
        projectId: p.id,
        projectName: p.name,
        x,
        y: clamp(baseY + yOffset, baseY - SPREAD_RANGE, baseY + SPREAD_RANGE),
        categoryId: p.categoryId,
        categoryName: CATEGORY_NAMES[p.categoryId],
        todoCount: todos.length,
        doneCount: done,
      })
    }
  }

  return result
}

// ── 紧迫度 (X 轴) ───────────────────────────────────────────

function calcUrgency(project: Project, allEvents: CalendarEvent[], now: number): number {
  const futureEvents = allEvents.filter(
    (e) => e.projectId === project.id && e.startTime > now,
  )
  if (futureEvents.length === 0) return 0

  const nearestMs = Math.min(...futureEvents.map((e) => e.startTime - now))
  const nearestDays = nearestMs / 86_400_000

  return clamp(1 - nearestDays / URGENCY_WINDOW_DAYS, 0, 1)
}

// ── 同层 Y 轴微调 ──────────────────────────────────────────

function calcYOffset(
  project: Project,
  sameBand: Project[],
  todosByProject: Record<string, Todo[]>,
  now: number,
): number {
  // 指标 1：未完成待办占比 (60%)
  const incompleteForThis =
    todosByProject[project.id]?.filter((t) => t.status !== 'done').length ?? 0
  const maxIncomplete = Math.max(
    1,
    ...sameBand.map(
      (p) => todosByProject[p.id]?.filter((t) => t.status !== 'done').length ?? 0,
    ),
  )
  const todoScore = incompleteForThis / maxIncomplete

  // 指标 2：最近使用新鲜度 (40%) — days since lastUse，上限 30 天
  const daysSince = (now - project.lastUsedAt) / 86_400_000
  const recencyScore = 1 - Math.min(daysSince / 30, 1)

  const combined = todoScore * 0.6 + recencyScore * 0.4

  // 映射到 ±SPREAD_RANGE
  return (combined - 0.5) * SPREAD_RANGE * 2
}

// ── 待办散点图位置类型 ─────────────────────────────────────

export interface TodoDotPosition {
  todoId: string
  title: string
  x: number          // 紧迫度 0–1（基于 dueDate）
  y: number          // 重要度 0–1（基于分类）
  categoryId: string
  status: string     // 'todo' | 'done'
  dueDate: number | null  // 原始截止日期 UTC ms
  projectId: string | null
  projectName?: string
}

// ── 待办散点位置计算入口 ──────────────────────────────────

/**
 * 将每条待办（独立 + 项目内）计算为散点图上的一个圆点。
 *
 * Y = 分类（项目内继承项目分类，独立待办使用 todo.categoryId）
 * X = 紧迫度（基于 dueDate，30 天窗口期）
 */
export function calcTodoPositions(
  todos: Todo[],
  projects: Project[],
  now: number,
): TodoDotPosition[] {
  // projectId → Project 映射
  const projectMap = new Map<string, Project>()
  for (const p of projects) {
    projectMap.set(p.id, p)
  }

  const result: TodoDotPosition[] = []

  for (const todo of todos) {
    if (todo.status === 'done') continue  // 已完成暂不显示

    // Y 轴：确定分类
    let catId: string
    if (todo.projectId) {
      const proj = projectMap.get(todo.projectId)
      catId = proj?.categoryId ?? 'uncategorized'
    } else {
      catId = todo.categoryId ?? 'uncategorized'
    }

    // Y 值：映射到 0–1 范围
    const y = catIdToY(catId)

    // X 轴：紧迫度
    let x = 0
    if (todo.dueDate !== null) {
      const daysLeft = (todo.dueDate - now) / 86_400_000
      x = clamp(1 - daysLeft / URGENCY_WINDOW_DAYS, 0, 1)
    }

    // 项目名
    let projectName: string | undefined
    if (todo.projectId) {
      projectName = projectMap.get(todo.projectId)?.name
    }

    result.push({
      todoId: todo.id,
      title: todo.title,
      x,
      y,
      categoryId: catId,
      status: todo.status,
      dueDate: todo.dueDate,
      projectId: todo.projectId,
      projectName,
    })
  }

  return result
}

// ── 分类 → Y 值映射 ────────────────────────────────────────

export function catIdToY(catId: string): number {
  const y = CATEGORY_Y[catId as CategoryId]
  if (y !== undefined) return y
  // 未分类 → 放在最低
  return 0.05
}

// ── 分类 → 显示名 ──────────────────────────────────────────

export function catIdToName(catId: string): string {
  const name = CATEGORY_NAMES[catId as CategoryId]
  if (name) return name
  if (catId === 'uncategorized') return '未分类'
  return catId
}

// ── 工具 ────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
