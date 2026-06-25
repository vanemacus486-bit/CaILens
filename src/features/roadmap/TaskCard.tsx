import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Plus, Check, Trash2, CheckSquare, GripVertical } from 'lucide-react'
import type { Goal } from '@/domain/goal'
import type { Todo } from '@/domain/todo'
import { ProgressBar } from '@/components/ui/ProgressBar'

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

  // 渲染排序：未完成（按 sortOrder）在上 → 已完成（按 completedAt 倒序）在下
  const { activeItems, doneItems } = useMemo(() => {
    const active = todos.filter((t) => t.status !== 'done').sort((a, b) => a.sortOrder - b.sortOrder)
    const done = todos.filter((t) => t.status === 'done').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    return { activeItems: active, doneItems: done }
  }, [todos])

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
      // moveTodo 在「该目标的完整待办列表（含已完成，按 sortOrder）」里 splice，
      // 所以落点索引必须在同一个域里算 —— 不能用只含未完成、且聚合了子目标的
      // activeTodos，否则被隐藏的已完成项会把索引挤偏，重排落错位甚至无声失效。
      const goalTodos = todos
        .filter((t) => t.goalId === dragTodo.goalId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const newIdx = goalTodos.findIndex((t) => t.id === dropId)
      if (newIdx !== -1) onMoveTodo(dragTodo.goalId, dragId, newIdx)
      setDragId(null)
      setDragOverId(null)
    },
    [dragId, todos, onMoveTodo],
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

        {/* 未完成项 */}
        {activeItems.map((t) => (
          <TodoRow
            key={t.id}
            todo={t}
            isDone={false}
            color={color}
            goalId={goal.id}
            goalColorMap={goalColorMap}
            dragId={dragId}
            dragOverId={dragOverId}
            editingId={editingId}
            editValue={editValue}
            editRef={editRef}
            onMoveTodo={onMoveTodo}
            onDragStart={setDragId}
            onDragOver={setDragOverId}
            onDrop={handleDrop}
            onDragEnd={() => { setDragId(null); setDragOverId(null) }}
            onToggle={onToggleTodo}
            onEditStart={(id, title) => { setEditingId(id); setEditValue(title) }}
            onEditChange={setEditValue}
            onEditSave={saveEdit}
            onEditCancel={() => { setEditingId(null); setEditValue('') }}
            onDelete={onDeleteTodo}
          />
        ))}

        {/* 已完成分隔 */}
        {doneItems.length > 0 && (
          <>
            {activeItems.length > 0 && <div className="rm-task-separator">已完成 · {doneItems.length}</div>}
            {doneItems.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                isDone={true}
                color={color}
                goalId={goal.id}
                goalColorMap={goalColorMap}
                dragId={null}
                dragOverId={null}
                editingId={editingId}
                editValue={editValue}
                editRef={editRef}
                onMoveTodo={undefined}
                onDragStart={() => {}}
                onDragOver={() => {}}
                onDrop={() => {}}
                onDragEnd={() => {}}
                onToggle={onToggleTodo}
                onEditStart={(id, title) => { setEditingId(id); setEditValue(title) }}
                onEditChange={setEditValue}
                onEditSave={saveEdit}
                onEditCancel={() => { setEditingId(null); setEditValue('') }}
                onDelete={onDeleteTodo}
              />
            ))}
          </>
        )}

        {!adding && activeItems.length === 0 && doneItems.length === 0 && (
          <div className="rm-task-empty">
            还没有任务，点右上角 + 添加
          </div>
        )}
        {!adding && activeItems.length === 0 && doneItems.length > 0 && (
          <div className="rm-task-empty">
            所有任务已完成
          </div>
        )}
      </div>
    </div>
  )
}

// ── 单行待办渲染（统一组件，根据 isDone 切换拖拽/样式） ──────

interface TodoRowProps {
  todo: Todo
  isDone: boolean
  color: string
  goalId: string
  goalColorMap?: Record<string, string>
  dragId: string | null
  dragOverId: string | null
  editingId: string | null
  editValue: string
  editRef: React.RefObject<HTMLInputElement | null>
  onMoveTodo?: (goalId: string, todoId: string, newIndex: number) => void
  onDragStart: (id: string | null) => void
  onDragOver: (id: string | null) => void
  onDrop: (id: string) => void
  onDragEnd: () => void
  onToggle: (todoId: string) => void
  onEditStart: (id: string, title: string) => void
  onEditChange: (val: string) => void
  onEditSave: (todoId: string) => void
  onEditCancel: () => void
  onDelete: (todoId: string) => void
}

function TodoRow({
  todo: t,
  isDone,
  color,
  goalId,
  goalColorMap,
  dragId,
  dragOverId,
  editingId,
  editValue,
  editRef,
  onMoveTodo,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggle,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: TodoRowProps) {
  const isDragging = dragId === t.id
  const isDragOver = dragOverId === t.id && dragId !== t.id
  const subColor =
    t.goalId && t.goalId !== goalId && goalColorMap
      ? (goalColorMap[t.goalId] ?? null)
      : null

  return (
    <div
      key={t.id}
      className={`rm-task-row ${isDone ? 'rm-task-row-done' : ''} ${isDragging ? 'rm-task-row-dragging' : ''} ${isDragOver ? 'rm-task-row-dragover' : ''}`}
      onDragOver={(e) => {
        if (isDone) return
        e.preventDefault()
        onDragOver(t.id)
      }}
      onDrop={() => {
        if (isDone) return
        onDrop(t.id)
      }}
    >
      {!isDone && onMoveTodo ? (
        <div
          className="rm-task-drag"
          draggable
          onDragStart={() => onDragStart(t.id)}
          onDragEnd={onDragEnd}
        >
          {subColor && (
            <span
              className="rm-task-goal-dot rm-task-goal-dot-rest"
              style={{ background: subColor }}
            />
          )}
          <GripVertical size={13} strokeWidth={1.75} className="rm-task-grip" />
        </div>
      ) : subColor ? (
        <span className="rm-task-goal-dot" style={{ background: subColor }} />
      ) : (
        <span className="rm-task-goal-dot-empty" />
      )}

      <button
        className={`rm-task-check ${t.status === 'done' ? 'rm-task-check-done' : ''}`}
        style={t.status === 'done' ? { background: color, borderColor: color } : undefined}
        onClick={() => onToggle(t.id)}
      >
        {t.status === 'done' && <Check size={11} strokeWidth={3} color="#fff" />}
      </button>

      {editingId === t.id ? (
        <input
          ref={editRef}
          className="rm-task-input rm-task-edit-input"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEditSave(t.id)
            else if (e.key === 'Escape') onEditCancel()
          }}
          onBlur={() => onEditSave(t.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={`rm-task-title ${isDone ? 'rm-task-title-done' : ''}`}
          onDoubleClick={() => {
            if (!isDone) onEditStart(t.id, t.title)
          }}
          title={t.title !== displayTitle(t.title) ? t.title : undefined}
        >
          {displayTitle(t.title)}
        </span>
      )}

      <button className="rm-task-del" title="删除" onClick={() => onDelete(t.id)}>
        <Trash2 size={14} strokeWidth={1.5} />
      </button>
    </div>
  )
}
