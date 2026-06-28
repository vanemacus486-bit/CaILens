/**
 * # TaskRow — 单行任务（完成勾选 + 标题 + 到期 chip + 内联编辑 + 拖拽排序）
 *
 * 点圆圈 → toggleComplete；点行 → 展开内联编辑。
 * 过期显示 danger 色；今天/明天显示文案。
 * sortMode === 'manual' 时启用 HTML5 拖拽重排。
 */

import { useState, useCallback, useRef, useEffect, type KeyboardEvent, type DragEvent, type MouseEvent } from 'react'
import { Circle, CheckCircle, ChevronDown, ChevronRight, Star, GripVertical, Trash2 } from 'lucide-react'
import type { Todo } from '@/domain/todo'
import { formatDueDateChip } from '@/domain/todoDateLabels'
import { DatePickerPopover } from '@/components/ui/DatePickerPopover'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import type { SortMode } from './ListHeader'

interface TaskRowProps {
  todo: Todo
  now: number
  sortMode?: SortMode
  onReorder?: (draggedId: string, targetId: string, position: 'before' | 'after') => void
  onToggle: (id: string) => void
  onUpdate: (id: string, patch: Partial<Pick<Todo, 'title' | 'description' | 'dueDate' | 'repeatPattern' | 'isStarred'>>) => void
  onDelete: (id: string) => void
}

