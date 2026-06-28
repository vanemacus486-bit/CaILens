import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalendarEvent } from '@/domain/event'
import {
  timeToMinuteAxis,
  minuteAxisToTime,
  minuteAxisToMinutesInDay,
  MINUTES_PER_DAY,
} from '@/domain/minuteAxis'
import { getDayStart } from '@/domain/time'

// ── 常量 ──────────────────────────────────────────────────────

/** 指针移动超过此像素才从 pending → dragging */
const DRAG_THRESHOLD = 5
/** 事件块最小高度（分钟），即使 end <= start 也保留占位 */
const MIN_EVENT_HEIGHT_MINUTES = 15
/** 拖拽移动吸附精度（分钟），避免非整数分钟时间 */
const SNAP_MINUTES = 15

// ── 类型 ──────────────────────────────────────────────────────

export type DragPhase = 'idle' | 'pending' | 'dragging'

export interface DragState {
  phase: DragPhase
  /** ghost 块在网格中的像素定位（相对于 grid 容器），null 表示不渲染 */
  ghostStyle: GhostStyle | null
}

/**
 * ghost 的像素定位信息。
 * WeekView 用这些值渲染一个绝对定位的半透明块覆盖在网格上。
 */
export interface GhostStyle {
  left: number
  top: number
  width: number
  height: number
  /** ghost 的起始时间（UTC ms），用于显示标签 */
  startTime: number
  /** ghost 的结束时间（UTC ms） */
  endTime: number
}

interface UseEventDragParams {
  event: CalendarEvent
  visibleDateRange: Date[]
  /** 网格容器 ref，用于像素 → 分钟轴转换 */
  gridRef: React.RefObject<HTMLElement | null>
  /** 拖拽开始时回调（关闭打开的卡片等） */
  onDragStart: () => void
  /** 拖拽提交：eventId + 新的起止时间 */
  onCommit: (eventId: string, newStartTime: number, newEndTime: number) => void
  /** 拖拽取消 */
  onCancel: () => void
}

interface UseEventDragResult {
  onPointerDown: (e: React.PointerEvent) => void
  dragState: DragState
  isDragging: boolean
  /** Mutable ref — set to true during drag, reset to false after cleanup. Use in onClick to suppress card open. */
  wasDragging: React.MutableRefObject<boolean>
}

// ── 辅助：测量时间列宽度 ──────────────────────────────────────

function measureTimeColumnWidth(grid: HTMLElement): number {
  const firstDayCol = grid.children[1] as HTMLElement | undefined
  if (!firstDayCol) return 80
  return firstDayCol.getBoundingClientRect().left - grid.getBoundingClientRect().left
}

// ── 像素 → 分钟轴 转换（需要 DOM 测量）─────────────────────────

function pixelToMinuteAxis(
  clientX: number,
  clientY: number,
  gridRect: DOMRect,
  dayCount: number,
  timeColumnWidth: number,
): number {
  const columnWidth = (gridRect.width - timeColumnWidth) / dayCount
  const relativeX = clientX - gridRect.left - timeColumnWidth
  const dayIndex = Math.max(
    0,
    Math.min(dayCount - 1, Math.floor(relativeX / columnWidth)),
  )
  const relativeY = clientY - gridRect.top
  const minutesInDay = (relativeY / gridRect.height) * MINUTES_PER_DAY
  return (
    dayIndex * MINUTES_PER_DAY +
    Math.max(0, Math.min(MINUTES_PER_DAY, minutesInDay))
  )
}

// ── 计算 ghost 的像素定位 ──────────────────────────────────────

