/**
 * # DayCard — 单日卡片（七日卡片墙的核心单元）
 *
 * 每天一张浮动卡片，视觉上区分「待办区」和「已完成区」。
 * 完成待办 → 移到卡片底部已完成区（删除线），仍在当天。
 * 超 5 条自动折叠，hover 展开。
 */

import { useState, useCallback, useRef, type DragEvent } from 'react'
import type { DayGroup, Todo } from '@/domain/todo'
import { useCategoryColors } from '@/constants/categoryColors'

// ── Props ──────────────────────────────────────────────────

interface DayCardProps {
  dayGroup: DayGroup
  isToday: boolean
  selectedId: string | null
  /** 卡片的 categoryId 决定左侧色条（默认 'accent' 或从待办推断） */
  categoryId?: string
  onCardClick: (todoId: string) => void
  onComplete: (todoId: string) => void
  onUndo: (todoId: string) => void
  /** 跨日拖拽落点：将某个 todo 安排到此日 */
  onDropOnDay?: (todoId: string, targetDateTs: number) => void
  /** 日志模式：默认展开已完成区 */
  defaultDoneOpen?: boolean
  /** 日志模式：隐藏活跃待办区，只显示已完成 */
  hideActive?: boolean
}

// ── 常量 ──────────────────────────────────────────────────

const MAX_VISIBLE = 5

const PRIORITY_COLORS: Record<string, string> = {
  high: '#B53535',
  medium: '#B58A35',
  low: '#2D7D46',
}

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// ── 组件 ──────────────────────────────────────────────────

