/**
 * # OrphanTodoList — 独立待办紧凑列表
 *
 * 展示未归属任何项目的待办。
 * 极简设计：分类色点 + 标题 + hover 完成勾。
 * 逾期：色点变红。点击：打开编辑弹框。
 */

import { useState, useCallback } from 'react'
import type { Todo } from '@/domain/todo'
import { useCategoryColors } from '@/constants/categoryColors'

// ── Props ──────────────────────────────────────────────────

interface OrphanTodoListProps {
  todos: Todo[]
  onCardClick: (todoId: string, e: React.MouseEvent) => void
  onComplete: (todoId: string) => void
}

// ── 组件 ──────────────────────────────────────────────────

export function OrphanTodoList({ todos, onCardClick, onComplete }: OrphanTodoListProps) {
  const colorMap = useCategoryColors()
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())

  const handleComplete = useCallback((e: React.MouseEvent, todoId: string) => {
    e.stopPropagation()
    setCompletingIds((prev) => new Set(prev).add(todoId))
    setTimeout(() => {
      onComplete(todoId)
      setCompletingIds((prev) => {
        const next = new Set(prev)
        next.delete(todoId)
        return next
      })
    }, 260)
  }, [onComplete])

  if (todos.length === 0) {
    return (
      <section>
        <h2 className="font-serif text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-text-quaternary/30" />
          {'待办'}
        </h2>
        <p className="font-sans text-xs text-text-quaternary py-2">
          暂无待办，可通过快捷键快速录入
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="font-serif text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-text-quaternary/30" />
        {'待办'}
        <span className="font-mono text-[10px] text-text-quaternary font-normal">
          {todos.length}
        </span>
      </h2>

      <div className="space-y-1">
        {todos.map((todo) => {
          const catFill = colorMap[(todo.categoryId ?? 'accent') as keyof typeof colorMap]?.fill ?? '#888'
          const isCompleting = completingIds.has(todo.id)
          const isOverdue = todo.dueDate != null && todo.dueDate < Date.now()

          return (
            <button
              key={todo.id}
              onClick={(e) => onCardClick(todo.id, e)}
              className={`w-full flex items-center gap-3 pl-2 pr-3 py-2.5 rounded-lg text-left cursor-pointer border-none bg-surface-raised hover:bg-surface-raised transition-all duration-150 group hover:translate-y-[-1px] hover:shadow-sm ${
                isCompleting ? 'animate-todo-complete' : ''
              }`}
              style={{ borderLeft: `3px solid ${catFill}30` }}
            >
              {/* 分类色点（逾期变红） */}
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-200"
                style={{
                  backgroundColor: isOverdue ? '#B53535' : catFill,
                }}
              />

              {/* 标题 */}
              <span className="flex-1 font-sans text-xs text-text-primary truncate min-w-0">
                {todo.title}
              </span>

              {/* hover 完成勾 */}
              {!isCompleting && (
                <span
                  onClick={(e) => handleComplete(e, todo.id)}
                  className="w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110 cursor-pointer flex-shrink-0"
                  style={{ color: catFill }}
                  title="标记完成"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
