import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Plus, Check, Trash2, CheckSquare, GripVertical } from 'lucide-react'
import type { Goal } from '@/domain/goal'
import type { Todo } from '@/domain/todo'
import { ProgressBar } from '@/components/ui/ProgressBar'

type StatusFilter = 'all' | 'active' | 'done'

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '未完成' },
  { key: 'done', label: '已完成' },
]

const MAX_DOTS = 60
const PLACEHOLDER_DOTS = 18

function displayTitle(title: string): string {
  const i1 = title.indexOf('：')
  const i2 = title.indexOf(':')
  const idx = Math.min(
    i1 === -1 ? Infinity : i1,
    i2 === -1 ? Infinity : i2,
  )
  return idx === Infinity ? title : title.slice(0, idx).trim()
}

interface TaskCardProps {
  goal: Goal
  todos: Todo[]
  goalColorMap?: Record<string, string>
  onAddTodo: (goalId: string, title: string) => Promise<void>
  onToggleTodo: (todoId: string) => void
  onDeleteTodo: (todoId: string) => void
  onRenameTodo?: (todoId: string, newTitle: string) => void
  onMoveTodo?: (goalId: string, todoId: string, newIndex: number) => void
}

export function TaskCard({
  goal,
  todos,
  goalColorMap,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onRenameTodo,
  onMoveTodo,
}: TaskCardProps) {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const color = goal.categoryId ? `var(--event-${goal.categoryId}-fill)` : 'var(--accent)'

  const done = useMemo(() => todos.filter((t) => t.status === 'done').length, [todos])
  const total = todos.length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  const filtered = useMemo(() => {
    const sorted = [...todos].sort((a, b) => {
      const aDone = a.status === 'done' ? 1 : 0
      const bDone = b.status === 'done' ? 1 : 0
      if (aDone !== bDone) return aDone - bDone
      return a.sortOrder - b.sortOrder
    })
    if (filter === 'active') return sorted.filter((t) => t.status !== 'done')
    if (filter === 'done') return sorted.filter((t) => t.status === 'done')
    return sorted
  }, [todos, filter])

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
    if (val) await onAddTodo(goal.id, val)
  }, [value, goal.id, onAddTodo])

  const saveEdit = useCallback(
    (todoId: string) => {
      const val = editValue.trim()
      setEditingId(null)
      setEditValue('')
      if (val && onRenameTodo) {
        const original = todos.find((t) => t.id === todoId)
        if (original && val !== original.title) onRenameTodo(todoId, val)
      }
    },
    [editValue, todos, onRenameTodo],
  )

  const handleDrop = useCallback(
    (dropId: string) => {
      if (!dragId || !onMoveTodo || dragId === dropId) return
      const dragTodo = todos.find((t) => t.id === dragId)
      const dropTodo = todos.find((t) => t.id === dropId)
      if (!dragTodo?.goalId || dragTodo.goalId !== dropTodo?.goalId) {
        setDragId(null)
        setDragOverId(null)
        return
      }
      const newIdx = filtered.findIndex((t) => t.id === dropId)
      if (newIdx !== -1) onMoveTodo(dragTodo.goalId, dragId, newIdx)
      setDragId(null)
      setDragOverId(null)
    },
    [dragId, todos, filtered, onMoveTodo],
  )

  const dots = useMemo(() => {
    if (total === 0) {
      return Array.from({ length: PLACEHOLDER_DOTS }, () => ({ done: false, placeholder: true }))
    }
    return todos.slice(0, MAX_DOTS).map((t) => ({ done: t.status === 'done', placeholder: false }))
  }, [todos, total])

  return (
    <div className="rm-card">
      {/* 头部 */}
      <div className="rm-card-head">
        <div className="rm-card-head-left">
          <CheckSquare size={18} strokeWidth={1.75} style={{ color }} />
          <span className="rm-card-title">{goal.title}</span>
        </div>
        <button className="rm-icon-btn" title="加任务" onClick={() => setAdding(true)}>
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {/* 状态筛选 */}
      <div className="rm-filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`rm-filter-pill ${filter === f.key ? 'rm-filter-pill-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 进度 */}
      <div className="rm-progress-block">
        <div className="rm-progress-label">
          <span>任务完成进度</span>
          <span className="rm-progress-count">
            {done}/{total}
          </span>
        </div>
        <ProgressBar percent={percent} height={8} showPercent={false} color={color} />
      </div>

      {/* 点阵 */}
      <div className="rm-dotgrid">
        {dots.map((d, i) => (
          <span
            key={i}
            className={`rm-dot ${d.done ? 'rm-dot-done' : ''} ${d.placeholder ? 'rm-dot-placeholder' : ''}`}
            style={d.done ? { background: color } : undefined}
          />
        ))}
        {total > MAX_DOTS && <span className="rm-dot-more">+{total - MAX_DOTS}</span>}
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

        {filtered.map((t) => {
          const isDragging = dragId === t.id
          const isDragOver = dragOverId === t.id && dragId !== t.id
          const subColor =
            t.goalId && t.goalId !== goal.id && goalColorMap
              ? (goalColorMap[t.goalId] ?? null)
              : null

          return (
            <div
              key={t.id}
              className={`rm-task-row ${isDragging ? 'rm-task-row-dragging' : ''} ${isDragOver ? 'rm-task-row-dragover' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverId(t.id)
              }}
              onDrop={() => handleDrop(t.id)}
            >
              {onMoveTodo ? (
                <div
                  className="rm-task-drag"
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => {
                    setDragId(null)
                    setDragOverId(null)
                  }}
                >
                  <GripVertical size={13} strokeWidth={1.75} />
                </div>
              ) : subColor ? (
                <span className="rm-task-goal-dot" style={{ background: subColor }} />
              ) : (
                <span className="rm-task-goal-dot-empty" />
              )}

              <button
                className={`rm-task-check ${t.status === 'done' ? 'rm-task-check-done' : ''}`}
                style={t.status === 'done' ? { background: color, borderColor: color } : undefined}
                onClick={() => onToggleTodo(t.id)}
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
                  title={t.title !== displayTitle(t.title) ? t.title : undefined}
                >
                  {displayTitle(t.title)}
                </span>
              )}

              <button className="rm-task-del" title="删除" onClick={() => onDeleteTodo(t.id)}>
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          )
        })}

        {!adding && filtered.length === 0 && (
          <div className="rm-task-empty">
            {filter === 'all' ? '还没有任务，点右上角 + 添加' : '没有符合条件的任务'}
          </div>
        )}
      </div>
    </div>
  )
}
