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

export type RepeatPattern = 'daily'

// ── 优先级枚举 ──────────────────────────────────────────────

/** 优先级：'high' | 'medium' | 'low'；null 表示"收件箱"（未归类） */
export type TodoPriority = TodoPriorityWithValue | null

type TodoPriorityWithValue = 'high' | 'medium' | 'low'

export const TODO_PRIORITIES: readonly TodoPriorityWithValue[] = ['high', 'medium', 'low'] as const

export const TODO_PRIORITY_LABELS: Record<TodoPriorityWithValue, string> = {
  high:   '高',
  medium: '中',
  low:    '低',
}

export const TODO_PRIORITY_LABELS_EN: Record<TodoPriorityWithValue, string> = {
  high:   'High',
  medium: 'Medium',
  low:    'Low',
}

/** 数值越大优先级越高，用于排序 */
export const TODO_PRIORITY_ORDER: Record<TodoPriorityWithValue, number> = {
  high:   3,
  medium: 2,
  low:    1,
}

/** 优先级排序值：null（收件箱）最低，排在 'low' 之后 */
export const TODO_PRIORITY_SORT_ORDER: Record<string, number> = {
  null:  0,
  low:   1,
  medium: 2,
  high:  3,
}

// ── 主类型 ──────────────────────────────────────────────────

export interface Todo {
  id: string
  title: string
  description: string
  status: TodoStatus
  priority: TodoPriority
  /** 领域行的 id（来自 domain 分类），null 表示未归类（收件箱） */
  domain: string | null
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
  /** 重复模式。null = 普通待办。'daily' = 完成后自动克隆到明天 */
  repeatPattern: RepeatPattern | null
  /** 关联的目标 ID（长期目标树中的节点），null 表示未关联 */
  goalId: string | null
}

// ── 输入类型 ────────────────────────────────────────────────

export interface CreateTodoInput {
  title: string
  description?: string
  priority?: TodoPriority | null
  domain?: string | null
  dueDate?: number | null
  projectId?: string | null
  categoryId?: string | null
  repeatPattern?: RepeatPattern | null
  goalId?: string | null
}

export interface UpdateTodoInput {
  id: string
  title?: string
  description?: string
  status?: TodoStatus
  priority?: TodoPriority | null
  domain?: string | null
  dueDate?: number | null
  sortOrder?: number
  projectId?: string | null
  categoryId?: string | null
  repeatPattern?: RepeatPattern | null
  goalId?: string | null
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

