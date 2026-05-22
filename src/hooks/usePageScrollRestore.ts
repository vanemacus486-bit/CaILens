/**
 * # usePageScrollRestore
 *
 * 在页面组件挂载/卸载时保存和恢复滚动位置。
 * 用于"从复盘→日历→复盘"这类往返场景保持滚动位置不变。
 *
 * 用法:
 *   const scrollRef = usePageScrollRestore('/stats')
 *   <div ref={scrollRef} className="overflow-y-auto">...
 */

import { useRef, useEffect } from 'react'

// 模块级 Map — 跨组件实例持久化
const SCROLL_POSITIONS = new Map<string, number>()
export function usePageScrollRestore(key: string) {
  const ref = useRef<HTMLDivElement | null>(null)
  const keyRef = useRef(key)
  keyRef.current = key

  // 恢复滚动位置
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const saved = SCROLL_POSITIONS.get(key)
    if (saved !== undefined) {
      // 延迟到渲染完成后恢复
      requestAnimationFrame(() => {
        el.scrollTop = saved
      })
    }
  }, [key])

  // 离开时保存
  useEffect(() => {
    const el = ref.current
    if (!el) return () => {}

    const save = () => {
      SCROLL_POSITIONS.set(keyRef.current, el.scrollTop)
    }

    // 通过 IntersectionObserver 检测元素是否即将移出视口（卸载前）
    // 同时也监听 scroll 事件保持最新位置
    const onScroll = () => {
      SCROLL_POSITIONS.set(keyRef.current, el.scrollTop)
    }

    el.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      save() // 立即保存
      el.removeEventListener('scroll', onScroll)
    }
  }, [key])

  return ref
}

/**
 * 清除指定 key 的滚动位置缓存
 */
export function clearScrollPosition(key: string) {
  SCROLL_POSITIONS.delete(key)
}

/**
 * 清除所有滚动位置缓存
 */
export function clearAllScrollPositions() {
  SCROLL_POSITIONS.clear()
}
