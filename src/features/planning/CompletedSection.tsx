/**
 * # CompletedSection — 已完成任务分组
 *
 * 可折叠，显示 "已完成 (N)"。每行勾选圆圈 + 删除线标题。
 * 点圆圈可重开（onToggle）。
 *
 * 动画：
 *   - 折叠态：数字右上跳动（新完成项计数更新）
 *   - 展开态：新条目从上方滑入（todo-done-slide-in）
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import type { Todo } from '@/domain/todo'

interface CompletedSectionProps {
  todos: Todo[]
  onToggle: (id: string) => void
}

export function CompletedSection({ todos, onToggle }: CompletedSectionProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [counterBounce, setCounterBounce] = useState(false)
  const [newTodoIds, setNewTodoIds] = useState<Set<string>>(new Set())
  const prevCountRef = useRef(todos.length)

  // ── 检测新完成的条目 → 触发动画 ──
  useEffect(() => {
    const prev = prevCountRef.current
    const curr = todos.length
    prevCountRef.current = curr

    if (curr > prev) {
      // 新条目加入了已完成列表
      const added = todos.slice(0, curr - prev).map((t) => t.id)
      // 如果展开态，标记新条目用于滑入动画
      if (!collapsed) {
        setNewTodoIds(new Set(added))
      }
      // 计数器跳动（不论折叠/展开）
      setCounterBounce(true)
      const timer = setTimeout(() => setCounterBounce(false), 400)
      // 清除新条目标记
      const clearTimer = setTimeout(() => setNewTodoIds(new Set()), 600)
      return () => {
        clearTimeout(timer)
        clearTimeout(clearTimer)
      }
    }
  }, [todos, collapsed])

  const handleToggle = useCallback(() => {
    setCollapsed((c) => !c)
  }, [])

  if (todos.length === 0) return null

  return (
    <div className="border-t border-border-subtle mt-2">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 px-4 py-3 w-full text-left text-xs font-sans text-text-tertiary hover:text-text-secondary transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <span>
          已完成 (
          <span className={counterBounce ? 'todo-counter-bounce' : ''}>
            {todos.length}
          </span>
          )
        </span>
      </button>

      {!collapsed && (
        <div className="pb-2">
          {todos.map((todo, idx) => (
            <div
              key={todo.id}
              className={`flex items-start gap-3 px-4 py-2 group ${
                newTodoIds.has(todo.id) && idx < 3 ? 'todo-done-slide-in' : ''
              }`}
            >
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
