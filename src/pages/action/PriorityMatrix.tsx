/**
 * # PriorityMatrix — 优先级矩阵
 *
 * 5 行 (分类) × 3 列 (优先级) 网格布局。
 * 每个格子展示该 (分类×优先级) 组合下的待办卡片列表。
 * 替代原先的 QuadrantChart 散点图。
 */

import { type Todo, type TodoPriority } from '@/domain/todo'
import { useCategoryColors } from '@/constants/categoryColors'

// ── 常量 ──────────────────────────────────────────────────

const CATEGORY_IDS = ['accent', 'sage', 'sand', 'sky', 'rose'] as const

const CATEGORY_NAMES: Record<string, string> = {
  accent: '主要矛盾',
  sage:   '次要矛盾',
  sand:   '庶务时间',
  sky:    '个人提升',
  rose:   '休息娱乐',
}

const PRIORITIES: { id: TodoPriority; label: string; subtitle: string; color: string }[] = [
  { id: 'high',   label: '高优先', subtitle: '立即处理', color: '#B53535' },
  { id: 'medium', label: '中优先', subtitle: '计划安排', color: '#B58A35' },
  { id: 'low',    label: '低优先', subtitle: '有空再做', color: '#2D7D46' },
]

// ── Props ──────────────────────────────────────────────────

interface PriorityMatrixProps {
  /** { categoryId: { high: [...], medium: [...], low: [...] } } */
  grouped: Record<string, Record<string, Todo[]>>
  selectedId: string | null
  onCardClick: (todoId: string) => void
}

// ── 组件 ──────────────────────────────────────────────────

export function PriorityMatrix({ grouped, selectedId, onCardClick }: PriorityMatrixProps) {
  const colorMap = useCategoryColors()

  // 统计总数
  const totalCount = Object.values(grouped).reduce(
    (sum, cell) => sum + Object.values(cell).reduce((s, todos) => s + todos.length, 0),
    0,
  )

  return (
    <div className="animate-fadeIn select-none">
      {/* ── 表头 ── */}
      <div className="grid grid-cols-[64px_repeat(3,1fr)] gap-1.5 mb-1.5">
        {/* 左上角占位 */}
        <div />

        {PRIORITIES.map((p) => (
          <div
            key={p.id}
            className="rounded-lg bg-surface-sunken border border-border-subtle/60 px-3 py-2 text-center"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-sans text-xs font-medium text-text-primary">
                {p.label}
              </span>
            </div>
            <div className="font-sans text-[10px] text-text-quaternary mt-0.5">
              {p.subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* ── 矩阵行 ── */}
      <div className="space-y-1.5">
        {CATEGORY_IDS.map((catId) => {
          const cellColors = colorMap[catId]
          const row = grouped[catId]
          if (!row) return null

          return (
            <div key={catId} className="grid grid-cols-[64px_repeat(3,1fr)] gap-1.5">
              {/* ── 行头：分类名 ── */}
              <div className="flex items-center justify-end gap-1.5 pr-2 min-h-[72px]">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cellColors?.fill ?? '#888' }}
                />
                <span className="font-sans text-[11px] text-text-tertiary leading-tight text-right">
                  {CATEGORY_NAMES[catId] ?? catId}
                </span>
              </div>

              {/* ── 三列格子 ── */}
              {PRIORITIES.map((pri) => {
                const cellTodos = row[pri.id] ?? []
                const isSelected = cellTodos.some((t) => t.id === selectedId)

                return (
                  <Cell
                    key={pri.id}
                    todos={cellTodos}
                    categoryFill={cellColors?.fill ?? '#888'}
                    priorityColor={pri.color}
                    isSelected={isSelected}
                    selectedId={selectedId}
                    onCardClick={onCardClick}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── 底部统计 ── */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        <span className="font-sans text-[10px] text-text-quaternary">
          {totalCount > 0
            ? `共 ${totalCount} 个待办`
            : '暂无待办'
          }
        </span>
      </div>
    </div>
  )
}

// ── Cell 子组件 ────────────────────────────────────────────

interface CellProps {
  todos: Todo[]
  categoryFill: string
  priorityColor: string
  isSelected: boolean
  selectedId: string | null
  onCardClick: (id: string) => void
}

function Cell({ todos, categoryFill, priorityColor, isSelected, selectedId, onCardClick }: CellProps) {
  const count = todos.length

  return (
    <div
      className={`relative rounded-lg border min-h-[72px] p-2 transition-all duration-200 ${
        isSelected
          ? 'border-accent/50 bg-surface-raised shadow-sm'
          : 'border-border-subtle/60 bg-surface-sunken/40'
      }`}
    >
      {/* ── 计数徽标 ── */}
      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-mono text-[10px] font-medium text-white leading-none px-1 shadow-xs z-10"
          style={{ backgroundColor: priorityColor }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}

      {/* ── 空态 ── */}
      {count === 0 && (
        <div className="flex items-center justify-center h-full min-h-[56px]">
          <span className="font-sans text-[10px] text-text-quaternary/40">0</span>
        </div>
      )}

      {/* ── 卡片列表 ── */}
      {count > 0 && (
        <div className="space-y-1.5 max-h-[240px] overflow-y-auto scrollbar-thin">
          {todos.map((todo) => {
            const cardSelected = todo.id === selectedId
            return (
              <button
                key={todo.id}
                onClick={() => onCardClick(todo.id)}
                className={`w-full text-left rounded-md border cursor-pointer transition-all duration-150 group overflow-hidden ${
                  cardSelected
                    ? 'border-accent/40 bg-accent/5 shadow-xs'
                    : 'border-border-subtle bg-surface-raised hover:border-border-default hover:shadow-xs'
                }`}
                style={{ borderLeftWidth: 3, borderLeftColor: categoryFill }}
              >
                <div className="px-2.5 py-2">
                  {/* 标题 */}
                  <div className="font-sans text-[12px] text-text-primary leading-tight truncate">
                    {todo.title}
                  </div>

                  {/* 期限 */}
                  {todo.dueDate && (
                    <DueDateBadge dueDate={todo.dueDate} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 期限徽标 ──────────────────────────────────────────────

function DueDateBadge({ dueDate }: { dueDate: number }) {
  const now = Date.now()
  const todayStart = new Date(now).setHours(0, 0, 0, 0)
  const diffDays = Math.round((dueDate - todayStart) / 86_400_000)

  let label: string
  let isOverdue = false

  if (diffDays < 0) {
    label = `逾期${Math.abs(diffDays)}天`
    isOverdue = true
  } else if (diffDays === 0) {
    label = '今天'
  } else if (diffDays === 1) {
    label = '明天'
  } else {
    const d = new Date(dueDate)
    label = `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <span
      className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono leading-none ${
        isOverdue
          ? 'bg-[#B53535]/10 text-[#B53535]'
          : 'bg-surface-sunken text-text-tertiary'
      }`}
    >
      {label}
    </span>
  )
}