    // 再按优先级（null 最低）
    const pA = TODO_PRIORITY_SORT_ORDER[a.priority ?? 'null'] ?? 0
    const pB = TODO_PRIORITY_SORT_ORDER[b.priority ?? 'null'] ?? 0
    const pDiff = pB - pA
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

/** 按完成日期分组已完成待办，按日期倒序排列 */
export interface CompletionGroup {
  /** 日期标签，例如 "3月15日 周六" */
  dateLabel: string
  /** 当天 0 点时间戳 */
  dateTs: number
  /** 该日期下完成的待办，按 completedAt 降序 */
  todos: Todo[]
}

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function groupTodosByCompletionDate(todos: Todo[]): CompletionGroup[] {
  const groups = new Map<number, Todo[]>()

  for (const todo of todos) {
    if (todo.status !== 'done' || todo.completedAt === null) continue
    const d = new Date(todo.completedAt)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const list = groups.get(dayStart)
    if (list) {
      list.push(todo)
    } else {
      groups.set(dayStart, [todo])
    }
  }

  const result: CompletionGroup[] = []
  for (const [dateTs, todoList] of groups) {
    // Sort todos within group by completedAt descending
    todoList.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

    const d = new Date(dateTs)
    const label = `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_NAMES[d.getDay()]}`

    result.push({ dateLabel: label, dateTs, todos: todoList })
  }

  // Sort groups by date descending
  result.sort((a, b) => b.dateTs - a.dateTs)

  return result
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

/**
 * 按 (domain, priority) 将未完成待办分组，供优先级矩阵使用。
 *
 * @param todos - 全部待办
 * @param projectDomainMap - projectId → domain(categoryId) 映射（项目继承用）
 * @param domainOrder - 领域 ID 顺序（决定行序）
 * @returns { domainId: { high: [...], medium: [...], low: [...] } }
 *          每个格子都是数组；priority=null 的"收件箱"任务归入 inbox 格子
 *          保证 domainOrder 中所有领域都存在
 */
export function groupTodosByPriority(
  todos: Todo[],
  projectDomainMap: Record<string, string>,
  domainOrder: string[],
): Record<string, Record<string, Todo[]>> {
  // 按领域初始化空结构
  const result: Record<string, Record<string, Todo[]>> = {}
  for (const domId of domainOrder) {
    result[domId] = { high: [], medium: [], low: [] }
  }

  // 只处理未完成的待办
  const activeTodos = todos.filter((t) => t.status !== 'done')

  for (const todo of activeTodos) {
    // 确定领域：优先用 todo.domain，否则从项目继承
    let domId = todo.domain
    if (!domId && todo.projectId) {
      domId = projectDomainMap[todo.projectId] ?? null
    }
    if (!domId || !result[domId]) {
      // 无领域 → 归入 inbox
      if (!result['inbox']) result['inbox'] = { high: [], medium: [], low: [] }
      domId = 'inbox'
    }

    // priority 为 null 时归入 low 格子（收件箱任务不显示在矩阵格子中）
    const p = todo.priority ?? 'low'
    result[domId][p].push(todo)
  }

  return result
}

// ── 周视图分组 ─────────────────────────────────────────────

/**
 * 单日分组结果：该日待办区 + 已完成区
 */
export interface DayGroup {
  /** 日期时间戳（当天 0 点 UTC ms） */
  dateTs: number
  /** 日期标签，如 "3月17日" */
  dateLabel: string
  /** 周几（0=周日，1=周一…6=周六） */
  weekday: number
  /** 未完成的待办（按优先级+sortOrder 排序） */
  activeTodos: Todo[]
  /** 已完成的待办（按 completedAt 降序） */
  doneTodos: Todo[]
}

/**
 * 周视图分组结果
 */
export interface WeekDayGroups {
  /** 本周一 0 点时间戳 */
  weekStart: number
  /** 本周日 23:59:59 时间戳 */
  weekEnd: number
  /** 周标签，如 "3月17日 – 3月23日" */
  weekLabel: string
  /** 周一~周日，每天一组 */
  days: [DayGroup, DayGroup, DayGroup, DayGroup, DayGroup, DayGroup, DayGroup]
  /** 逾期（dueDate < weekStart，且未完成） */
  overdueTodos: Todo[]
  /** 无截止日期的未完成待办 */
  unscheduledTodos: Todo[]
}

/**
 * 按周分组待办：将 todo 按 dueDate 分到周一~周日，
 * 逾期归逾期，无日期归 unscheduled。
 *
 * @param todos - 全部待办
 * @param weekStart - 本周一 0 点时间戳
 * @returns 按周结构分组的待办
 */
export function groupTodosByWeekDays(todos: Todo[], weekStart: number): WeekDayGroups {
  const weekEnd = weekStart + 7 * 86400000 - 1 // 周日 23:59:59.999

  // 初始化 7 天（按周一~周日排列），weekday 由 dateTs 自动计算
  const days: [DayGroup, DayGroup, DayGroup, DayGroup, DayGroup, DayGroup, DayGroup] = [
    createDayGroup(weekStart),                       // 周一
    createDayGroup(weekStart + 86400000),            // 周二
    createDayGroup(weekStart + 2 * 86400000),        // 周三
    createDayGroup(weekStart + 3 * 86400000),        // 周四
    createDayGroup(weekStart + 4 * 86400000),        // 周五
    createDayGroup(weekStart + 5 * 86400000),        // 周六
    createDayGroup(weekStart + 6 * 86400000),        // 周日
  ]

  const overdueTodos: Todo[] = []
  const unscheduledTodos: Todo[] = []

  for (const todo of todos) {
    // ── 已完成：按 completedAt 分组（日志按完成日归档） ──
    if (todo.status === 'done') {
      if (todo.completedAt === null) continue // 防御：已完成但无完成时间戳

      // UTC 时间戳 → 本地时区当天 0 点
      const cd = new Date(todo.completedAt)
      const localDayStart = new Date(cd.getFullYear(), cd.getMonth(), cd.getDate()).getTime()

      // 完成日不在本周范围内则不显示
      if (localDayStart < weekStart || localDayStart > weekEnd) continue

      const dayIndex = (localDayStart - weekStart) / 86400000
      if (dayIndex < 0 || dayIndex > 6) continue

      days[dayIndex].doneTodos.push(todo)
      continue
    }

    // ── 未完成：按 dueDate 分组（原有逻辑不变） ──
    if (todo.dueDate === null) {
      unscheduledTodos.push(todo)
      continue
    }

    if (todo.dueDate < weekStart) {
      overdueTodos.push(todo)
      continue
    }

    if (todo.dueDate > weekEnd) continue // 未来周，忽略

    const dayIndex = Math.floor((todo.dueDate - weekStart) / 86400000)
    if (dayIndex < 0 || dayIndex > 6) continue

    days[dayIndex].activeTodos.push(todo)
  }

  // 排序
  for (const day of days) {
    day.activeTodos.sort((a, b) => {
      const pA = TODO_PRIORITY_SORT_ORDER[a.priority ?? 'null'] ?? 0
      const pB = TODO_PRIORITY_SORT_ORDER[b.priority ?? 'null'] ?? 0
      const pDiff = pB - pA
      if (pDiff !== 0) return pDiff
      return a.sortOrder - b.sortOrder
    })
    day.doneTodos.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  }

  overdueTodos.sort((a, b) => {
    const pA = TODO_PRIORITY_SORT_ORDER[a.priority ?? 'null'] ?? 0
    const pB = TODO_PRIORITY_SORT_ORDER[b.priority ?? 'null'] ?? 0
    const pDiff = pB - pA
    if (pDiff !== 0) return pDiff
    return a.sortOrder - b.sortOrder
  })

  unscheduledTodos.sort((a, b) => {
    const pA = TODO_PRIORITY_SORT_ORDER[a.priority ?? 'null'] ?? 0
    const pB = TODO_PRIORITY_SORT_ORDER[b.priority ?? 'null'] ?? 0
    const pDiff = pB - pA
    if (pDiff !== 0) return pDiff
    return a.sortOrder - b.sortOrder
  })

  // 周标签
  const startDate = new Date(weekStart)
  const endDate = new Date(weekStart + 6 * 86400000)
  const weekLabel = `${startDate.getMonth() + 1}月${startDate.getDate()}日 – ${endDate.getMonth() + 1}月${endDate.getDate()}日`

  return { weekStart, weekEnd, weekLabel, days, overdueTodos, unscheduledTodos }
}

function createDayGroup(dateTs: number): DayGroup {
  const d = new Date(dateTs)
  const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日`
  const weekday = d.getDay() // 0=Sun, 1=Mon, ..., 与 WEEKDAY_NAMES 索引一致
  return { dateTs, dateLabel, weekday, activeTodos: [], doneTodos: [] }
}

// ── 今日聚焦 ────────────────────────────────────────────────

/** 判断待办是否标记为"今日聚焦"（dueDate 为今天） */
export function isTodayFocus(todo: Todo, now: number = Date.now()): boolean {
  if (!todo.dueDate) return false
  const todayStart = new Date(now).setHours(0, 0, 0, 0)
  const tomorrowStart = todayStart + 86400000
  return todo.dueDate >= todayStart && todo.dueDate < tomorrowStart
}

/** 今日聚焦统计数据 */
export interface TodayFocusStats {
  total: number
  completed: number
  focused: Todo[]
}

export function getTodayFocusStats(todos: Todo[], now: number = Date.now()): TodayFocusStats {
  const focused: Todo[] = []
  let completed = 0
  for (const todo of todos) {
    if (isTodayFocus(todo, now)) {
      focused.push(todo)
      if (todo.status === 'done') completed++
    }
  }
  return { total: focused.length, completed, focused }
}

/**
 * 按 (domain, priority) 分组，但已完成的今日聚焦项保留在格子中。
 * 用于"完成即留存"——已完成的今日聚焦项仍显示在原位（划线+淡化）。
 */
export function groupTodosByPriorityWithDoneFocus(
  todos: Todo[],
  projectDomainMap: Record<string, string>,
  domainOrder: string[],
  now: number = Date.now(),
): Record<string, Record<string, Todo[]>> {
  // 先做标准分组（过滤掉所有已完成项）
  const grouped = groupTodosByPriority(todos, projectDomainMap, domainOrder)

  // 把已完成的今日聚焦项加回对应格子
  for (const todo of todos) {
    if (todo.status !== 'done') continue
    if (!isTodayFocus(todo, now)) continue

    let domId = todo.domain
    if (!domId && todo.projectId) {
      domId = projectDomainMap[todo.projectId] ?? null
    }
    if (!domId || !grouped[domId]) continue

    const p = todo.priority ?? 'low'
    grouped[domId][p].push(todo)
  }

  return grouped
}

/** 获取今天 0 点的时间戳 */
export function getTodayStart(now: number = Date.now()): number {
  return new Date(now).setHours(0, 0, 0, 0)
}

/** 判断待办是否为重复待办 */
export function isRepeatingTodo(todo: Todo): boolean {
  return todo.repeatPattern === 'daily'
}

/**
 * 克隆一个重复待办作为新实例。
 * 用于完成旧实例后自动生成下一个。
 */
export function spawnNextRepeat(todo: Todo, now: number = Date.now()): Todo {
  return {
    id: crypto.randomUUID(),
    title: todo.title,
    description: todo.description,
    status: 'todo',
    priority: todo.priority,
    domain: todo.domain,
    dueDate: null,
    sortOrder: todo.sortOrder,
    projectId: todo.projectId,
    categoryId: todo.categoryId,
    repeatPattern: 'daily',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    goalId: todo.goalId,
  }
}


// ── 动量沉淀（连续聚焦日） ──────────────────────────────────

/** 计算连续完成聚焦的天数（从今天往前数） */
export function calcCompletionStreak(todos: Todo[], now: number = Date.now()): number {
  const todayStart = getTodayStart(now)
  let streak = 0
  for (let i = 0; ; i++) {
    const dayStart = todayStart - i * 86400000
    const dayEnd = dayStart + 86400000
    // 检查该日是否有完成的聚焦项
    const hasCompleted = todos.some(
      (t) =>
        t.status === 'done' &&
        t.completedAt !== null &&
        t.completedAt >= dayStart &&
        t.completedAt < dayEnd &&
        t.dueDate !== null &&
        t.dueDate >= dayStart &&
        t.dueDate < dayEnd,
    )
    if (hasCompleted) {
      streak++
    } else if (i > 0) {
      // 从昨天起必须连续
      break
    } else {
      // 今天还没完成，不中断连续
    }
  }
  return streak
}

/** 周中各日的完成统计（日志 Tab 小圆点用） */
export interface DayCompletionStat {
  dateTs: number
  /** 当日是否有完成项 */
  hasDone: boolean
  /** 当日完成总数 */
  doneCount: number
}

export function getWeekCompletionStats(
  doneTodos: Todo[],
  weekStart: number,
): DayCompletionStat[] {
  const result: DayCompletionStat[] = []
  for (let i = 0; i < 7; i++) {
    const dayStart = weekStart + i * 86400000
    const dayEnd = dayStart + 86400000
    const dayTodos = doneTodos.filter(
      (t) => t.completedAt !== null && t.completedAt >= dayStart && t.completedAt < dayEnd,
    )
    result.push({
      dateTs: dayStart,
      hasDone: dayTodos.length > 0,
      doneCount: dayTodos.length,
    })
  }
  return result
}
