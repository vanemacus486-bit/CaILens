/**
 * # SlidingPills — 二级标签滑块切换
 *
 * 单个滑块在标签间 translateX 滑动，替代各 pill 自持背景的交叉淡变。
 * 静止态外观与原 .routine-pill 一致，仅切换由"直切"变为"滑动"。
 * 复用 --heatmap-* token，样式集中在 index.css 的 .sliding-pills* 块。
 */

import { useLayoutEffect, useRef, useState } from 'react'

interface Item<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  items: readonly Item<T>[]
  value: T
  onChange: (id: T) => void
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SlidingPills<T extends string>({ items, value, onChange }: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; width: number } | null>(null)
  const [animated, setAnimated] = useState(false)

  // id 列表的稳定键：parent 每次 render 都新建 items 数组，用内容键避免无谓重测
  const itemsKey = items.map((it) => it.id).join('|')

  // 测量激活按钮位置 → 定位滑块；ResizeObserver 处理断点/字体变化后的重对齐
  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    const measure = () => {
      const idx = items.findIndex((it) => it.id === value)
      const btn = track.querySelectorAll<HTMLButtonElement>('.sliding-pills-btn')[idx]
      if (!btn) return
      setPos({ left: btn.offsetLeft, width: btn.offsetWidth })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, itemsKey])

  // 首次定位完成后再开启过渡，避免开屏时从原点滑入
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
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onChange(it.id)}
          className={`sliding-pills-btn${it.id === value ? ' is-active' : ''}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
