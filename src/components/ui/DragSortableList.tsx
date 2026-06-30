/**
 * # DragSortableList — 通用拖拽排序列表
 *
 * 使用 HTML5 Drag and Drop API，无需外部依赖。
 * 提供渲染插槽模式，调用方完全控制每一项的渲染。
 *
 * 特性：
 * - 上/下拖拽排序，半区判定精确插入位置
 * - 拖拽时显示插入指示线 + 源项半透明
 * - 释放后调用 onReorder(orderedIds) 回传排序结果
 * - 平滑过渡动画
 * - 新动态添加的列表项自动支持拖拽（由 React 渲染驱动）
 */

import { useState, useRef, useCallback, type ReactNode } from 'react'

export interface DragSortableListProps<T> {
  /** 数据源 */
  items: T[]
  /** 提取唯一标识（如 list.id） */
  keyExtractor: (item: T) => string
  /** 排序完成后回调，返回新的有序 ID 数组 */
  onReorder: (orderedIds: string[]) => void
  /**
   * 渲染每一项。
   * @param item       当前项数据
   * @param index      当前项索引
   * @param dragState  isDragging / isDragOver / dropPosition 状态与拖拽事件绑定
   */
  children: (
    item: T,
    index: number,
    dragState: {
      /** 此项目前是否正在被拖拽 */
      isDragging: boolean
      /** 此项目前是否为拖放目标 */
      isDragOver: boolean
      /** 插入指示线位置：'before' | 'after' | null */
      dropPosition: 'before' | 'after' | null
      /** 绑定到列表项根元素的拖拽事件 props */
      dragEventHandlers: {
        draggable: boolean
        onDragStart: (e: React.DragEvent) => void
        onDragEnd: (e: React.DragEvent) => void
        onDragOver: (e: React.DragEvent) => void
        onDragEnter: (e: React.DragEvent) => void
        onDragLeave: (e: React.DragEvent) => void
        onDrop: (e: React.DragEvent) => void
      }
    },
  ) => ReactNode
}

export function DragSortableList<T>({
  items,
  keyExtractor,
  onReorder,
  children,
}: DragSortableListProps<T>) {
  // ── 拖拽状态（ref + counter 避免频繁 setState） ──
  const dragRef = useRef({
    draggedId: null as string | null,
    dragOverId: null as string | null,
    position: null as 'before' | 'after' | null,
  })
  const [, setRenderTick] = useState(0)

  const scheduleRender = useCallback(() => {
    setRenderTick((n) => n + 1)
  }, [])

  const state = dragRef.current

  // ── 事件处理 ──

  const handleDragStart = useCallback(
    (id: string, e: React.DragEvent) => {
      dragRef.current.draggedId = id
      scheduleRender()
      e.dataTransfer.effectAllowed = 'move'
      // 让拖拽幽灵图稍微透明（浏览器渲染）
      if (e.currentTarget instanceof HTMLElement) {
        e.dataTransfer.setDragImage(e.currentTarget, 16, 20)
      }
    },
    [scheduleRender],
  )

  const handleDragEnd = useCallback(() => {
    dragRef.current.draggedId = null
    dragRef.current.dragOverId = null
    dragRef.current.position = null
    scheduleRender()
  }, [scheduleRender])

  const handleDragOver = useCallback(
    (id: string, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'

      const cur = dragRef.current
      if (cur.draggedId === id) return

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const y = e.clientY - rect.top
      const pos = y < rect.height * 0.5 ? 'before' : 'after'

      if (cur.dragOverId !== id || cur.position !== pos) {
        dragRef.current.dragOverId = id
        dragRef.current.position = pos
        scheduleRender()
      }
    },
    [scheduleRender],
  )

  const handleDragEnter = useCallback(
    (_id: string, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    },
    [],
  )

  const handleDragLeave = useCallback(
    (id: string, e: React.DragEvent) => {
      // 仅在真正离开此元素时清除（避免子元素冒泡干扰）
      const related = e.relatedTarget as Node | null
      if (related && e.currentTarget instanceof Node && e.currentTarget.contains(related)) {
        return
      }
      const cur = dragRef.current
      if (cur.dragOverId === id) {
        dragRef.current.dragOverId = null
        dragRef.current.position = null
        scheduleRender()
      }
    },
    [scheduleRender],
  )

  const handleDrop = useCallback(
    (targetId: string, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const fromId = dragRef.current.draggedId
      const pos = dragRef.current.position
      if (!fromId || fromId === targetId) {
        handleDragEnd()
        return
      }

      const ids = items.map((item) => keyExtractor(item))
      const fromIndex = ids.indexOf(fromId)
      let toIndex = ids.indexOf(targetId)
      if (fromIndex === -1 || toIndex === -1) {
        handleDragEnd()
        return
      }

      // 半区调整：'after' 表示插入到目标项之后
      if (pos === 'after') {
        // 如果源项在目标项之前，移动后索引需要减 1（因为移除了前面一项）
        toIndex = fromIndex < toIndex ? toIndex : toIndex + 1
      }

      // 从原位置移除，再插入到新位置
      ids.splice(fromIndex, 1)
      const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex
      ids.splice(insertAt, 0, fromId)

      onReorder(ids)
      handleDragEnd()
    },
    [items, keyExtractor, onReorder, handleDragEnd],
  )

  // ── 渲染 ──

  return (
    <>
      {items.map((item, index) => {
        const id = keyExtractor(item)
        const isDragging = state.draggedId === id
        const isDragOver = state.dragOverId === id && state.draggedId !== id
        const dropPosition = isDragOver ? state.position : null

        const dragEventHandlers = {
          draggable: true,
          onDragStart: (e: React.DragEvent) => handleDragStart(id, e),
          onDragEnd: handleDragEnd,
          onDragOver: (e: React.DragEvent) => handleDragOver(id, e),
          onDragEnter: (e: React.DragEvent) => handleDragEnter(id, e),
          onDragLeave: (e: React.DragEvent) => handleDragLeave(id, e),
          onDrop: (e: React.DragEvent) => handleDrop(id, e),
        }

        return children(item, index, {
          isDragging,
          isDragOver,
          dropPosition,
          dragEventHandlers,
        })
      })}
    </>
  )
}