export function DayCard({
  dayGroup,
  isToday,
  selectedId,
  categoryId: forcedCategoryId,
  onCardClick,
  onComplete,
  onUndo,
  onDropOnDay,
  defaultDoneOpen,
  hideActive,
}: DayCardProps) {
  const colorMap = useCategoryColors()

  const { dateTs, dateLabel, weekday, activeTodos, doneTodos } = dayGroup
  const totalCount = activeTodos.length + doneTodos.length

  // ── 折叠状态 ──
  const [isExpanded, setIsExpanded] = useState(false)
  const [doneOpen, setDoneOpen] = useState(defaultDoneOpen ?? false)

  // 是否需要折叠
  const needsFold = activeTodos.length > MAX_VISIBLE
  const visibleActive = needsFold && !isExpanded
    ? activeTodos.slice(0, MAX_VISIBLE)
    : activeTodos
  const hiddenCount = activeTodos.length - MAX_VISIBLE

  // ── 完成动画 ──
  const [completingId, setCompletingId] = useState<string | null>(null)

  const handleComplete = useCallback((e: React.MouseEvent, todoId: string) => {
    e.stopPropagation()
    setCompletingId(todoId)
    setTimeout(() => {
      onComplete(todoId)
      setCompletingId(null)
    }, 260)
  }, [onComplete])

  // ── 拖拽 ──
  const dragOverCount = useRef(0)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragEnter = useCallback((_e: DragEvent) => {
    dragOverCount.current += 1
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((_e: DragEvent) => {
    dragOverCount.current -= 1
    if (dragOverCount.current <= 0) {
      dragOverCount.current = 0
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    dragOverCount.current = 0
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId) return
    onDropOnDay?.(sourceId, dateTs)
  }, [dateTs, onDropOnDay])

  // ── 分类色条 ──
  // 从当天待办最常见的 categoryId 推断色条，否则用 forcedCategoryId 或默认
  const dominantCatId = (() => {
    if (forcedCategoryId) return forcedCategoryId
    // 从 activeTodos 中找最常见的 categoryId
    const freq = new Map<string, number>()
    for (const t of [...activeTodos, ...doneTodos]) {
      const cid = t.categoryId ?? 'accent'
      freq.set(cid, (freq.get(cid) ?? 0) + 1)
    }
    let best = 'accent'
    let bestCount = 0
    for (const [cid, count] of freq) {
      if (count > bestCount) { best = cid; bestCount = count }
    }
    return best
  })()
  const catFill = (colorMap[dominantCatId as keyof typeof colorMap]?.fill) ?? 'var(--accent)'

  return (
    <div
      className={`flex flex-col rounded-xl border transition-all duration-200 min-h-[140px] ${
        isDragOver
          ? 'border-accent/60 bg-accent/[0.04] shadow-md ring-1 ring-accent/20'
          : isToday
            ? 'border-accent/40 bg-surface-raised shadow-card-float'
            : 'border-border-subtle/60 bg-surface-raised hover:border-border-default/60 hover:shadow-sm'
      }`}
      style={{ borderLeftWidth: 3, borderLeftColor: catFill }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── 卡片头部 ── */}
      <div className="px-4 pt-3 pb-2 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className={`font-serif text-base font-medium tracking-wide ${
            isToday ? 'text-accent' : 'text-text-primary'
          }`}>
            {WEEKDAY_NAMES[weekday]}
          </h3>
          <span className="font-mono text-[11px] text-text-quaternary">
            {dateLabel}
          </span>
        </div>
        {totalCount > 0 && (
          <span className="font-mono text-[10px] text-text-quaternary">
            {activeTodos.length}/{totalCount}
          </span>
        )}
      </div>

      {/* ── 空态 ── */}
      {totalCount === 0 && (
        <div className="flex-1 flex items-center justify-center px-4 pb-4">
          <p className="font-sans text-[11px] text-text-quaternary/50 italic select-none">
            {'无事此日'}
          </p>
        </div>
      )}

      {/* ── 待办列表 ── */}
      {totalCount > 0 && (
        <div className="px-3 pb-3 space-y-0.5">
          {/* ─ 活跃待办（日志模式下隐藏） ─ */}
          {!hideActive && visibleActive.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              isSelected={todo.id === selectedId}
              isCompleting={completingId === todo.id}
              catFill={catFill}
              onClick={() => onCardClick(todo.id)}
              onComplete={(e) => handleComplete(e, todo.id)}
            />
          ))}

          {/* 折叠提示（日志模式下隐藏） */}
          {!hideActive && needsFold && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full text-left font-sans text-[11px] text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent py-1.5 pl-2"
            >
              +{hiddenCount} 项
            </button>
          )}

          {!hideActive && needsFold && isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="w-full text-left font-sans text-[11px] text-text-quaternary hover:text-text-tertiary transition-colors cursor-pointer border-none bg-transparent py-1.5 pl-2"
            >
              收起
            </button>
          )}

          {/* ─ 分隔线 + 已完成区 ─ */}
          {doneTodos.length > 0 && (
            <>
              <div className="border-t border-border-subtle/40 my-1.5" />
              <button
                onClick={() => setDoneOpen((p) => !p)}
                className="w-full flex items-center gap-2 font-sans text-[10px] text-text-quaternary hover:text-text-tertiary transition-colors cursor-pointer border-none bg-transparent py-1"
              >
                <span className={`inline-block w-2 transition-transform ${doneOpen ? 'rotate-90' : ''}`}>
                  {'›'}
                </span>
                {'已完成'} <span className="font-mono">{doneTodos.length}</span>
              </button>

              {doneOpen && (
                <div className="space-y-0.5 mt-0.5">
                  {doneTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-sunken/60 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-30"
                        style={{ backgroundColor: catFill }}
                      />
                      <span className="flex-1 font-sans text-[11px] text-text-tertiary line-through truncate">
                        {todo.title}
                      </span>
                      <button
                        onClick={() => onUndo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] font-sans text-text-quaternary hover:text-text-secondary transition-all cursor-pointer border-none bg-transparent px-1"
                      >
                        {'撤回'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── TodoRow 子组件 ──────────────────────────────────────────

interface TodoRowProps {
  todo: Todo
  isSelected: boolean
  isCompleting: boolean
  catFill: string
  onClick: () => void
  onComplete: (e: React.MouseEvent) => void
}

function TodoRow({ todo, isSelected, isCompleting, catFill, onClick, onComplete }: TodoRowProps) {
  const priColor = PRIORITY_COLORS[todo.priority] ?? '#888'

  return (
    <button
      onClick={onClick}
      draggable={!isCompleting}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', todo.id)
        e.dataTransfer.effectAllowed = 'move'
        const el = e.currentTarget as HTMLElement
        el.style.opacity = '0.4'
      }}
      onDragEnd={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.opacity = '1'
      }}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left cursor-pointer border-none transition-all duration-150 group ${
        isCompleting
          ? 'animate-todo-complete'
          : isSelected
            ? 'bg-accent/5 shadow-xs'
            : 'bg-surface-raised hover:bg-surface-sunken/60'
      }`}
    >
      {/* 优先级色点 */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: priColor }}
      />

      {/* 标题 */}
      <span className={`flex-1 font-sans text-xs truncate min-w-0 ${
        isSelected ? 'text-text-primary font-medium' : 'text-text-primary'
      }`}>
        {todo.title}
      </span>

      {/* 完成按钮（hover 出现） */}
      <span
        onClick={onComplete}
        className="w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110 cursor-pointer flex-shrink-0"
        style={{ color: catFill }}
        title="标记完成"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    </button>
  )
}
