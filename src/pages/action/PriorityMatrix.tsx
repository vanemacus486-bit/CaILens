/**
 * # PriorityMatrix — 优先级矩阵
 *
 * 5 行 (分类) × 3 列 (优先级) 网格布局。
 * 每个格子展示该 (分类×优先级) 组合下的待办卡片列表。
 * 替代原先的 QuadrantChart 散点图。
 */

import { useState, useCallback, useRef, type DragEvent } from 'react'
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
  /** 拖拽重排回调（同格内） */
  onReorder: (sourceId: string, targetId: string, position: 'before' | 'after') => void
  /** 跨格移动回调（改分类/优先级） */
  onMoveToCell: (sourceId: string, catId: string, priId: string) => void
}

// ── 组件 ──────────────────────────────────────────────────

export function PriorityMatrix({ grouped, selectedId, onCardClick, onReorder, onMoveToCell }: PriorityMatrixProps) {
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
                    catId={catId}
                    priId={pri.id}
                    todos={cellTodos}
                    categoryFill={cellColors?.fill ?? '#888'}
                    priorityColor={pri.color}
                    isSelected={isSelected}
                    selectedId={selectedId}
                    onCardClick={onCardClick}
                    onReorder={onReorder}
                    onMoveToCell={onMoveToCell}
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
  catId: string
  priId: string
  todos: Todo[]
  categoryFill: string
  priorityColor: string
  isSelected: boolean
  selectedId: string | null
  onCardClick: (id: string) => void
  onReorder: (sourceId: string, targetId: string, position: 'before' | 'after') => void
  onMoveToCell: (sourceId: string, catId: string, priId: string) => void
}

function Cell({ catId, priId, todos, categoryFill, priorityColor, isSelected, selectedId, onCardClick, onReorder, onMoveToCell }: CellProps) {
  const count = todos.length

  // ── 拖拽状态 ──
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)
  const [dropPos, setDropPos] = useState<'before' | 'after' | null>(null)
  const [isCellHover, setIsCellHover] = useState(false)
  const dragEnterCount = useRef(0)

  /** 解析 sourceCell 判断是否同格 */
  function isSameCell(dataTransfer: DataTransfer): boolean {
    const raw = dataTransfer.getData('application/todo-cell')
    if (!raw) return false
    try {
      const sc = JSON.parse(raw)
      return sc.catId === catId && sc.priId === priId
    } catch {
      return false
    }
  }

  const handleDragStart = useCallback((e: DragEvent, todoId: string) => {
    e.dataTransfer.setData('text/plain', todoId)
    e.dataTransfer.setData('application/todo-cell', JSON.stringify({ catId, priId }))
    e.dataTransfer.effectAllowed = 'move'
    const el = e.currentTarget as HTMLElement
    el.style.opacity = '0.4'
  }, [catId, priId])

  const handleDragEnd = useCallback((e: DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.style.opacity = '1'
    setDragOverCardId(null)
    setDropPos(null)
    setIsCellHover(false)
    dragEnterCount.current = 0
  }, [])

  // ── 格级拖拽（用于跨格视觉反馈 + 空白区落点） ──
  const handleCellDragEnter = useCallback((_e: DragEvent) => {
    dragEnterCount.current += 1
    setIsCellHover(true)
  }, [])

  const handleCellDragLeave = useCallback((_e: DragEvent) => {
    dragEnterCount.current -= 1
    if (dragEnterCount.current <= 0) {
      dragEnterCount.current = 0
      setIsCellHover(false)
    }
  }, [])

  const handleCellDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleCellDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId) { setIsCellHover(false); return }

    if (isSameCell(e.dataTransfer)) {
      // 同格空白区 → 末尾重排
      if (todos.length > 0) {
        const lastTodo = todos[todos.length - 1]
        if (sourceId !== lastTodo.id) onReorder(sourceId, lastTodo.id, 'after')
      }
    } else {
      // 跨格 → 移动到此格
      onMoveToCell(sourceId, catId, priId)
    }
    setIsCellHover(false)
    dragEnterCount.current = 0
  }, [catId, priId, todos, onReorder, onMoveToCell])

  // ── 卡片级拖拽 ──
  const handleCardDragOver = useCallback((e: DragEvent, todoId: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const pos = y < rect.height / 2 ? 'before' : 'after'
    setDragOverCardId(todoId)
    setDropPos(pos)
  }, [])

  const handleCardDragLeave = useCallback((e: DragEvent) => {
    const target = e.currentTarget as HTMLElement
    const related = e.relatedTarget as HTMLElement | null
    if (related && target.contains(related)) return
    setDragOverCardId(null)
    setDropPos(null)
  }, [])

  const handleCardDrop = useCallback((e: DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId || !dropPos) {
      setDragOverCardId(null); setDropPos(null)
      return
    }

    if (isSameCell(e.dataTransfer)) {
      onReorder(sourceId, targetId, dropPos)
    } else {
      onMoveToCell(sourceId, catId, priId)
    }
    setDragOverCardId(null); setDropPos(null)
  }, [catId, priId, dropPos, onReorder, onMoveToCell])

  const handleScrollAreaDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    e.stopPropagation()
  }, [])

  const handleScrollAreaDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId) { setDragOverCardId(null); setDropPos(null); return }

    if (isSameCell(e.dataTransfer)) {
      if (todos.length > 0) {
        const lastTodo = todos[todos.length - 1]
        if (sourceId !== lastTodo.id) onReorder(sourceId, lastTodo.id, 'after')
      }
    } else {
      onMoveToCell(sourceId, catId, priId)
    }
    setDragOverCardId(null); setDropPos(null)
  }, [catId, priId, todos, onReorder, onMoveToCell])

  return (
    <div
      className={`relative rounded-lg border min-h-[72px] p-2 transition-all duration-200 ${
        isCellHover
          ? 'border-accent/60 bg-accent/[0.04] shadow-sm ring-1 ring-accent/20'
          : isSelected
            ? 'border-accent/50 bg-surface-raised shadow-sm'
            : 'border-border-subtle/60 bg-surface-sunken/40'
      }`}
      onDragEnter={handleCellDragEnter}
      onDragLeave={handleCellDragLeave}
      onDragOver={handleCellDragOver}
      onDrop={handleCellDrop}
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

      {/* ── 卡片列表（可拖拽） ── */}
      {count > 0 && (
        <div
          className="space-y-1.5 max-h-[240px] overflow-y-auto scrollbar-thin"
          onDragOver={handleScrollAreaDragOver}
          onDrop={handleScrollAreaDrop}
        >
          {todos.map((todo) => {
            const cardSelected = todo.id === selectedId
            const isDropTarget = dragOverCardId === todo.id
            return (
              <button
                key={todo.id}
                draggable={true}
                onClick={() => onCardClick(todo.id)}
                onDragStart={(e) => handleDragStart(e, todo.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleCardDragOver(e, todo.id)}
                onDragLeave={handleCardDragLeave}
                onDrop={(e) => handleCardDrop(e, todo.id)}
                className={`w-full text-left rounded-md border cursor-grab active:cursor-grabbing transition-all duration-150 group overflow-hidden ${
                  cardSelected
                    ? 'border-accent/40 bg-accent/5 shadow-xs'
                    : 'border-border-subtle bg-surface-raised hover:border-border-default hover:shadow-xs'
                }`}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: categoryFill,
                  ...(isDropTarget && dropPos === 'before' ? { borderTop: `2px solid ${priorityColor}` } : {}),
                  ...(isDropTarget && dropPos === 'after' ? { borderBottom: `2px solid ${priorityColor}` } : {}),
                }}
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
