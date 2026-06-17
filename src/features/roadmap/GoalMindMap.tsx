import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Plus, X, Check, Pen } from 'lucide-react'
import type { Goal } from '@/domain/goal'
import { ALL_CATEGORY_IDS } from '@/domain/goal'
import type { CategoryId } from '@/domain/category'
import type { Todo } from '@/domain/todo'
import { buildGoalTree, computeGoalProgress, type GoalNode, type GoalProgress } from '@/domain/goalTree'
import {
  computeMindMapLayout,
  edgePath,
  MIND_NODE_W,
  MIND_NODE_H,
  MIND_H_GAP,
} from '@/domain/goalMindMapLayout'

const COL_PITCH = MIND_NODE_W + MIND_H_GAP

interface GoalMindMapProps {
  mainGoal: Goal
  allGoals: Goal[]
  todosByGoal: Record<string, Todo[]>
  focusedGoalId: string | null
  onFocus: (id: string) => void
  onAddChild: (parentId: string, title: string, categoryId?: CategoryId | null) => Promise<void>
  onRename: (goalId: string, title: string) => Promise<void>
  onDelete: (goalId: string) => void
  onColorChange: (goalId: string, categoryId: CategoryId | null) => Promise<void>
  onReorder: (orderedIds: string[]) => void
}

interface CtxMenu {
  goalId: string
  x: number
  y: number
  isRoot: boolean
}

function nodeColor(categoryId: string | null): string {
  return categoryId ? `var(--event-${categoryId}-fill)` : 'var(--accent)'
}

// ── mini progress ring ───────────────────────────────────────
function MiniRing({ progress, color }: { progress: GoalProgress; color: string }) {
  const size = 16
  const stroke = 2.5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = progress.total > 0 ? c * (1 - progress.percent / 100) : c
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mm-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
      {progress.total > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 400ms ease-out' }}
        />
      )}
    </svg>
  )
}

// ── color swatch row ────────────────────────────────────────
function ColorRow({
  value,
  onChange,
}: {
  value: CategoryId | null
  onChange: (c: CategoryId | null) => void
}) {
  return (
    <div className="roadmap-color-row">
      {ALL_CATEGORY_IDS.map((c) => (
        <button
          key={c}
          className={`roadmap-color-btn ${value === c ? 'roadmap-color-btn-active' : ''}`}
          style={{ background: `var(--event-${c}-fill)` }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(value === c ? null : c)}
          title={c}
        />
      ))}
    </div>
  )
}

