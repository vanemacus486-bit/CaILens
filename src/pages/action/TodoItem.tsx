/**
 * # TodoItem — 单个待办组件
 *
 * 显示行（checkbox + 标题 + 优先级标识 + 截止日期）+ 内联编辑态。
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Circle,
  CheckCircle2,
  Trash2,
  Pencil,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { Todo, TodoPriority } from '@/domain/todo'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onUpdate: (id: string, updates: { title?: string; description?: string; priority?: TodoPriority; dueDate?: number | null }) => void
  onDelete: (id: string) => void
}

const PRIORITY_COLORS: Record<TodoPriority, string> = {
  high:   '#c47a5a',
  medium: '#a8986e',
  low:    '#8e8e8e',
}

const PRIORITY_LABELS_ZH: Record<TodoPriority, string> = {
  high:   '高',
  medium: '中',
  low:    '低',
}

const PRIORITY_LABELS_EN: Record<TodoPriority, string> = {
  high:   'High',
  medium: 'Med',
  low:    'Low',
}

export function TodoItem({ todo, onToggle, onUpdate, onDelete }: TodoItemProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDesc, setEditDesc] = useState(todo.description)
  const [editPriority, setEditPriority] = useState(todo.priority)
  const [editDueDate, setEditDueDate] = useState(
    todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 10) : '',
  )

  const isDone = todo.status === 'done'
  const isOverdue = useMemo(
    () => !isDone && todo.dueDate !== null && todo.dueDate < Date.now(),
    [isDone, todo.dueDate],
  )
  const priorityColor = PRIORITY_COLORS[todo.priority]

  const handleSave = useCallback(() => {
    const trimmed = editTitle.trim()
    if (!trimmed) return
    onUpdate(todo.id, {
      title: trimmed,
      description: editDesc.trim(),
      priority: editPriority,
      dueDate: editDueDate ? new Date(editDueDate + 'T23:59:59').getTime() : null,
    })
    setEditing(false)
  }, [editTitle, editDesc, editPriority, editDueDate, todo.id, onUpdate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Escape') {
        setEditing(false)
        setEditTitle(todo.title)
        setEditDesc(todo.description)
        setEditPriority(todo.priority)
        setEditDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 10) : '')
      }
    },
    [handleSave, todo],
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
          placeholder={t('待办标题', 'Todo title')}
        />
        <textarea
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          rows={2}
          className="w-full bg-surface-sunken rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-sans text-text-secondary placeholder:text-text-quaternary outline-none resize-none focus:border-accent"
          placeholder={t('描述（可选）', 'Description (optional)')}
        />
        <div className="flex items-center gap-3 flex-wrap">
          {/* 优先级 */}
          <div className="flex items-center gap-1.5">
            <span className="font-sans text-[10px] text-text-tertiary">{t('优先级:', 'Priority:')}</span>
            {(['high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setEditPriority(p)}
                className={`h-6 px-2 rounded text-[10px] font-medium font-sans transition-colors cursor-pointer border ${
                  editPriority === p
                    ? 'border-border-default text-text-primary bg-surface-sunken'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                  style={{ backgroundColor: PRIORITY_COLORS[p] }}
                />
                {language === 'zh' ? PRIORITY_LABELS_ZH[p] : PRIORITY_LABELS_EN[p]}
              </button>
            ))}
          </div>
          {/* 截止日期 */}
          <div className="flex items-center gap-1.5">
            <span className="font-sans text-[10px] text-text-tertiary">{t('截止:', 'Due:')}</span>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="h-6 px-1.5 rounded border border-border-subtle bg-transparent font-sans text-[10px] text-text-primary outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => setEditing(false)}
            className="h-7 px-3 rounded-md text-xs font-sans text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
          >
            {t('取消', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            className="h-7 px-3 rounded-md text-xs font-sans font-medium bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer border-none"
          >
            {t('保存', 'Save')}
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
        aria-label={isDone ? t('标记未完成', 'Mark incomplete') : t('标记完成', 'Mark done')}
      >
        {isDone ? (
          <CheckCircle2 size={18} strokeWidth={1.75} className="text-accent" />
        ) : (
          <Circle size={18} strokeWidth={1.75} className="text-text-tertiary group-hover:text-text-secondary" />
        )}
      </button>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* 优先级圆点 */}
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: priorityColor }}
          />
          {/* 标题 */}
          <span
            className={`font-serif text-sm ${
              isDone ? 'line-through text-text-tertiary' : 'text-text-primary'
            }`}
          >
            {todo.title}
          </span>
          {/* 截止日期 */}
          {todo.dueDate && (
            <span
              className={`inline-flex items-center gap-0.5 font-sans text-[10px] ${
                isOverdue ? 'text-[#B53535]' : 'text-text-quaternary'
              }`}
            >
              {isOverdue ? (
                <AlertCircle size={10} strokeWidth={1.75} />
              ) : (
                <Clock size={10} strokeWidth={1.75} />
              )}
              {new Date(todo.dueDate).toLocaleDateString(
                language === 'zh' ? 'zh-CN' : 'en-US',
                { month: 'short', day: 'numeric' },
              )}
            </span>
          )}
          {/* 进行中标识 */}
          {todo.status === 'in_progress' && (
            <span className="font-sans text-[10px] text-accent bg-accent-light px-1.5 py-0.5 rounded">
              {t('进行中', 'In Progress')}
            </span>
          )}
        </div>
        {/* 描述 */}
        {todo.description && (
          <p className="font-sans text-xs text-text-tertiary mt-1 line-clamp-2">
            {todo.description}
          </p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
        <button
          onClick={() => {
            setEditing(true)
            setEditTitle(todo.title)
            setEditDesc(todo.description)
            setEditPriority(todo.priority)
            setEditDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 10) : '')
          }}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer border-none bg-transparent"
          aria-label={t('编辑', 'Edit')}
        >
          <Pencil size={13} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-[#B53535] hover:bg-surface-raised transition-colors cursor-pointer border-none bg-transparent"
          aria-label={t('删除', 'Delete')}
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
