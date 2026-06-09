/**
 * # useTabTransition — 统一的 Tab 切换动画
 *
 * 200ms ease-out fade + translateY(6px → 0)。
 * 三段状态机（idle → exit → enter → idle），支持快速切换。
 * 自动检测 `prefers-reduced-motion` 跳过动画。
 */

import { useRef, useState, useEffect, useCallback } from 'react'

const DURATION = 200

/**
 * 检测是否应该跳过动画。
 */
function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 包裹需要动画切换的内容。
 *
 * 用法：
 * ```tsx
 * const { visible, className, animating } = useTabTransition(key)
 * return (
 *   <div className={className}>
 *     {visible && <MyTabContent />}
 *   </div>
 * )
 * ```
 *
 * **注意：** `key` 必须是切换标识符，不要耦合不相关的状态（例如
 * `weekOffset` 和 `tab` 不应拼成同一个 key）。
 */
export function useTabTransition(key: string | number) {
  const prevKeyRef = useRef(key)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')
  const reducedMotion = shouldReduceMotion()

  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTimers = useCallback(() => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current)
      cleanupTimerRef.current = null
    }
  }, [])

  // 每次 key 变化时，清理上一轮的定时器
  useEffect(() => clearTimers, [key, clearTimers])

  useEffect(() => {
    const prev = prevKeyRef.current
    if (prev !== key) {
      prevKeyRef.current = key
      if (reducedMotion) {
        setPhase('idle')
        return
      }
      // Phase 1: fade out (existing content exits)
      setPhase('exit')
      cleanupTimerRef.current = setTimeout(() => {
        // Phase 2: swap content visible, begin fade in
        setPhase('enter')
        cleanupTimerRef.current = setTimeout(() => {
          setPhase('idle')
        }, DURATION)
      }, DURATION)
    }
  }, [key, reducedMotion])

  const className = phase === 'exit'
    ? 'tab-transition-exit'
    : phase === 'enter'
      ? 'tab-transition-enter'
      : 'tab-transition'

  const visible = phase !== 'exit'
  const animating = phase !== 'idle'

  return { visible, className, animating }
}
