/**
 * # HoverCard — 悬浮快捷键提示卡
 *
 * 侧边栏按钮 hover 时延迟 delay ms 弹出，展示功能名称 + 可选快捷键。
 * 卡片通过 Portal 渲染到 body，避免被父级 overflow-hidden 裁剪。
 * 纯 CSS 定位（position: fixed），零额外依赖。
 *
 * ## 交互时序
 * - MouseEnter → 启动 delay timer → 仍悬停 → 显示（入场动画）
 * - MouseLeave → 取消 timer + 若 card 显示 → 退场并移除
 * - card 自身 mouseEnter → 保持显示
 * - card 自身 mouseLeave → 退场
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ── Types ──────────────────────────────────────────────

export interface HoverCardProps {
  /** 功能名称（左侧主文字） */
  content: string
  /** 快捷键文字，如 'Ctrl+B'、'Alt+1'；不传则不显示 */
  shortcut?: string
  /** 触发悬浮的子元素 */
  children: ReactNode
  /** 弹出方向，默认右侧边栏场景用 'right' */
  position?: 'right' | 'top' | 'bottom'
  /** 显示延迟（ms），默认 300 */
  delay?: number
}

// ── Component ──────────────────────────────────────────

export function HoverCard({
  content,
  shortcut,
  children,
  position = 'right',
  delay = 300,
}: HoverCardProps) {
  const [phase, setPhase] = useState<'idle' | 'entering' | 'visible' | 'exiting'>('idle')
  const [cardPos, setCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (enterTimer.current) { clearTimeout(enterTimer.current); enterTimer.current = null }
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null }
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const handleMouseEnter = useCallback(() => {
    clearTimers()
    if (phase === 'visible' || phase === 'entering') return
    if (wrapperRef.current) {
      const r = wrapperRef.current.getBoundingClientRect()
      switch (position) {
        case 'right':
          setCardPos({ x: r.right + 8, y: r.top + r.height / 2 })
          break
        case 'bottom':
          setCardPos({ x: r.left + r.width / 2, y: r.bottom + 8 })
          break
        case 'top':
          setCardPos({ x: r.left + r.width / 2, y: r.top - 8 })
          break
      }
    }
    enterTimer.current = setTimeout(() => {
      setPhase('entering')
      enterTimer.current = setTimeout(() => {
        setPhase('visible')
      }, 150)
    }, delay)
  }, [clearTimers, delay, phase])

  const handleMouseLeave = useCallback(() => {
    clearTimers()
    if (phase === 'idle') return
    setPhase('exiting')
    leaveTimer.current = setTimeout(() => {
      setPhase('idle')
    }, 100)
  }, [clearTimers, phase])

  const isOpen = phase !== 'idle'

  // ── Card style (portal-rendered, fixed positioning) ──

  const isRight = position === 'right'
  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    left: cardPos.x,
    top: cardPos.y,
    transform: isRight
      ? `translateY(-50%) translateY(${phase === 'entering' ? '2px' : '0px'})`
      : `translateX(-50%) translateY(${phase === 'entering' ? '2px' : '0px'})`,
    borderRadius: '6px',
    padding: '6px 12px',
    display: isOpen ? 'flex' : 'none',
    alignItems: 'center',
    gap: '16px',
    whiteSpace: 'nowrap',
    pointerEvents: 'auto',
    fontFamily: 'var(--font-ui, system-ui, sans-serif)',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '1.4',
    maxWidth: '50vw',
    background: 'var(--surface-raised, #FBFAF6)',
    color: 'var(--ink, #2B2620)',
    border: '1px solid var(--border-subtle, #e2ddd5)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
    opacity: phase === 'visible' ? 1 : 0,
    transition:
      phase === 'exiting'
        ? 'opacity 100ms ease-in, transform 100ms ease-in'
        : 'opacity 150ms ease-out, transform 150ms ease-out',
  }

  return (
    <div
      ref={wrapperRef}
      style={{ display: 'inline-flex' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isOpen &&
        createPortal(
          <div
            role="tooltip"
            style={cardStyle}
            onMouseEnter={() => {
              clearTimers()
              setPhase('visible')
            }}
            onMouseLeave={() => handleMouseLeave()}
          >
            <span>{content}</span>
            {shortcut && (
              <kbd
                style={{
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  fontSize: '11px',
                  opacity: 0.6,
                  fontWeight: 400,
                  letterSpacing: '0.03em',
                }}
              >
                {shortcut}
              </kbd>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
