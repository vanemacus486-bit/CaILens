/**
 * # TodoItem — 单个待办组件
 *
 * 精简版：checkbox + 标题 + 编辑/删除。无优先级/截止日期/备注。
 */

import { useState, useCallback } from 'react'
import {
  Circle,
  CheckCircle2,
  Trash2,
  Pencil,
} from 'lucide-react'
import type { Todo } from '@/domain/todo'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onUpdate: (id: string, updates: { title?: string }) => void
  onDelete: (id: string) => void
}

export function TodoItem({ todo, onToggle, onUpdate, onDelete }: TodoItemProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)

  const isDone = todo.status === 'done'

  const handleSave = useCallback(() => {
    const trimmed = editTitle.trim()
    if (!trimmed) return
    onUpdate(todo.id, { title: trimmed })
    setEditing(false)
  }, [editTitle, todo.id, onUpdate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Escape') {
        setEditing(false)
        setEditTitle(todo.title)
      }
    },
    [handleSave, todo.title],
  )

  // ── 编辑态 ──
  if (editing) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-raised p-4 space-y-3">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full bg-transparent border-none outline-none font-serif text-sm font-medium text-text-primary placeholder:text-text-quaternary"
          placeholder={'待办标题'}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => {
              setEditing(false)
              setEditTitle(todo.title)
            }}
            className="h-7 px-3 rounded-md text-xs font-sans text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
          >
            {'取消'}
          </button>
          <button
            onClick={handleSave}
            className="h-7 px-3 rounded-md text-xs font-sans font-medium bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer border-none"
          >
            {'保存'}
          </button>
        </div>
      </div>
    )
  }

  // ── 显示态 ──
  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 rounded-xl transition-colors duration-200 hover:bg-surface-sunken ${
        isDone ? 'opacity-55' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo.id)}
        className="mt-0.5 flex-shrink-0 cursor-pointer bg-transparent border-none transition-colors duration-200"
        aria-label={isDone ? '标记未完成' : '标记完成'}
      >
        {isDone ? (
          <CheckCircle2 size={18} strokeWidth={1.75} className="text-accent" />
        ) : (
          <Circle size={18} strokeWidth={1.75} className="text-text-tertiary group-hover:text-text-secondary" />
        )}
      </button>

      {/* 标题 */}
      <div className="flex-1 min-w-0 flex items-center">
        <span
          className={`font-serif text-sm ${
            isDone ? 'line-through text-text-tertiary' : 'text-text-primary'
          }`}
        >
          {todo.title}
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
        <button
          onClick={() => {
            setEditing(true)
            setEditTitle(todo.title)
          }}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer border-none bg-transparent"
          aria-label={'编辑'}
        >
          <Pencil size={13} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-[#B53535] hover:bg-surface-raised transition-colors cursor-pointer border-none bg-transparent"
          aria-label={'删除'}
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