export function GoalMindMap({
  mainGoal,
  allGoals,
  todosByGoal,
  focusedGoalId,
  onFocus,
  onAddChild,
  onRename,
  onDelete,
  onColorChange,
  onReorder,
}: GoalMindMapProps) {
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [addValue, setAddValue] = useState('')
  const [newNodeColor, setNewNodeColor] = useState<CategoryId | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [dragNodeId, setDragNodeId] = useState<string | null>(null)
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null)
  const addRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const todosMap = useMemo(() => {
    const map = new Map<string, Todo[]>()
    for (const [k, v] of Object.entries(todosByGoal)) map.set(k, v)
    return map
  }, [todosByGoal])

  const tree = useMemo(() => buildGoalTree(allGoals, mainGoal.id), [allGoals, mainGoal.id])

  const nodeMap = useMemo(() => {
    const map = new Map<string, GoalNode>()
    if (!tree) return map
    const walk = (n: GoalNode) => {
      map.set(n.goal.id, n)
      n.children.forEach(walk)
    }
    walk(tree)
    return map
  }, [tree])

  const layout = useMemo(() => (tree ? computeMindMapLayout(tree) : null), [tree])

  // close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [ctxMenu])

  // close context menu on Escape
  useEffect(() => {
    if (!ctxMenu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtxMenu(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ctxMenu])

  useEffect(() => {
    if (addingFor) setTimeout(() => addRef.current?.focus(), 0)
  }, [addingFor])

  useEffect(() => {
    if (editingId) setTimeout(() => editRef.current?.focus(), 0)
  }, [editingId])

  const submitAdd = useCallback(async () => {
    const val = addValue.trim()
    const parent = addingFor
    const color = newNodeColor
    setAddingFor(null)
    setAddValue('')
    setNewNodeColor(null)
    if (val && parent) await onAddChild(parent, val, color)
  }, [addValue, addingFor, newNodeColor, onAddChild])

  const submitEdit = useCallback(async () => {
    const val = editValue.trim()
    const id = editingId
    setEditingId(null)
    setEditValue('')
    if (val && id) {
      const g = allGoals.find((x) => x.id === id)
      if (g && val !== g.title) await onRename(id, val)
    }
  }, [editValue, editingId, allGoals, onRename])

  const handleNodeDrop = useCallback(
    (dropNodeId: string) => {
      if (!layout || !dragNodeId || dragNodeId === dropNodeId) {
        setDragNodeId(null)
        setDragOverNodeId(null)
        return
      }
      const dragPos = layout.nodes.find((x) => x.id === dragNodeId)
      const dropPos = layout.nodes.find((x) => x.id === dropNodeId)
      if (!dragPos || !dropPos || dragPos.parentId !== dropPos.parentId) {
        setDragNodeId(null)
        setDragOverNodeId(null)
        return
      }
      const siblings = allGoals
        .filter((g) => g.parentId === dragPos.parentId && g.status !== 'archived')
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const fromIdx = siblings.findIndex((s) => s.id === dragNodeId)
      const toIdx = siblings.findIndex((s) => s.id === dropNodeId)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) {
        setDragNodeId(null)
        setDragOverNodeId(null)
        return
      }
      const reordered = [...siblings]
      const [removed] = reordered.splice(fromIdx, 1)
      reordered.splice(toIdx, 0, removed)
      onReorder(reordered.map((s) => s.id))
      setDragNodeId(null)
      setDragOverNodeId(null)
    },
    [layout, dragNodeId, allGoals, onReorder],
  )

  if (!layout || !tree) return null

  const ghostPos = addingFor
    ? (() => {
        const parent = layout.nodes.find((n) => n.id === addingFor)
        if (!parent) return null
        return { x: parent.x + COL_PITCH, y: parent.y }
      })()
    : null

  const canvasW = ghostPos ? Math.max(layout.width, ghostPos.x + MIND_NODE_W + 8) : layout.width

  // find goal by id for context menu operations
  const ctxGoal = ctxMenu ? allGoals.find((g) => g.id === ctxMenu.goalId) ?? null : null

  return (
    <>
      <div className="mm-scroll">
        <div className="mm-canvas" style={{ width: canvasW, height: layout.height }}>
          {/* 连线层 */}
          <svg className="mm-edges" width={canvasW} height={layout.height}>
            {layout.edges.map((e) => (
              <path key={`${e.fromId}-${e.toId}`} d={edgePath(e)} className="mm-edge" />
            ))}
            {ghostPos && (
              <path
                className="mm-edge mm-edge-ghost"
                d={edgePath({
                  fromId: 'x',
                  toId: 'y',
                  x1: (layout.nodes.find((n) => n.id === addingFor)?.x ?? 0) + MIND_NODE_W,
                  y1: (layout.nodes.find((n) => n.id === addingFor)?.y ?? 0) + MIND_NODE_H / 2,
                  x2: ghostPos.x,
                  y2: ghostPos.y + MIND_NODE_H / 2,
                })}
              />
            )}
          </svg>

          {/* 节点层 */}
          {layout.nodes.map((n) => {
            const isRoot = n.depth === 0
            const isFocused = n.id === focusedGoalId
            const isDragging = dragNodeId === n.id
            const isDragOver = dragOverNodeId === n.id && dragNodeId !== n.id
            const color = nodeColor(n.categoryId)
            const node = nodeMap.get(n.id)
            const progress = node
              ? computeGoalProgress(node, todosMap)
              : { done: 0, total: 0, percent: 0 }
            const filled = isRoot || isFocused

            return (
              <div
                key={n.id}
                className={`mm-node ${isRoot ? 'mm-node-root' : ''} ${isFocused ? 'mm-node-focused' : ''} ${isDragging ? 'mm-node-dragging' : ''} ${isDragOver ? 'mm-node-dragover' : ''}`}
                style={{
                  left: n.x,
                  top: n.y,
                  width: MIND_NODE_W,
                  height: MIND_NODE_H,
                  ...(filled
                    ? { background: color, borderColor: 'transparent' }
                    : { borderColor: 'var(--border-default)' }),
                }}
                draggable={!isRoot}
                onDragStart={(e) => {
                  if (isRoot) { e.preventDefault(); return }
                  e.stopPropagation()
                  setDragNodeId(n.id)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dragNodeId && dragNodeId !== n.id) setDragOverNodeId(n.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleNodeDrop(n.id)
                }}
                onDragEnd={() => {
                  setDragNodeId(null)
                  setDragOverNodeId(null)
                }}
                onClick={() => { if (!isDragging) onFocus(n.id) }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditingId(n.id)
                  setEditValue(n.title)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCtxMenu({ goalId: n.id, x: e.clientX, y: e.clientY, isRoot })
                }}
              >
                {!isRoot && (
                  <MiniRing
                    progress={progress}
                    color={filled ? 'rgba(255,255,255,0.9)' : color}
                  />
                )}

                {editingId === n.id ? (
                  <input
                    ref={editRef}
                    className="mm-node-input"
                    value={editValue}
                    onChange={(ev) => setEditValue(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') submitEdit()
                      else if (ev.key === 'Escape') {
                        setEditingId(null)
                        setEditValue('')
                      }
                    }}
                    onBlur={submitEdit}
                    onClick={(ev) => ev.stopPropagation()}
                    style={filled ? { color: '#fff' } : undefined}
                  />
                ) : (
                  <span
                    className="mm-node-title"
                    style={filled ? { color: '#fff' } : undefined}
                  >
                    {n.title}
                  </span>
                )}

                {/* 悬停操作 */}
                <div className="mm-node-actions">
                  <button
                    className="mm-node-btn"
                    title="加子目标"
                    onClick={(e) => {
                      e.stopPropagation()
                      setAddingFor(n.id)
                      setAddValue('')
                      setNewNodeColor(null)
                    }}
                    style={filled ? { color: 'rgba(255,255,255,0.85)' } : undefined}
                  >
                    <Plus size={13} strokeWidth={2} />
                  </button>
                  {!isRoot && (
                    <button
                      className="mm-node-btn"
                      title="删除"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(n.id)
                      }}
                      style={filled ? { color: 'rgba(255,255,255,0.85)' } : undefined}
                    >
                      <X size={13} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* ghost 新子目标输入 */}
          {ghostPos && (
            <>
              <div
                className="mm-node mm-node-ghost"
                style={{
                  left: ghostPos.x,
                  top: ghostPos.y,
                  width: MIND_NODE_W,
                  height: MIND_NODE_H,
                  ...(newNodeColor
                    ? { background: `var(--event-${newNodeColor}-fill)`, borderColor: 'transparent' }
                    : {}),
                }}
              >
                <input
                  ref={addRef}
                  className="mm-node-input"
                  placeholder="子目标名称…"
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitAdd()
                    else if (e.key === 'Escape') {
                      setAddingFor(null)
                      setAddValue('')
                      setNewNodeColor(null)
                    }
                  }}
                  onBlur={submitAdd}
                  style={newNodeColor ? { color: '#fff' } : undefined}
                />
                <Check
                  size={14}
                  strokeWidth={2}
                  className="mm-ghost-check"
                  style={newNodeColor ? { color: 'rgba(255,255,255,0.85)' } : undefined}
                  onClick={submitAdd}
                />
              </div>
              {/* 颜色选择行 */}
              <div
                className="mm-ghost-colors"
                style={{ left: ghostPos.x, top: ghostPos.y + MIND_NODE_H + 6 }}
              >
                {ALL_CATEGORY_IDS.map((c) => (
                  <button
                    key={c}
                    className={`roadmap-color-btn ${newNodeColor === c ? 'roadmap-color-btn-active' : ''}`}
                    style={{ background: `var(--event-${c}-fill)` }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setNewNodeColor(newNodeColor === c ? null : c)}
                    title={c}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

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
              const g = allGoals.find((x) => x.id === ctxMenu.goalId)
              if (g) {
                setEditingId(ctxMenu.goalId)
                setEditValue(g.title)
              }
              setCtxMenu(null)
            }}
          >
            <Pen size={13} strokeWidth={1.75} />
            重命名
          </button>

          <div className="roadmap-ctx-divider" />
          <div className="roadmap-ctx-label">更改颜色</div>
          <ColorRow
            value={ctxGoal?.categoryId ?? null}
            onChange={(c) => {
              onColorChange(ctxMenu.goalId, c)
              setCtxMenu(null)
            }}
          />

          <div className="roadmap-ctx-divider" />
          <button
            className="roadmap-ctx-item"
            onClick={() => {
              setAddingFor(ctxMenu.goalId)
              setAddValue('')
              setNewNodeColor(null)
              setCtxMenu(null)
            }}
          >
            <Plus size={13} strokeWidth={2} />
            加子目标
          </button>

          {!ctxMenu.isRoot && (
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
          )}
        </div>
      )}
    </>
  )
}
