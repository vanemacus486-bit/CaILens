/**
 * # SlidingPills — 二级标签滑块切换
 *
 * 单个滑块在标签间 translateX 滑动，替代各 pill 自持背景的交叉淡变。
 * 静止态外观与原 .routine-pill 一致，仅切换由"直切"变为"滑动"。
 * 复用 --heatmap-* token，样式集中在 index.css 的 .sliding-pills* 块。
 *
 * dividerAfter: 在第 N 项（0-indexed）后插入一道竖线分隔符。
 * 分隔符是普通 span，不影响 querySelectorAll('.sliding-pills-btn') 的索引，
 * 但会推移后续按钮的 offsetLeft，滑块因此正确跟随到实际位置。
 */

import { Fragment, useLayoutEffect, useRef, useState } from 'react'

interface Item<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  items: readonly Item<T>[]
  value: T
  onChange: (id: T) => void
  dividerAfter?: number
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SlidingPills<T extends string>({ items, value, onChange, dividerAfter }: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; width: number } | null>(null)
  const [animated, setAnimated] = useState(false)

  const itemsKey = items.map((it) => it.id).join('|')

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    const measure = () => {
      const idx = items.findIndex((it) => it.id === value)
      const btn = track.querySelectorAll<HTMLButtonElement>('.sliding-pills-btn')[idx]
      if (!btn) {
        setPos(null)
        return
      }
      setPos({ left: btn.offsetLeft, width: btn.offsetWidth })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, itemsKey])

  useLayoutEffect(() => {
    if (pos && !animated && !prefersReducedMotion()) {
      setAnimated(true)
    }
  }, [pos, animated])

  return (
    <div className="sliding-pills" ref={trackRef}>
      {pos && (
        <span
          className="sliding-pills-indicator"
          data-animated={animated}
          style={{ transform: `translateX(${pos.left}px)`, width: pos.width }}
        />
      )}
      {items.map((it, index) => (
        <Fragment key={it.id}>
          <button
            type="button"
            onClick={() => onChange(it.id)}
            className={`sliding-pills-btn${it.id === value ? ' is-active' : ''}`}
          >
            {it.label}
          </button>
          {dividerAfter !== undefined && index === dividerAfter && (
            <span
              aria-hidden="true"
              style={{
                display: 'block',
                width: 1,
                height: 12,
                flexShrink: 0,
                margin: '0 2px',
                alignSelf: 'center',
                background: 'var(--color-border-subtle, rgba(0,0,0,0.15))',
                opacity: 0.6,
              }}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}
