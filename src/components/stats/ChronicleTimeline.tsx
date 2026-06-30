/**
 * # ChronicleTimeline — 双轨编年时间轴（暖色轻量版）
 *
 * 中央极细浅灰主轴 + 底部阶段胶囊 + 顶部任务气泡。
 * 滚轮缩放、拖拽平移、拖拽移动卡片（抬指 snap + 保存）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useChronicleStore } from '@/stores/chronicleStore'
import {
  generateMonthNodes,
  layoutPhasesIntoTracks,
  layoutTasksIntoRows,
  resolveColorHex,
  snapToMonthNode,
  type ChroniclePhase,
  type ChronicleTask,
} from '@/domain/chronicle'
import { ChronicleFormModal } from './ChronicleFormModal'
import { ChronicleTooltip } from './ChronicleTooltip'

// ── Constants ──────────────────────────────────────────────

const MONTH_WIDTH = 80
const AXIS_Y = 300
const PHASE_TRACK_HEIGHT = 34
const PHASE_TRACK_GAP = 6
const TASK_ROW_HEIGHT = 30
const TASK_ROW_GAP = 6
const NODE_RADIUS = 3
const MIN_SCALE = 0.15
const MAX_SCALE = 4
const SCALE_STEP = 1.15

// ── Helpers ─────────────────────────────────────────────────

function formatYearMonth(ts: number): { year: string; month: string } {
  const d = new Date(ts)
  return {
    year: `${d.getFullYear()}`,
    month: `${d.getMonth() + 1}月`,
  }
}

function isJanuary(ts: number): boolean {
  return new Date(ts).getMonth() === 0
}

// ── Main component ──────────────────────────────────────────

export function ChronicleTimeline() {
  const phases = useChronicleStore((s) => s.phases)
  const tasks = useChronicleStore((s) => s.tasks)
  const isLoading = useChronicleStore((s) => s.isLoading)
  const loadRange = useChronicleStore((s) => s.loadRange)

  const updatePhaseFromStore = useChronicleStore((s) => s.updatePhase)
  const updateTaskFromStore = useChronicleStore((s) => s.updateTask)

  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // ── Modal state ──────────────────────────────────────────

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'phase' | 'task'>('task')
  const [editingItem, setEditingItem] = useState<ChroniclePhase | ChronicleTask | null>(null)

  // ── Tooltip state ────────────────────────────────────────

  const [tooltipItem, setTooltipItem] = useState<ChroniclePhase | ChronicleTask | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // ── Block drag state (ref-based) ─────────────────────────

  const dragRef = useRef<{
    type: 'phase' | 'task'
    id: string
    edge: 'left' | 'right' | 'move' | null
    startMouseX: number
    startDate: number
    startEndDate: number
    startDate2: number
  } | null>(null)

  // Visual offset for live drag preview (pixels in content space)
  const [dragVisual, setDragVisual] = useState<{ id: string; offsetPx: number } | null>(null)

  // ── Date range ────────────────────────────────────────────

  const currentYear = new Date().getFullYear()
  const [rangeStart] = useState(() => new Date(currentYear - 5, 0, 1).getTime())
  const [rangeEnd] = useState(() => new Date(currentYear + 5, 11, 31).getTime())

  // ── Load data ─────────────────────────────────────────────

  useEffect(() => {
    loadRange(rangeStart, rangeEnd)
  }, [loadRange, rangeStart, rangeEnd])

  // ── Compute month nodes ───────────────────────────────────

  const nodes = useMemo(() => generateMonthNodes(rangeStart, rangeEnd), [rangeStart, rangeEnd])

  // ── Layout ─────────────────────────────────────────────────

  const phaseLayouts = useMemo(() => layoutPhasesIntoTracks(phases), [phases])
  const taskLayouts = useMemo(() => layoutTasksIntoRows(tasks, nodes), [tasks, nodes])

  const maxPhaseTrack = useMemo(
    () => phaseLayouts.reduce((max, l) => Math.max(max, l.track), 0),
    [phaseLayouts],
  )

  const maxTaskRow = useMemo(
    () => taskLayouts.reduce((max, l) => Math.max(max, l.row), 0),
    [taskLayouts],
  )

  // ── Content dimensions ────────────────────────────────────

  const contentWidth = nodes.length * MONTH_WIDTH
  const contentHeight =
    AXIS_Y +
    30 +
    (maxPhaseTrack + 1) * (PHASE_TRACK_HEIGHT + PHASE_TRACK_GAP) +
    60 +
    (maxTaskRow + 1) * (TASK_ROW_HEIGHT + TASK_ROW_GAP) +
    60

  // ── Node position helpers ─────────────────────────────────

  const nodeIndex = useCallback(
    (ts: number) => nodes.findIndex((n) => n.ts >= ts),
    [nodes],
  )

  const nodeX = useCallback(
    (idx: number) => idx * MONTH_WIDTH + MONTH_WIDTH / 2,
    [],
  )

  // ── Snap helper ─────────────────────────────────────────────

  const snapTsToNode = useCallback((ts: number): number => {
    return snapToMonthNode(ts, nodes)
  }, [nodes])

  // ── Wheel zoom ────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const contentX = (mouseX - panX) / scale
    const contentY = (mouseY - panY) / scale

    const factor = e.deltaY < 0 ? SCALE_STEP : 1 / SCALE_STEP
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor))

    const newPanX = mouseX - contentX * newScale
    const newPanY = mouseY - contentY * newScale

    setScale(newScale)
    setPanX(newPanX)
    setPanY(newPanY)
  }, [scale, panX, panY])

  // ── Block drag handlers ────────────────────────────────────

  const handleBlockDragStart = useCallback((
    e: React.MouseEvent,
    type: 'phase' | 'task',
    id: string,
    edge: 'left' | 'right' | 'move',
    startDateVal: number,
    endDateVal: number,
    dateVal: number,
  ) => {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = {
      type, id, edge,
      startMouseX: e.clientX,
      startDate: startDateVal,
      startEndDate: endDateVal,
      startDate2: dateVal,
    }
    setDragVisual({ id, offsetPx: 0 })
  }, [])

  // ── Pan & mouse handlers ───────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, .chronicle-block, .chronicle-bubble, .chronicle-resize-handle')) return
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setPanStart({ x: panX, y: panY })
    e.preventDefault()
  }, [panX, panY])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Block drag — visual preview only, no store writes
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startMouseX
      const contentDx = dx / scale
      setDragVisual({ id: dragRef.current.id, offsetPx: contentDx })
      return
    }

    // Canvas pan
    if (!dragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setPanX(panStart.x + dx)
    setPanY(panStart.y + dy)
  }, [dragging, dragStart, panStart, scale])

  const handleMouseUp = useCallback(() => {
    // Commit drag — snap + save once
    if (dragRef.current) {
      const d = dragRef.current
      const offsetPx = dragVisual?.offsetPx ?? 0
      if (Math.abs(offsetPx) > 2) {
        const monthDelta = Math.round(offsetPx / MONTH_WIDTH)
        if (d.type === 'phase') {
          const phase = phases.find((p) => p.id === d.id)
          if (phase) {
            if (d.edge === 'move') {
              const duration = d.startEndDate - d.startDate
              const newStart = snapTsToNode(d.startDate + monthDelta * 30 * 24 * 60 * 60_000)
              updatePhaseFromStore(d.id, { startDate: newStart, endDate: newStart + duration })
            } else if (d.edge === 'left') {
              const newStart = snapTsToNode(d.startDate + monthDelta * 30 * 24 * 60 * 60_000)
              if (newStart < d.startEndDate) updatePhaseFromStore(d.id, { startDate: newStart })
            } else if (d.edge === 'right') {
              const newEnd = snapTsToNode(d.startEndDate + monthDelta * 30 * 24 * 60 * 60_000)
              if (newEnd > d.startDate) updatePhaseFromStore(d.id, { endDate: newEnd })
            }
          }
        } else if (d.type === 'task') {
          const newDate = snapTsToNode(d.startDate2 + monthDelta * 30 * 24 * 60 * 60_000)
          updateTaskFromStore(d.id, { date: newDate })
        }
      }
    }

    setDragging(false)
    setDragVisual(null)
    dragRef.current = null
  }, [dragVisual, phases, updatePhaseFromStore, updateTaskFromStore, snapTsToNode])

  // ── Modal helpers ──────────────────────────────────────────

  const openAddPhase = () => { setEditingItem(null); setModalMode('phase'); setModalOpen(true) }
  const openAddTask = () => { setEditingItem(null); setModalMode('task'); setModalOpen(true) }
  const openEditPhase = (phase: ChroniclePhase) => { setEditingItem(phase); setModalMode('phase'); setModalOpen(true) }
  const openEditTask = (task: ChronicleTask) => { setEditingItem(task); setModalMode('task'); setModalOpen(true) }

  // ── Tooltip ────────────────────────────────────────────────

  const showTooltip = (item: ChroniclePhase | ChronicleTask, e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltipItem(item)
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }
  const hideTooltip = () => setTooltipItem(null)

  // ── Visibility ─────────────────────────────────────────────

  const showYearLabels = scale >= 0.2
  const showMonthLabels = scale >= 0.6
  const isEmpty = !isLoading && phases.length === 0 && tasks.length === 0

  // ── Render helper: resolve card position with drag offset ──

  const getCardOffset = (id: string): number =>
    dragVisual?.id === id ? dragVisual.offsetPx : 0

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="chronicle-root">
      <style>{CHRONICLE_CSS}</style>

      {/* ── Minimal toolbar: just add buttons ── */}
      <div className="chronicle-toolbar">
        <button className="chronicle-toolbar-btn" onClick={openAddPhase} title="添加阶段">
          <Plus size={14} /> 阶段
        </button>
        <button className="chronicle-toolbar-btn" onClick={openAddTask} title="添加任务">
          <Plus size={14} /> 任务
        </button>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="chronicle-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        {isLoading && isEmpty && (
          <div className="chronicle-loading">加载中…</div>
        )}

        {isEmpty && !isLoading && (
          <div className="chronicle-empty">
            点击下方 + 号，开始记录你的编年史
          </div>
        )}

        <div
          className="chronicle-content"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: contentWidth,
            height: contentHeight,
          }}
        >
          {/* ── SVG layer: axis line, nodes, leader lines ── */}
          <svg
            className="chronicle-svg"
            width={contentWidth}
            height={contentHeight}
          >
            {/* Main axis line — thin light gray */}
            <line
              x1={0}
              y1={AXIS_Y}
              x2={contentWidth}
              y2={AXIS_Y}
              stroke="var(--chronicle-axis, #d4cfc6)"
              strokeWidth={1}
            />

            {/* Month nodes & labels */}
            {nodes.map((node, i) => {
              const x = nodeX(i)
              const showYear = showYearLabels && isJanuary(node.ts)
              const showMonth = showMonthLabels
              const { year, month } = formatYearMonth(node.ts)

              return (
                <g key={node.ts}>
                  <circle
                    cx={x}
                    cy={AXIS_Y}
                    r={NODE_RADIUS}
                    fill="var(--chronicle-node, #c4bfb6)"
                    stroke="none"
                    className="chronicle-node"
                  />
                  {showYear && (
                    <text
                      x={x}
                      y={AXIS_Y - 24}
                      textAnchor="middle"
                      fill="var(--chronicle-label, #6b6460)"
                      fontSize={15}
                      fontWeight={700}
                      fontFamily="'Inter', 'Noto Sans SC', sans-serif"
                    >
                      {year}
                    </text>
                  )}
                  {showMonth && (
                    <text
                      x={x}
                      y={AXIS_Y + 18}
                      textAnchor="middle"
                      fill="var(--chronicle-label-2, #a09894)"
                      fontSize={10}
                      fontFamily="'Inter', 'Noto Sans SC', sans-serif"
                    >
                      {month}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Leader lines for task bubbles */}
            {taskLayouts.map(({ task, row }) => {
              const anchorIdx = nodeIndex(task.date)
              if (anchorIdx < 0) return null
              const anchorX = nodeX(anchorIdx)
              const bubbleY = AXIS_Y - 35 - row * (TASK_ROW_HEIGHT + TASK_ROW_GAP)

              return (
                <line
                  key={`leader-${task.id}`}
                  x1={anchorX}
                  y1={AXIS_Y - NODE_RADIUS}
                  x2={anchorX}
                  y2={bubbleY + TASK_ROW_HEIGHT}
                  stroke="var(--chronicle-leader, #d4cfc6)"
                  strokeWidth={1}
                  opacity={0.6}
                />
              )
            })}
          </svg>

          {/* ── Bottom: Phase blocks (DOM) ── */}
          {phaseLayouts.map(({ phase, track }) => {
            const startIdx = nodeIndex(phase.startDate)
            const endIdx = nodeIndex(phase.endDate)
            if (startIdx < 0 || endIdx < 0) return null

            const baseX = nodeX(startIdx)
            const x2 = nodeX(endIdx)
            const blockWidth = Math.max(x2 - baseX, 24)
            const trackY = AXIS_Y + 28 + track * (PHASE_TRACK_HEIGHT + PHASE_TRACK_GAP)
            const hex = resolveColorHex(phase.color)
            const offset = getCardOffset(phase.id)

            return (
              <div
                key={phase.id}
                className="chronicle-block"
                style={{
                  position: 'absolute',
                  left: baseX + offset,
                  top: trackY,
                  width: blockWidth,
                  height: PHASE_TRACK_HEIGHT,
                  backgroundColor: hex,
                  borderRadius: `${PHASE_TRACK_HEIGHT / 2}px`,
                  opacity: dragVisual?.id === phase.id ? 0.95 : 0.88,
                  cursor: dragVisual?.id === phase.id ? 'grabbing' : 'grab',
                  zIndex: dragVisual?.id === phase.id ? 10 : 1,
                }}
                onClick={(e) => { e.stopPropagation(); openEditPhase(phase) }}
                onMouseDown={(e) => handleBlockDragStart(e, 'phase', phase.id, 'move', phase.startDate, phase.endDate, 0)}
                onMouseEnter={(e) => showTooltip(phase, e)}
                onMouseLeave={hideTooltip}
              >
                {/* Left resize handle */}
                <div
                  className="chronicle-resize-handle"
                  style={{
                    position: 'absolute', left: -4, top: 0,
                    width: 8, height: '100%', cursor: 'ew-resize',
                  }}
                  onMouseDown={(e) => handleBlockDragStart(e, 'phase', phase.id, 'left', phase.startDate, phase.endDate, 0)}
                />
                {/* Right resize handle */}
                <div
                  className="chronicle-resize-handle"
                  style={{
                    position: 'absolute', right: -4, top: 0,
                    width: 8, height: '100%', cursor: 'ew-resize',
                  }}
                  onMouseDown={(e) => handleBlockDragStart(e, 'phase', phase.id, 'right', phase.startDate, phase.endDate, 0)}
                />
                <span className="chronicle-block-label">{phase.title}</span>
              </div>
            )
          })}

          {/* ── Top: Task bubbles (DOM) ── */}
          {taskLayouts.map(({ task, row }) => {
            const anchorIdx = nodeIndex(task.date)
            if (anchorIdx < 0) return null

            const anchorX = nodeX(anchorIdx)
            const bubbleY = AXIS_Y - 35 - row * (TASK_ROW_HEIGHT + TASK_ROW_GAP)
            const hex = resolveColorHex(task.color)

            const hasRange = task.startDate && task.endDate
            let bubbleWidth = 120
            let bubbleX = anchorX - 60
            if (hasRange && task.startDate && task.endDate) {
              const sIdx = nodeIndex(task.startDate)
              const eIdx = nodeIndex(task.endDate)
              if (sIdx >= 0 && eIdx >= 0) {
                bubbleX = nodeX(sIdx)
                bubbleWidth = Math.max(nodeX(eIdx) - bubbleX, 80)
              }
            }

            const offset = getCardOffset(task.id)

            return (
              <div
                key={task.id}
                className="chronicle-bubble"
                style={{
                  position: 'absolute',
                  left: bubbleX + offset,
                  top: bubbleY,
                  width: bubbleWidth,
                  height: TASK_ROW_HEIGHT,
                  backgroundColor: hex,
                  borderRadius: `${TASK_ROW_HEIGHT / 2}px`,
                  opacity: dragVisual?.id === task.id ? 0.95 : 0.88,
                  cursor: dragVisual?.id === task.id ? 'grabbing' : 'grab',
                  zIndex: dragVisual?.id === task.id ? 10 : 1,
                }}
                onClick={(e) => { e.stopPropagation(); openEditTask(task) }}
                onMouseDown={(e) => handleBlockDragStart(e, 'task', task.id, 'move', task.startDate ?? task.date, task.endDate ?? task.date, task.date)}
                onMouseEnter={(e) => showTooltip(task, e)}
                onMouseLeave={hideTooltip}
              >
                <span className="chronicle-bubble-label">
                  {task.title.length > 12 ? task.title.slice(0, 12) + '…' : task.title}
                </span>
                {/* Status dot */}
                <span
                  className="chronicle-bubble-status"
                  style={{
                    backgroundColor:
                      task.status === 'done' ? '#2D7D46'
                      : task.status === 'in_progress' ? '#D4A44A'
                      : 'rgba(255,255,255,0.4)',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* ── Tooltip overlay ── */}
        {tooltipItem && (
          <ChronicleTooltip
            item={tooltipItem}
            pos={tooltipPos}
            onClose={hideTooltip}
            onEdit={'startDate' in tooltipItem && !('status' in tooltipItem)
              ? () => openEditPhase(tooltipItem as ChroniclePhase)
              : () => openEditTask(tooltipItem as ChronicleTask)}
          />
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <ChronicleFormModal
          mode={modalMode}
          editingItem={editingItem}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const CHRONICLE_CSS = `
.chronicle-root {
  width: 100%;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: transparent;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.chronicle-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  flex-shrink: 0;
  z-index: 10;
}

.chronicle-toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, #e2ddd5);
  background: var(--surface-raised, #FBFAF6);
  color: var(--text-secondary, #6b6460);
  font-size: 12px;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  line-height: 1;
}
.chronicle-toolbar-btn:hover {
  background: var(--surface-base, #F1EBE0);
  border-color: var(--border-default, #ccc7be);
  color: var(--text-primary, #28241f);
}

.chronicle-canvas {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.chronicle-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary, #a09894);
  font-size: 14px;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  z-index: 1;
}

.chronicle-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary, #a09894);
  font-size: 14px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  z-index: 1;
  user-select: none;
}

.chronicle-content {
  position: absolute;
  left: 0;
  top: 0;
  will-change: transform;
}

.chronicle-svg {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}

.chronicle-node {
  transition: r 0.2s ease;
}

/* ── Phase blocks ── */

.chronicle-block {
  transition: opacity 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
.chronicle-block:hover {
  opacity: 1 !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08);
}

.chronicle-block-label {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

/* ── Task bubbles ── */

.chronicle-bubble {
  transition: opacity 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
.chronicle-bubble:hover {
  opacity: 1 !important;
  box-shadow: 0 4px 18px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
}

.chronicle-bubble-label {
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 10px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.chronicle-bubble-status {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
`