export function TaskRow({ todo, now, sortMode = 'manual', onReorder, onToggle, onUpdate, onDelete }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [titleDraft, setTitleDraft] = useState(todo.title)
  const [descDraft, setDescDraft] = useState(todo.description)
  const titleRef = useRef<HTMLInputElement>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const skipCommitRef = useRef(false)
  const titleAreaRef = useRef<HTMLDivElement>(null)
  const lastClickRef = useRef<number>(0)
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDone = todo.status === 'done'
  const dragEnabled = !isDone && sortMode === 'manual' && !!onReorder

  // ── 拖拽状态 ──
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | null>(null)

  // Sync drafts when todo changes
  useEffect(() => { setTitleDraft(todo.title) }, [todo.title])
  useEffect(() => { setDescDraft(todo.description) }, [todo.description])

  // Auto-focus + select when entering inline edit mode
  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
    }
  }, [editingTitle])

  // Cleanup expand timer on unmount
  useEffect(() => () => { if (expandTimerRef.current) clearTimeout(expandTimerRef.current) }, [])

  const commitTitle = useCallback(() => {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== todo.title) {
      onUpdate(todo.id, { title: trimmed })
    } else if (!trimmed) {
      onDelete(todo.id)
    } else {
      setTitleDraft(todo.title)
    }
  }, [titleDraft, todo.id, todo.title, onUpdate, onDelete])

  const commitDesc = useCallback(() => {
    if (descDraft !== todo.description) {
      onUpdate(todo.id, { description: descDraft })
    }
  }, [descDraft, todo.id, todo.description, onUpdate])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      titleRef.current?.blur()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      skipCommitRef.current = true
      setTitleDraft(todo.title)
      titleRef.current?.blur()
    }
  }, [todo.title])

  const handleRowClick = useCallback((e: MouseEvent) => {
    if (expanded || editingTitle) return
    // ── 手动双击检测（不用浏览器原生 dblclick，Tauri webview 不可靠）──
    const isOnTitle = titleAreaRef.current?.contains(e.target as Node) ?? false
    const now = Date.now()
    const dt = now - lastClickRef.current
    lastClickRef.current = now
    if (isOnTitle && dt < 400) {
      // 快速双击标题区 → 就地改名
      if (expandTimerRef.current) { clearTimeout(expandTimerRef.current); expandTimerRef.current = null }
      setTitleDraft(todo.title)
      setEditingTitle(true)
      return
    }
    // ── 单击 → 延迟展开面板 ──
    if (expandTimerRef.current) clearTimeout(expandTimerRef.current)
    expandTimerRef.current = setTimeout(() => {
      setExpanded(true)
      expandTimerRef.current = null
    }, 200)
  }, [expanded, editingTitle, todo.title])

  const handleToggleRepeat = useCallback(() => {
    onUpdate(todo.id, { repeatPattern: todo.repeatPattern ? null : 'daily' })
  }, [todo.id, todo.repeatPattern, onUpdate])

  const chipLabel = formatDueDateChip(todo.dueDate, now)
  const isOverdue = todo.dueDate !== null && todo.dueDate < new Date(now).setHours(0, 0, 0, 0)

  // ── 拖拽事件处理 ──
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', todo.id)
    e.dataTransfer.effectAllowed = 'move'
    // 半透明反馈
    if (rowRef.current) {
      rowRef.current.style.opacity = '0.4'
    }
  }, [todo.id])

  const handleDragEnd = useCallback(() => {
    setDragOverPosition(null)
    if (rowRef.current) {
      rowRef.current.style.opacity = ''
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    // 根据鼠标在行内的 Y 坐标判定 before/after
    const rect = rowRef.current?.getBoundingClientRect()
    if (!rect) return
    const y = e.clientY - rect.top
    const threshold = rect.height * 0.4
    setDragOverPosition(y < threshold ? 'before' : 'after')
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverPosition(null)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOverPosition(null)
    const draggedId = e.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === todo.id) return
    const position = dragOverPosition ?? 'after'
    onReorder?.(draggedId, todo.id, position)
  }, [todo.id, dragOverPosition, onReorder])

  if (isDone) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex items-start gap-3 px-4 py-2 group">
            <button
              onClick={() => onToggle(todo.id)}
              className="mt-0.5 shrink-0 text-text-tertiary/50 hover:text-text-secondary transition-colors"
              title="重开"
            >
              <CheckCircle size={18} className="text-text-tertiary/40" />
            </button>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-sans text-text-tertiary line-through">{todo.title}</span>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={() => onDelete(todo.id)}
            className="text-danger focus:bg-danger/10 focus:text-danger"
          >
            <Trash2 size={14} />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  return (
    <div
      ref={rowRef}
      className={`group relative ${dragEnabled ? 'cursor-default' : ''}`}
      draggable={dragEnabled}
      onDragStart={dragEnabled ? handleDragStart : undefined}
      onDragEnd={dragEnabled ? handleDragEnd : undefined}
      onDragOver={dragEnabled ? handleDragOver : undefined}
      onDragLeave={dragEnabled ? handleDragLeave : undefined}
      onDrop={dragEnabled ? handleDrop : undefined}
    >
      {/* ── 拖拽指示线 ── */}
      {dragOverPosition && (
        <div
          className={`absolute left-4 right-4 h-0.5 bg-accent z-10 pointer-events-none rounded-full ${
            dragOverPosition === 'before' ? '-top-0.5' : '-bottom-0.5'
          }`}
        />
      )}

      {/* ── 任务行（未完成） ── */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`flex items-start gap-1.5 px-4 py-2.5 rounded-lg transition-colors
              ${dragEnabled ? 'hover:bg-surface-sunken/40' : ''}
              ${expanded ? '' : 'cursor-pointer hover:bg-surface-sunken/40'}`}
            onClick={handleRowClick}
          >
            {/* 拖拽手柄（仅 manual 排序显示） */}
            {dragEnabled && (
              <div className="mt-1 shrink-0 text-text-quaternary/30 group-hover:text-text-tertiary/60 transition-colors cursor-grab active:cursor-grabbing">
                <GripVertical size={14} strokeWidth={1.5} />
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onToggle(todo.id) }}
              className="mt-0.5 shrink-0 text-text-tertiary/60 hover:text-accent transition-colors"
              title="标记完成"
            >
              <Circle size={18} />
            </button>

            <div className="flex-1 min-w-0" ref={titleAreaRef}>
              {editingTitle ? (
                <input
                  ref={titleRef}
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    if (skipCommitRef.current) {
                      skipCommitRef.current = false
                    } else {
                      commitTitle()
                    }
                    setEditingTitle(false)
                  }}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="标题"
                  className="w-full bg-transparent border-none focus-visible:outline-none text-sm font-sans text-text-primary placeholder:text-text-tertiary"
                />
              ) : (
                <span
                  className="text-sm font-sans text-text-primary"
                >{todo.title}</span>
              )}
              {todo.dueDate && (
                <span
                  className={`ml-2 inline-flex items-center text-[11px] font-sans px-1.5 py-0.5 rounded-full
                    ${isOverdue ? 'bg-danger/10 text-danger' : 'bg-surface-sunken text-text-tertiary'}`}
                >
                  {chipLabel}
                </span>
              )}
              {todo.description && !expanded && (
                <div className="text-xs font-sans text-text-tertiary mt-0.5 truncate">{todo.description}</div>
              )}
              {todo.repeatPattern && (
                <span className="ml-1 text-[10px] text-text-quaternary font-sans">⟳每日</span>
              )}
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onUpdate(todo.id, { isStarred: !todo.isStarred }) }}
              className={`shrink-0 transition-colors ${todo.isStarred ? 'text-accent' : 'text-text-quaternary/40 hover:text-accent'}`}
              title={todo.isStarred ? '取消星标' : '星标'}
            >
              <Star size={14} fill={todo.isStarred ? 'currentColor' : 'none'} strokeWidth={1.75} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
              className="shrink-0 text-text-quaternary/50 hover:text-text-tertiary transition-colors"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={() => onDelete(todo.id)}
            className="text-danger focus:bg-danger/10 focus:text-danger"
          >
            <Trash2 size={14} />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* ── 内联编辑区 ── */}
      {expanded && (
        <div className="px-4 pb-3 pl-[52px] space-y-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={commitDesc}
            placeholder="详细信息"
            className="w-full bg-transparent border-none focus-visible:outline-none text-xs font-sans text-text-secondary placeholder:text-text-tertiary"
          />

          {/* 快捷日期 + 重复 */}
          <div className="flex items-center gap-2 flex-wrap">
            {chipLabel && (
              <button
                onClick={() => onUpdate(todo.id, { dueDate: null })}
                className={`text-[11px] font-sans px-2 py-0.5 rounded-full
                  ${isOverdue ? 'bg-danger/10 text-danger' : 'bg-surface-sunken text-text-tertiary'}
                  hover:opacity-70 transition-opacity`}
              >
                {chipLabel} ×
              </button>
            )}
            <button
              onClick={(e) => {
                // Toggle tomorrow
                const tomorrow = new Date(now).setHours(0, 0, 0, 0) + 86400000
                e.stopPropagation()
                onUpdate(todo.id, { dueDate: tomorrow })
              }}
              className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-surface-sunken text-text-tertiary hover:bg-accent/10 hover:text-accent transition-colors"
            >
              明天
            </button>
            <DatePickerPopover
              value={todo.dueDate}
              onChange={(d) => onUpdate(todo.id, { dueDate: d })}
              trigger={
                <button className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-surface-sunken text-text-tertiary hover:bg-accent/10 hover:text-accent transition-colors">
                  🕐
                </button>
              }
            />
            <button
              onClick={handleToggleRepeat}
              className={`text-[11px] font-sans px-2 py-0.5 rounded-full transition-colors
                ${todo.repeatPattern
                  ? 'bg-accent/10 text-accent'
                  : 'bg-surface-sunken text-text-tertiary hover:bg-accent/10 hover:text-accent'}`}
            >
              ⇄ {todo.repeatPattern ? '每日重复' : '每日重复'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
