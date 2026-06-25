import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, Pen, X } from 'lucide-react'
import type { Goal } from '@/domain/goal'
import { ALL_CATEGORY_IDS } from '@/domain/goal'
import type { CategoryId } from '@/domain/category'

interface PillCtxMenu {
  goalId: string
  x: number
  y: number
}

interface MainGoalSwitcherProps {
  mainGoals: Goal[]
  selectedId: string | null
  doneCount: number
  onSelect: (id: string) => void
  onCreate: (title: string, categoryId?: CategoryId | null) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onColorChange: (id: string, categoryId: CategoryId | null) => void
  onReorder: (orderedIds: string[]) => void
  onMarkDone: (id: string) => void
  onShowArchive: () => void
}

export function MainGoalSwitcher({
  mainGoals,
  selectedId,
  doneCount,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onColorChange,
  onReorder,
  onMarkDone,
  onShowArchive,
}: MainGoalSwitcherProps) {
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')
  const [newColor, setNewColor] = useState<CategoryId | null>(null)
  const [ctxMenu, setCtxMenu] = useState<PillCtxMenu | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus()
  }, [adding])

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus()
  }, [renamingId])

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [ctxMenu])

  useEffect(() => {
    if (!ctxMenu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtxMenu(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ctxMenu])

  const handleSubmit = useCallback(() => {
    const title = input.trim()
    if (title) {
      onCreate(title, newColor)
      setInput('')
      setNewColor(null)
      setAdding(false)
    } else {
      setAdding(false)
      setNewColor(null)
    }
  }, [input, newColor, onCreate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit()
      else if (e.key === 'Escape') {
        setAdding(false)
        setInput('')
        setNewColor(null)
      }
    },
    [handleSubmit],
  )

  const saveRename = useCallback(() => {
    const val = renameValue.trim()
    const id = renamingId
    setRenamingId(null)
    setRenameValue('')
    if (val && id) {
      const g = mainGoals.find((x) => x.id === id)
      if (g && val !== g.title) onRename(id, val)
    }
  }, [renameValue, renamingId, mainGoals, onRename])

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!dragId || dragId === targetId) return
      const fromIdx = mainGoals.findIndex((g) => g.id === dragId)
      const toIdx = mainGoals.findIndex((g) => g.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return
      const ordered = mainGoals.map((g) => g.id)
      const [moved] = ordered.splice(fromIdx, 1)
      ordered.splice(toIdx, 0, moved)
      onReorder(ordered)
      setDragId(null)
      setDragOverId(null)
    },
    [dragId, mainGoals, onReorder],
  )

  const ctxGoal = ctxMenu ? mainGoals.find((g) => g.id === ctxMenu.goalId) ?? null : null

  return (
    <div className="roadmap-switcher">
      {mainGoals.map((goal) => {
        const goalColor = goal.categoryId
          ? `var(--event-${goal.categoryId}-fill)`
          : 'var(--accent)'
        const isSelected = selectedId === goal.id
        const isDragging = dragId === goal.id
        const isDragOver = dragOverId === goal.id && dragId !== goal.id

        if (renamingId === goal.id) {
          return (
            <input
              key={goal.id}
              ref={renameRef}
              className="roadmap-pill-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename()
                else if (e.key === 'Escape') {
                  setRenamingId(null)
                  setRenameValue('')
                }
              }}
              onBlur={saveRename}
            />
          )
        }

        return (
          <button
            key={goal.id}
            className={`roadmap-pill ${isSelected ? 'roadmap-pill-active' : ''} ${isDragging ? 'roadmap-pill-dragging' : ''} ${isDragOver ? 'roadmap-pill-dragover' : ''}`}
            style={isSelected ? { backgroundColor: goalColor, color: 'var(--surface)' } : undefined}
            onClick={() => onSelect(goal.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              setCtxMenu({ goalId: goal.id, x: e.clientX, y: e.clientY })
            }}
            draggable
            onDragStart={() => setDragId(goal.id)}
            onDragEnd={() => {
              setDragId(null)
              setDragOverId(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverId(goal.id)
            }}
            onDrop={() => handleDrop(goal.id)}
          >
            {goal.title}
          </button>
        )
      })}

      {/* 新建主目标 */}
      {adding ? (
        <div className="roadmap-pill-new-wrap">
          <input
            ref={inputRef}
            className="roadmap-pill-input"
            placeholder="目标名称…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // small delay so color btn clicks don't immediately close
              setTimeout(() => {
                if (!input.trim()) {
                  setAdding(false)
                  setNewColor(null)
                }
              }, 150)
            }}
          />
          <div className="roadmap-pill-color-row">
            {ALL_CATEGORY_IDS.map((c) => (
              <button
                key={c}
                className={`roadmap-color-btn roadmap-color-btn-sm ${newColor === c ? 'roadmap-color-btn-active' : ''}`}
                style={{ background: `var(--event-${c}-fill)` }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setNewColor(newColor === c ? null : c)
                  inputRef.current?.focus()
                }}
                title={c}
              />
            ))}
          </div>
        </div>
      ) : (
        <button
          className="roadmap-pill-add"
          onClick={() => setAdding(true)}
          title="新建主目标"
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
      )}

      {/* 已完成归档入口 */}
      {doneCount > 0 && (
        <button
          className="roadmap-pill roadmap-pill-archive"
          onClick={onShowArchive}
          title="已完成项目"
        >
          {'已完成'} · {doneCount}
        </button>
      )}

      {/* 右键菜单 */}
      {ctxMenu && (
        <div
          className="roadmap-ctx-menu"
          style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="roadmap-ctx-item"
            onClick={() => {
              const g = mainGoals.find((x) => x.id === ctxMenu.goalId)
              if (g) {
                setRenamingId(ctxMenu.goalId)
                setRenameValue(g.title)
              }
              setCtxMenu(null)
            }}
          >
            <Pen size={13} strokeWidth={1.75} />
            重命名
          </button>

          <div className="roadmap-ctx-divider" />
          <div className="roadmap-ctx-label">更改颜色</div>
          <div className="roadmap-color-row">
            {ALL_CATEGORY_IDS.map((c) => (
              <button
                key={c}
                className={`roadmap-color-btn ${ctxGoal?.categoryId === c ? 'roadmap-color-btn-active' : ''}`}
                style={{ background: `var(--event-${c}-fill)` }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onColorChange(ctxMenu.goalId, c)
                  setCtxMenu(null)
                }}
                title={c}
              />
            ))}
            {ctxGoal?.categoryId && (
              <button
                className="roadmap-color-btn roadmap-color-btn-clear"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onColorChange(ctxMenu.goalId, null)
                  setCtxMenu(null)
                }}
                title="清除颜色"
              >
                <X size={9} strokeWidth={2} />
              </button>
            )}
          </div>

          <div className="roadmap-ctx-divider" />
          <button
            className="roadmap-ctx-item"
            onClick={() => {
              onMarkDone(ctxMenu.goalId)
              setCtxMenu(null)
            }}
          >
            {'✓ 标记为已完成'}
          </button>

          <div className="roadmap-ctx-divider" />
          <button
            className="roadmap-ctx-item roadmap-ctx-item-danger"
            onClick={() => {
              onDelete(ctxMenu.goalId)
              setCtxMenu(null)
            }}
          >
            <X size={13} strokeWidth={2} />
            删除
          </button>
        </div>
      )}
    </div>
  )
}
