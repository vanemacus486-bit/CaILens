/**
 * # InboxCard — 未分配待办收件箱
 *
 * 显示 goalId === null 的待办（未关联任何目标的"散件"）。
 * 来源是 todoStore（与 N 快速记录同一个 store），所以快速记录新建的
 * 待办会实时出现在这里，不再"落地无处"。
 *
 * 每行支持：勾选完成 / 双击重命名 / 删除 / 「归到目标」下拉一键挂靠。
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Plus, Check, Trash2, Inbox } from 'lucide-react'
import type { Goal } from '@/domain/goal'
import { getMainGoals, getChildren } from '@/domain/goal'
import type { Todo } from '@/domain/todo'

interface InboxCardProps {
  todos: Todo[]
  goals: Goal[]
  onAdd: (title: string) => Promise<void>
  onToggle: (todoId: string) => void
  onDelete: (todoId: string) => void
  onRename: (todoId: string, newTitle: string) => void
  onAssign: (todoId: string, goalId: string) => void
}

export function InboxCard({ todos, goals, onAdd, onToggle, onDelete, onRename, onAssign }: InboxCardProps) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  // 活动在前、完成在后，各自按 sortOrder
  const sorted = useMemo(
    () =>
      [...todos].sort((a, b) => {
        const aDone = a.status === 'done' ? 1 : 0
        const bDone = b.status === 'done' ? 1 : 0
        if (aDone !== bDone) return aDone - bDone
        return a.sortOrder - b.sortOrder
      }),
    [todos],
  )

  // 「归到目标」下拉选项：主目标 + 缩进的子目标
  const goalOptions = useMemo(() => {
    const out: { id: string; label: string }[] = []
    const walk = (g: Goal, depth: number) => {
      out.push({ id: g.id, label: `${'　'.repeat(depth)}${g.title}` })
      for (const c of getChildren(goals, g.id)) walk(c, depth + 1)
    }
    for (const m of getMainGoals(goals)) walk(m, 0)
    return out
  }, [goals])

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 0)
  }, [adding])

  useEffect(() => {
    if (editingId) setTimeout(() => editRef.current?.focus(), 0)
  }, [editingId])

  const submit = useCallback(async () => {
    const val = value.trim()
    setValue('')
    setAdding(false)
    if (val) await onAdd(val)
  }, [value, onAdd])

  const saveEdit = useCallback(
    (todoId: string) => {
      const val = editValue.trim()
      setEditingId(null)
      setEditValue('')
      if (val) {
        const original = todos.find((t) => t.id === todoId)
        if (original && val !== original.title) onRename(todoId, val)
      }
    },
    [editValue, todos, onRename],
  )

  return (
    <div className="rm-card">
      {/* 头部 */}
      <div className="rm-card-head">
        <div className="rm-card-head-left">
          <Inbox size={18} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
          <span className="rm-card-title">未分配</span>
          <span className="rm-progress-count">{todos.length}</span>
        </div>
        <button className="rm-icon-btn" title="加任务" onClick={() => setAdding(true)}>
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {/* 任务列表 */}
      <div className="rm-task-list">
        {adding && (
          <div className="rm-task-row">
            <span className="rm-task-check-slot" />
            <input
              ref={inputRef}
              className="rm-task-input"
              placeholder="新任务…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                else if (e.key === 'Escape') {
                  setAdding(false)
                  setValue('')
                }
              }}
              onBlur={submit}
            />
          </div>
        )}

        {sorted.map((t) => (
          <div key={t.id} className="rm-task-row">
            <button
              className={`rm-task-check ${t.status === 'done' ? 'rm-task-check-done' : ''}`}
              style={t.status === 'done' ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}
              onClick={() => onToggle(t.id)}
            >
              {t.status === 'done' && <Check size={11} strokeWidth={3} color="#fff" />}
            </button>

            {editingId === t.id ? (
              <input
                ref={editRef}
                className="rm-task-input rm-task-edit-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(t.id)
                  else if (e.key === 'Escape') {
                    setEditingId(null)
                    setEditValue('')
                  }
                }}
                onBlur={() => saveEdit(t.id)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className={`rm-task-title ${t.status === 'done' ? 'rm-task-title-done' : ''}`}
                onDoubleClick={() => {
                  setEditingId(t.id)
                  setEditValue(t.title)
                }}
              >
                {t.title}
              </span>
            )}

            {goalOptions.length > 0 && (
              <select
                className="rm-assign-select"
                value=""
                title="归到目标"
                onChange={(e) => {
                  if (e.target.value) onAssign(t.id, e.target.value)
                }}
              >
                <option value="" disabled>
                  归到…
                </option>
                {goalOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}

            <button className="rm-task-del" title="删除" onClick={() => onDelete(t.id)}>
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}

        {!adding && sorted.length === 0 && (
          <div className="rm-task-empty">没有未分配的待办</div>
        )}
      </div>
    </div>
  )
}
