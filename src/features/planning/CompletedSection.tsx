/**
 * # CompletedSection — 已完成任务分组
 *
 * 可折叠，显示 "已完成 (N)"。每行勾选圆圈 + 删除线标题。
 * 点圆圈可重开（onToggle）。
 */

import { useState } from 'react'
import { CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import type { Todo } from '@/domain/todo'

interface CompletedSectionProps {
  todos: Todo[]
  onToggle: (id: string) => void
}

export function CompletedSection({ todos, onToggle }: CompletedSectionProps) {
  const [collapsed, setCollapsed] = useState(true)
  if (todos.length === 0) return null

  return (
    <div className="border-t border-border-subtle mt-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 px-4 py-3 w-full text-left text-xs font-sans text-text-tertiary hover:text-text-secondary transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <span>已完成 ({todos.length})</span>
      </button>

      {!collapsed && (
        <div className="pb-2">
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-start gap-3 px-4 py-2 group">
              <button
                onClick={() => onToggle(todo.id)}
                className="mt-0.5 shrink-0 text-text-tertiary/50 hover:text-text-secondary transition-colors"
                title="重开"
              >
                <CheckCircle size={18} className="text-text-tertiary/40" />
              </button>
              <span className="flex-1 text-sm font-sans text-text-tertiary line-through">
                {todo.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
