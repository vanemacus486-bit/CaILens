/**
 * # Todo — 待办事项领域类型
 *
 * 为"规划"Tab 提供完整的待办数据模型。
 * 纯类型 + 纯函数，不依赖 React/Dexie/浏览器 API。
 */

// ── 状态枚举 ────────────────────────────────────────────────

export type TodoStatus = 'todo' | 'in_progress' | 'done'

export const TODO_STATUSES: readonly TodoStatus[] = ['todo', 'in_progress', 'done'] as const

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  todo:        '待办',
  in_progress: '进行中',
  done:        '已完成',
}

export const TODO_STATUS_LABELS_EN: Record<TodoStatus, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
}

// ── 优先级枚举 ──────────────────────────────────────────────

export type TodoPriority = 'high' | 'medium' | 'low'

export const TODO_PRIORITIES: readonly TodoPriority[] = ['high', 'medium', 'low'] as const

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  high:   '高',
  medium: '中',
  low:    '低',
}

export const TODO_PRIORITY_LABELS_EN: Record<TodoPriority, string> = {
  high:   'High',
  medium: 'Medium',
  low:    'Low',
}

/** 数值越大优先级越高，用于排序 */
export const TODO_PRIORITY_ORDER: Record<TodoPriority, number> = {
  high:   3,
  medium: 2,
  low:    1,
}

// ── 主类型 ──────────────────────────────────────────────────

export interface Todo {
  id: string
  title: string
  description: string
  status: TodoStatus
  priority: TodoPriority
  /** 截止日期时间戳 (UTC ms)，可选 */
  dueDate: number | null
  /** 排序序号，越小越靠前 */
  sortOrder: number
  /** 归属项目 ID，null 表示独立待办 */
  projectId: string | null
  /** 所属分类 ID，仅独立待办 (projectId===null) 有值时用于象限 Y 轴定位 */
  categoryId: string | null
  createdAt: number
  updatedAt: number
  /** 完成时间戳，仅 status === 'done' 时有值 */
  completedAt: number | null
}

// ── 输入类型 ────────────────────────────────────────────────

export interface CreateTodoInput {
  title: string
  description?: string
  priority?: TodoPriority
  dueDate?: number | null
  projectId?: string | null
  categoryId?: string | null
}

export interface UpdateTodoInput {
  id: string
  title?: string
  description?: string
  status?: TodoStatus
  priority?: TodoPriority
  dueDate?: number | null
  sortOrder?: number
  projectId?: string | null
  categoryId?: string | null
}

// ── 纯函数工具 ──────────────────────────────────────────────

/** 按优先级+创建时间排序（高优先在前，同优先级早创建在前） */
export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    // 未完成排前面
    const aDone = a.status === 'done' ? 1 : 0
    const bDone = b.status === 'done' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone

    // 同状态按 sortOrder
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder

    // 再按优先级
    const pDiff = TODO_PRIORITY_ORDER[b.priority] - TODO_PRIORITY_ORDER[a.priority]
    if (pDiff !== 0) return pDiff

    // 最后按创建时间
    return a.createdAt - b.createdAt
  })
}

/** 按截止日期分组：今天到期 / 未来到期 / 无截止日期 */
export function groupTodosByDueDate(todos: Todo[], now: number): {
  overdue: Todo[]
  today: Todo[]
  future: Todo[]
  noDate: Todo[]
} {
  const todayStart = new Date(now).setHours(0, 0, 0, 0)
  const tomorrowStart = todayStart + 86400000

  const overdue: Todo[] = []
  const today: Todo[] = []
  const future: Todo[] = []
  const noDate: Todo[] = []

  for (const t of todos) {
    if (t.dueDate === null) {
      noDate.push(t)
    } else if (t.dueDate < todayStart) {
      overdue.push(t)
    } else if (t.dueDate < tomorrowStart) {
      today.push(t)
    } else {
      future.push(t)
    }
  }

  return { overdue, today, future, noDate }
}

/** 计算项目完成进度（基于 status === 'done' 的待办比例） */
export function calcProjectProgress(todos: Todo[]): {
  done: number
  total: number
  percent: number
} {
  const total = todos.length
  const done = todos.filter((t) => t.status === 'done').length
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}

/** 获取下一个可用的 sortOrder（当前最大 + 1） */
export function nextSortOrder(todos: Todo[]): number {
  if (todos.length === 0) return 0
  return Math.max(...todos.map((t) => t.sortOrder)) + 1
}