function computeGhostStyle(
  ghostStartTime: number,
  ghostEndTime: number,
  visibleDateRange: Date[],
  gridRect: DOMRect,
  timeColumnWidth: number,
): GhostStyle | null {
  if (gridRect.height === 0) return null

  const dayCount = visibleDateRange.length
  const columnHeight = gridRect.height
  const columnWidth = (gridRect.width - timeColumnWidth) / dayCount
  const pixelsPerMinute = columnHeight / MINUTES_PER_DAY

  // 确定 ghost 起始时间落在 visibleDateRange 的哪一天
  let dayIndex = 0
  for (let i = 0; i < dayCount; i++) {
    const ds = getDayStart(visibleDateRange[i])
    const de = ds + 24 * 60 * 60_000
    if (ghostStartTime >= ds && ghostStartTime < de) {
      dayIndex = i
      break
    }
  }

  const ghostDurationMinutes = (ghostEndTime - ghostStartTime) / 60_000
  const startMinutesInDay = minuteAxisToMinutesInDay(
    timeToMinuteAxis(ghostStartTime, visibleDateRange),
  )

  // 高度按当天可见部分 clamp（跨天 ghost 在单列中只显示当天可见高度）
  const visibleDurationMinutes = Math.max(
    MIN_EVENT_HEIGHT_MINUTES,
    Math.min(ghostDurationMinutes, MINUTES_PER_DAY - startMinutesInDay),
  )

  return {
    left: timeColumnWidth + dayIndex * columnWidth,
    top: (startMinutesInDay / MINUTES_PER_DAY) * columnHeight,
    width: columnWidth,
    height: Math.max(visibleDurationMinutes * pixelsPerMinute, 20),
    startTime: ghostStartTime,
    endTime: ghostEndTime,
  }
}

// ── Hook ──────────────────────────────────────────────────────

/**
 * 事件拖拽移动 hook。
 *
 * 核心设计：
 * 1. 将整个可见周映射成一根连续的「分钟轴」（0 ~ 7 * 1440），
 *    拖拽位移在分钟轴上计算，跨越午夜只是加减法，无需任何特殊分支。
 * 2. 按下时记录 dragOffsetMs = pointerTime - event.startTime，
 *    整个拖拽过程保持此偏移不变。
 * 3. 拖拽中通过 rAF 批量更新 ghost 定位（最多 60fps），
 *    不触发整树重渲染。
 * 4. mouseup 时校验 end > start，合法则提交，非法则回滚。
 */
