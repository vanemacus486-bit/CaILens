/**
 * # InboxTaskList — 收件箱待办列表
 *
 * 展示未分配优先级/领域的收件箱任务。
 * 支持：快速添加（回车保存）、勾选完成、HTML5 拖拽。
 */

import { useState, useCallback, useRef } from 'react'
import type { Todo } from '@/domain/todo'
import { fireAndForget } from '@/lib/fireAndForget'
import { SHORTCUT_REGISTRY, bindingToDisplayString } from '@/domain/shortcuts'

// ── Props ──────────────────────────────────────────────────

interface InboxTaskListProps {
  tasks: Todo[]
  /** 添加任务（组件内部用 fireAndForget 包装） */
  onAdd: (title: string) => Promise<void>
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

// ── 常量 ──────────────────────────────────────────────────

const DRAG_TYPE = 'application/x-callens-task'

// ── 组件 ──────────────────────────────────────────────────

export function InboxTaskList({ tasks, onAdd, onComplete, onDelete }: InboxTaskListProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())

  const quickCaptureShortcut = bindingToDisplayString(SHORTCUT_REGISTRY.quickCaptureTodo.defaultBinding)

  const handleAdd = useCallback(() => {
    const trimmed = draft.trim()
    if (!trimmed) return
    fireAndForget(onAdd(trimmed), 'inbox task add')
    setDraft('')
  }, [draft, onAdd])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }, [handleAdd])

  const handleComplete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setCompletingIds((prev) => new Set(prev).add(id))
    fireAndForget(onComplete(id), 'inbox task complete')
    setTimeout(() => {
      setCompletingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 260)
  }, [onComplete])

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    fireAndForget(onDelete(id), 'inbox task delete')
  }, [onDelete])

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ taskId: id }))
    e.dataTransfer.effectAllowed = 'move'
    // 半透明拖拽幽灵
    setTimeout(() => {
      const ghost = (e.target as HTMLElement).cloneNode(true) as HTMLElement
      ghost.style.opacity = '0.5'
      ghost.style.pointerEvents = 'none'
      e.dataTransfer.setDragImage(ghost, 0, 0)
    }, 0)
  }, [])

  return (
    <section className="space-y-2">
      {/* 标题 */}
      <h2 className="font-serif text-sm font-medium text-text-primary flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-accent/60" />
        {'收件箱'}
        {tasks.length > 0 && (
          <span className="font-mono text-[10px] text-text-quaternary font-normal">
            {tasks.length}
          </span>
        )}
      </h2>

      {/* 快速添加输入框 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="快速添加…"
          className="w-full text-xs font-sans text-text-primary bg-surface-base border border-border-subtle rounded-md px-2.5 py-1.5 placeholder:text-text-quaternary focus:outline-none focus:border-accent/40 transition-colors duration-150"
        />
        {draft.trim() && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-quaternary font-sans pointer-events-none">
            {'⏎'}
          </span>
        )}
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <p className="font-sans text-xs text-text-quaternary py-2">
          {'按 '}{quickCaptureShortcut}{' 随手记一条'}
        </p>
      ) : (
        <div className="space-y-0.5">
          {tasks.map((task) => {
            const isCompleting = completingIds.has(task.id)

            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing hover:bg-surface-raised transition-all duration-150 ${
                  isCompleting ? 'animate-todo-complete' : ''
                }`}
              >
                {/* 复选框 */}
                <button
                  onClick={(e) => handleComplete(e, task.id)}
                  className={`flex-shrink-0 w-4 h-4 rounded border border-border-subtle flex items-center justify-center transition-colors duration-150 hover:border-accent/50 ${
                    task.status === 'done'
                      ? 'bg-accent/70 border-accent/70'
                      : 'bg-surface-base group-hover:border-border-default'
                  }`}
                >
                  {task.status === 'done' && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* 标题 */}
                <span
                  className={`flex-1 font-sans text-xs truncate min-w-0 transition-all duration-150 ${
                    task.status === 'done'
                      ? 'line-through text-text-tertiary'
                      : 'text-text-primary'
                  }`}
                >
                  {task.title}
                </span>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => handleDelete(e, task.id)}
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-60 hover:opacity-100 transition-all duration-150 cursor-pointer"
                  title="删除"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
