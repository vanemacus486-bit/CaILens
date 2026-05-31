/**
 * # CompletedLog — 每日完成日志
 *
 * 按日期倒序展示已完成待办，查看"每天都划掉了什么任务"。
 * 数据由 `groupTodosByCompletionDate` 分组，渲染为日期标题 + 任务列表。
 */

import type { Todo } from '@/domain/todo'
import { groupTodosByCompletionDate } from '@/domain/todo'

// ── Props ──────────────────────────────────────────────────

interface CompletedLogProps {
  todos: Todo[]
  /** 撤回完成（toggleComplete） */
  onUndo: (todoId: string) => void
}

// ── 组件 ──────────────────────────────────────────────────

export function CompletedLog({ todos, onUndo }: CompletedLogProps) {
  const groups = groupTodosByCompletionDate(todos)

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-quaternary">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <p className="font-sans text-sm text-text-tertiary">
          {'暂无完成记录'}
        </p>
        <p className="font-sans text-[11px] text-text-quaternary mt-1">
          {'完成待办后，会在这里按日期归档'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {groups.map((group) => (
        <div key={group.dateTs} className="border-b border-border-subtle/40 last:border-b-0">
          {/* ── 日期标题 ── */}
          <div className="sticky top-0 bg-surface-raised/95 backdrop-blur-sm px-1 py-2.5 z-10">
            <h3 className="font-serif text-sm text-text-primary tracking-wide">
              {group.dateLabel}
            </h3>
            <span className="font-mono text-[10px] text-text-quaternary ml-1">
              {group.todos.length} 项
            </span>
          </div>

          {/* ── 任务列表 ── */}
          <div className="pb-2 space-y-0.5">
            {group.todos.map((todo) => {
              const catColor = todo.categoryId
                ? `var(--event-${todo.categoryId}-fill)`
                : 'var(--text-quaternary)'

              return (
                <div
                  key={todo.id}
                  className="group flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-sunken/60 transition-colors"
                >
                  {/* 分类色点 */}
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: catColor }}
                  />

                  {/* 标题（删除线） */}
                  <span className="flex-1 font-sans text-xs text-text-tertiary line-through truncate">
                    {todo.title}
                  </span>

                  {/* 撤回按钮（hover 出现） */}
                  <button
                    onClick={() => onUndo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-[10px] font-sans text-text-quaternary hover:text-text-secondary transition-all cursor-pointer border-none bg-transparent px-1"
                  >
                    {'撤回'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
