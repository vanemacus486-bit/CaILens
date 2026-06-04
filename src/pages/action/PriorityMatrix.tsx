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

const PRIORITIES: { id: TodoPriority; label: string; color: string }[] = [
  { id: 'high',   label: '高优先', color: '#B53535' },
  { id: 'medium', label: '中优先', color: '#B58A35' },
  { id: 'low',    label: '低优先', color: '#2D7D46' },
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
  /** 快速完成回调（带退出动画） */
  onComplete?: (todoId: string) => void
  /** 格子右键回调，传递该格的分类+优先级 */
  onCellContextMenu?: (e: React.MouseEvent, catId: string, priId: string) => void
  /** 今日聚焦 ID 集合 */
  focusIds: Set<string>
  /** 切换聚焦状态：todoId, 是否聚焦 */
  onToggleFocus: (todoId: string, isFocus: boolean) => void
}

// ── 组件 ──────────────────────────────────────────────────

export function PriorityMatrix({ grouped, selectedId, onCardClick, onReorder, onMoveToCell, onComplete, onCellContextMenu, focusIds, onToggleFocus }: PriorityMatrixProps) {
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
            <div
              key={catId}
              className="grid grid-cols-[64px_repeat(3,1fr)] gap-1.5 pl-2 rounded-l-lg"
              style={{ borderLeft: `3px solid ${cellColors?.fill ?? '#888'}` }}
            >
              {/* ── 行头：分类名 ── */}
              <div className="flex items-center justify-end gap-2 pr-2 min-h-[72px]">
                <span className="font-serif text-xs text-text-secondary leading-tight text-right tracking-wide">
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
                    isSelected={isSelected}
                    selectedId={selectedId}
                    onCardClick={onCardClick}
                    onReorder={onReorder}
                    onMoveToCell={onMoveToCell}
                    onComplete={onComplete}
                    onContextMenu={onCellContextMenu}
                    focusIds={focusIds}
                    onToggleFocus={onToggleFocus}
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
  isSelected: boolean
  selectedId: string | null
  onCardClick: (id: string) => void
  onReorder: (sourceId: string, targetId: string, position: 'before' | 'after') => void
  onMoveToCell: (sourceId: string, catId: string, priId: string) => void
  onComplete?: (todoId: string) => void
  onContextMenu?: (e: React.MouseEvent, catId: string, priId: string) => void
  focusIds: Set<string>
  onToggleFocus: (todoId: string, isFocus: boolean) => void
}

function Cell({ catId, priId, todos, categoryFill, isSelected, selectedId, onCardClick, onReorder, onMoveToCell, onComplete, onContextMenu, focusIds, onToggleFocus }: CellProps) {
  const count = todos.length

  // ── 拖拽状态 ──
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)
  const [dropPos, setDropPos] = useState<'before' | 'after' | null>(null)
  const [isCellHover, setIsCellHover] = useState(false)
  const dragEnterCount = useRef(0)

  // ── 完成动画状态 ──
  const [completingId, setCompletingId] = useState<string | null>(null)

  const handleQuickComplete = useCallback((e: React.MouseEvent, todoId: string) => {
    e.stopPropagation()
    if (!onComplete) return
    setCompletingId(todoId)
    setTimeout(() => {
      onComplete(todoId)
      setCompletingId(null)
    }, 260)
  }, [onComplete])

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
      onContextMenu={(e) => onContextMenu?.(e, catId, priId)}
    >
      {/* ── 计数徽标 ── */}
      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-mono text-[10px] font-medium text-white leading-none px-1 shadow-xs z-10"
          style={{
            backgroundColor: categoryFill,
            opacity: priId === 'high' ? 1 : priId === 'medium' ? 0.65 : 0.35,
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}

      {/* ── 空态 — 虚线暗示可拖入 ── */}
      {count === 0 && (
        <div
          className="flex items-center justify-center h-full min-h-[56px] rounded-md border border-dashed transition-colors duration-200"
          style={{ borderColor: `${categoryFill}20` }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: `${categoryFill}30` }}
          />
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
            const isCompleting = completingId === todo.id
            const isFocus = focusIds.has(todo.id)
            const hasNoDueDate = todo.dueDate === null
            const isDoneFocus = isFocus && todo.status === 'done'
            return (
              <button
                key={todo.id}
                draggable={!isCompleting}
                onClick={() => onCardClick(todo.id)}
                onDragStart={(e) => handleDragStart(e, todo.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleCardDragOver(e, todo.id)}
                onDragLeave={handleCardDragLeave}
                onDrop={(e) => handleCardDrop(e, todo.id)}
                className={`w-full text-left rounded-md border cursor-grab active:cursor-grabbing transition-all duration-150 group overflow-hidden default-border ${
                  isCompleting
                    ? 'animate-todo-complete'
                    : isDoneFocus
                      ? 'border-accent/20 bg-accent/[0.02] opacity-60'
                      : isFocus
                        ? 'border-accent/60 bg-accent/[0.06] shadow-sm ring-1 ring-accent/20'
                        : cardSelected
                          ? 'border-accent/40 bg-accent/5 shadow-xs'
                          : hasNoDueDate
                            ? 'border-border-subtle bg-surface-raised hover:border-border-default hover:shadow-xs opacity-65'
                            : 'border-border-subtle bg-surface-raised hover:border-border-default hover:shadow-xs'
                }`}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: categoryFill,
                  ...(isDropTarget && dropPos === 'before' ? { borderTop: '2px solid var(--accent)' } : {}),
                  ...(isDropTarget && dropPos === 'after' ? { borderBottom: '2px solid var(--accent)' } : {}),
                }}
              >
                <div className="px-2.5 py-2 relative">
                  {/* 标题 + 今日标签 */}
                  <div className="font-sans text-[12px] leading-tight truncate pr-7 flex items-center gap-1.5">
                    {isFocus && (
                      <span className="inline-flex items-center px-1.5 py-[1px] rounded-full text-[8px] font-medium leading-none flex-shrink-0"
                        style={{ backgroundColor: categoryFill + '20', color: categoryFill, opacity: isDoneFocus ? 0.6 : 1 }}>
                        {'今日'}
                      </span>
                    )}
                    <span className={isDoneFocus ? 'line-through text-text-tertiary truncate' : 'text-text-primary truncate'}>
                      {todo.title}
                    </span>
                  </div>

                  {/* hover 时出现的操作按钮 */}
                  {!isCompleting && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150">
                      {/* 聚焦切换按钮 */}
                      <span
                        onClick={(e) => { e.stopPropagation(); onToggleFocus(todo.id, !isFocus) }}
                        className="w-5 h-5 flex items-center justify-center rounded-full hover:scale-110 cursor-pointer"
                        style={{ color: isFocus ? categoryFill : 'var(--text-quaternary)' }}
                        title={isFocus ? '取消今日聚焦' : '标记为今日聚焦'}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill={isFocus ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      </span>
                      {/* 完成按钮 */}
                      {onComplete && (
                        <span
                          onClick={(e) => handleQuickComplete(e, todo.id)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:scale-110 cursor-pointer"
                          style={{ color: categoryFill }}
                          title="标记完成"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </div>
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