export function useEventDrag({
  event,
  visibleDateRange,
  gridRef,
  onDragStart,
  onCommit,
  onCancel,
}: UseEventDragParams): UseEventDragResult {
  const [dragState, setDragState] = useState<DragState>({
    phase: 'idle',
    ghostStyle: null,
  })

  // ── Per-drag 可变 ref（不触发 React 渲染）───────────────────
  const phaseRef = useRef<DragPhase>('idle')
  const startPointerRef = useRef({ x: 0, y: 0 })
  /** pointerTime - event.startTime 的毫秒偏移，拖拽全程不变 */
  const dragOffsetMsRef = useRef(0)
  /** event.endTime - event.startTime，常量 */
  const eventDurationMs = event.endTime - event.startTime
  /** rAF handle，用于去重 */
  const rafRef = useRef(0)
  /** 最新 ghost 时间的暂存（由 pointermove 写入，rAF 消费） */
  const wasDragging = useRef(false)
  const pendingGhostRef = useRef<{
    startTime: number
    endTime: number
  } | null>(null)

  // ── Latest-value refs（避免闭包过期）────────────────────────
  const eventRef = useRef(event)
  eventRef.current = event
  const dateRangeRef = useRef(visibleDateRange)
  dateRangeRef.current = visibleDateRange
  const onDragStartRef = useRef(onDragStart)
  onDragStartRef.current = onDragStart
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  // ── Pointer down ───────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return

      const grid = gridRef.current
      if (!grid) return
      const gridRect = grid.getBoundingClientRect()
      if (gridRect.height === 0) return

      const dayCount = dateRangeRef.current.length
      const timeColW = measureTimeColumnWidth(grid)

      const pointerAxis = pixelToMinuteAxis(
        e.clientX,
        e.clientY,
        gridRect,
        dayCount,
        timeColW,
      )
      const ev = eventRef.current
      const eventStartAxis = timeToMinuteAxis(
        ev.startTime,
        dateRangeRef.current,
      )

      // 记录偏移：pointer 相对于事件起始的毫秒差
      dragOffsetMsRef.current = (pointerAxis - eventStartAxis) * 60_000

      phaseRef.current = 'pending'
      startPointerRef.current = { x: e.clientX, y: e.clientY }

      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      // ── 辅助：flush pending ghost state 到 React ──────────
      const flushGhost = () => {
        const pending = pendingGhostRef.current
        if (!pending) return
        pendingGhostRef.current = null

        const g = gridRef.current
        if (!g) return
        const gr = g.getBoundingClientRect()
        const tcw = measureTimeColumnWidth(g)

        setDragState({
          phase: 'dragging',
          ghostStyle: computeGhostStyle(
            pending.startTime,
            pending.endTime,
            dateRangeRef.current,
            gr,
            tcw,
          ),
        })
      }

      // ── Cleanup ──────────────────────────────────────────
      const cleanup = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('pointercancel', onCancel_)
        document.removeEventListener('keydown', onKey)
        document.body.classList.remove('dragging-event')
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = 0
        }
        phaseRef.current = 'idle'
        pendingGhostRef.current = null
        wasDragging.current = false
      }
      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startPointerRef.current.x
        const dy = ev.clientY - startPointerRef.current.y

        if (phaseRef.current === 'pending') {
          if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD)
            return
          phaseRef.current = 'dragging'
          document.body.classList.add('dragging-event')
          onDragStartRef.current()
        }

        if (phaseRef.current === 'dragging') {
          wasDragging.current = true
          const g = gridRef.current
          if (!g) return
          const gr = g.getBoundingClientRect()
          const tcw = measureTimeColumnWidth(g)

          const pointerAxis = pixelToMinuteAxis(
            ev.clientX,
            ev.clientY,
            gr,
            dateRangeRef.current.length,
            tcw,
          )
          const rawStartAxis =
            pointerAxis - dragOffsetMsRef.current / 60_000
          const snappedAxis = Math.round(rawStartAxis / SNAP_MINUTES) * SNAP_MINUTES
          const newStartTime = minuteAxisToTime(
            snappedAxis,
            dateRangeRef.current,
          )
          const newEndTime = newStartTime + eventDurationMs

          // 写入暂存 ref，由 rAF 消费（不阻塞 pointermove）
          pendingGhostRef.current = {
            startTime: newStartTime,
            endTime: newEndTime,
          }

          if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(() => {
              rafRef.current = 0
              flushGhost()
            })
          }
        }
      }

      // ── Pointer up ───────────────────────────────────────
      const onUp = (ev: PointerEvent) => {
        const wasDragging = phaseRef.current === 'dragging'
        cleanup()

        if (!wasDragging) {
          setDragState({ phase: 'idle', ghostStyle: null })
          return
        }

        setDragState({ phase: 'idle', ghostStyle: null })

        const g = gridRef.current
        if (!g) return
        const gr = g.getBoundingClientRect()
        const tcw = measureTimeColumnWidth(g)

        const pointerAxis = pixelToMinuteAxis(
          ev.clientX,
          ev.clientY,
          gr,
          dateRangeRef.current.length,
          tcw,
        )
        const rawStartAxis =
          pointerAxis - dragOffsetMsRef.current / 60_000
        const snappedAxis = Math.round(rawStartAxis / SNAP_MINUTES) * SNAP_MINUTES
        const newStartTime = minuteAxisToTime(
          snappedAxis,
          dateRangeRef.current,
        )
        const newEndTime = newStartTime + eventDurationMs

        // 校验：end > start 且至少 15 分钟
        if (newEndTime - newStartTime < MIN_EVENT_HEIGHT_MINUTES * 60_000) {
          onCancelRef.current()
          return
        }

        onCommitRef.current(eventRef.current.id, newStartTime, newEndTime)
      }

      // ── Pointer cancel ───────────────────────────────────
      const onCancel_ = () => {
        const wasDragging = phaseRef.current === 'dragging'
        cleanup()
        setDragState({ phase: 'idle', ghostStyle: null })
        if (wasDragging) onCancelRef.current()
      }

      // ── Keyboard (Escape) ─────────────────────────────────
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape' && phaseRef.current === 'dragging') {
          cleanup()
          setDragState({ phase: 'idle', ghostStyle: null })
          onCancelRef.current()
        }
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.addEventListener('pointercancel', onCancel_)
      document.addEventListener('keydown', onKey)

      e.stopPropagation()
    },
    [eventDurationMs, gridRef],
  )

  // 组件卸载时清理
  useEffect(
    () => () => {
      document.body.classList.remove('dragging-event')
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  return {
    onPointerDown: handlePointerDown,
    dragState,
    isDragging: dragState.phase === 'dragging',
    wasDragging,
  }
}
