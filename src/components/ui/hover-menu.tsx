/**
 * # HoverMenu — 悬浮快捷菜单（多条目交互式）
 *
 * 鼠标悬停时弹出可点击条目列表，每行 = 功能名 + 快捷键。
 * Portal 渲染到 body，position: fixed，零额外依赖。
 *
 * ## Props
 * - items: Array<{label, shortcut?, onClick}>
 * - children: 触发悬浮的元素
 * - delay: 显示延迟 ms
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface HoverMenuItem {
  label: string
  shortcut?: string
  onClick: () => void
}

export interface HoverMenuProps {
  /** 条目列表（每行 = 功能名 + 快捷键 + onClick），与 content 互斥 */
  items?: HoverMenuItem[]
  /** 自定义卡片内容 ReactNode（与 items 互斥，优先级更高） */
  content?: ReactNode
  /** 触发悬浮的元素 */
  children: ReactNode
  /** 显示延迟 ms */
  delay?: number
  /** 卡片最小宽度 */
  minWidth?: number
}

export function HoverMenu({ items, content, children, delay = 300, minWidth = 180 }: HoverMenuProps) {
  const [phase, setPhase] = useState<'idle' | 'entering' | 'visible' | 'exiting'>('idle')
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
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
      setPos({ x: r.right + 8, y: r.bottom + 6 })
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

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    left: pos.x,
    top: pos.y,
    borderRadius: '6px',
    padding: '4px',
    display: isOpen ? 'flex' : 'none',
    flexDirection: 'column',
    gap: '2px',
    pointerEvents: 'auto',
    fontFamily: 'var(--font-ui, system-ui, sans-serif)',
    fontSize: '12px',
    lineHeight: '1.4',
    minWidth: `${minWidth}px`,
    maxWidth: '280px',
    background: 'var(--surface-raised, #FBFAF6)',
    color: 'var(--ink, #2B2620)',
    border: '1px solid var(--border-subtle, #e2ddd5)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
    opacity: phase === 'visible' ? 1 : 0,
    transform: `translateY(${phase === 'entering' ? '-2px' : '0px'})`,
    transition:
      phase === 'exiting'
        ? 'opacity 100ms ease-in, transform 100ms ease-in'
        : 'opacity 150ms ease-out, transform 150ms ease-out',
  }

  const itemStyle = (isLast: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    color: 'inherit',
    textAlign: 'left',
    width: '100%',
    transition: 'background 150ms ease-out',
    marginBottom: isLast ? 0 : undefined,
  })

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
            role="menu"
            style={menuStyle}
            onMouseEnter={() => {
              clearTimers()
              setPhase('visible')
            }}
            onMouseLeave={() => handleMouseLeave()}
          >
            {content ? (
              content
            ) : items ? (
              items.map((item, i) => (
              <button
                key={i}
                type="button"
                style={itemStyle(i === items.length - 1)}
                onClick={(e) => {
                  e.stopPropagation()
                  item.onClick()
                  // close the menu after click
                  setPhase('exiting')
                  leaveTimer.current = setTimeout(() => setPhase('idle'), 100)
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background =
                    'var(--surface-sunken, rgba(0,0,0,0.05))'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>
                {item.shortcut && (
                  <kbd
                    style={{
                      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                      fontSize: '11px',
                      opacity: 0.55,
                      fontWeight: 400,
                      letterSpacing: '0.03em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            ))
          ) : null}
          </div>,
          document.body,
        )}
    </div>
  )
}
