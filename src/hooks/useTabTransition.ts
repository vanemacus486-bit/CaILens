/**
 * # useTabTransition — 统一的 Tab 切换动画
 *
 * 200ms ease-out fade + translateY(6px → 0)。
 * 通过 `key` 变化检测切换，旧内容 fadeOut，新内容 fadeIn + slideUp。
 */

import { useRef, useState, useEffect } from 'react'

const DURATION = 200

/**
 * 包裹需要动画切换的内容。
 *
 * 用法：
 * ```tsx
 * const { visible, className } = useTabTransition(key)
 * return (
 *   <div className={className}>
 *     {visible && <MyTabContent />}
 *   </div>
 * )
 * ```
 */
export function useTabTransition(key: string | number) {
  const prevKeyRef = useRef(key)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')

  // key 变化时进入 exit → idle → enter 三段状态机
  useEffect(() => {
    const prev = prevKeyRef.current
    if (prev !== key) {
      prevKeyRef.current = key
      // Phase 1: fade out (existing content exits)
      setPhase('exit')
      const t = setTimeout(() => {
        // Phase 2: invisible (swap content)
        setPhase('enter')
        // Phase 3: fade in (new content enters) — natural transition via CSS
        setTimeout(() => setPhase('idle'), DURATION)
      }, DURATION)
      return () => clearTimeout(t)
    }
  }, [key])

  const className = phase === 'exit'
    ? 'tab-transition-exit'
    : phase === 'enter'
      ? 'tab-transition-enter'
      : 'tab-transition'

  const visible = phase !== 'exit'

  return { visible, className, animating: phase !== 'idle' }
}
