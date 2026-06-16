/**
 * # SlideSegmented — 通用滑块分段切换
 *
 * 单个滑块在分段间 translateX + width 滑动（复用 SlidingPills 的 0.26s 缓动）。
 * 支持两种形态：
 *  - 纯文字（周/月）
 *  - expand：激活项展开「图标 + 文字」，未激活仅图标（日历/复盘）
 *
 * 暖色 surface token，全 app 模式切换统一这一套语言。
 */

import { useLayoutEffect, useRef, useState } from 'react'
import { type LucideIcon } from 'lucide-react'

interface SlideItem<T extends string> {
  id: T
  label: string
  icon?: LucideIcon
}

interface Props<T extends string> {
  items: readonly SlideItem<T>[]
  value: T
  onChange: (id: T) => void
  /** 激活项展开显示文字，未激活仅图标（需配合 icon 使用） */
  expand?: boolean
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SlideSegmented<T extends string>({ items, value, onChange, expand = false }: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; width: number } | null>(null)
  const [animated, setAnimated] = useState(false)

  const itemsKey = items.map((it) => it.id).join('|')

  // 测量激活按钮位置 → 定位滑块；ResizeObserver 处理字体/断点变化后的重对齐
  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      const idx = items.findIndex((it) => it.id === value)
      const btn = track.querySelectorAll<HTMLButtonElement>('[data-seg-btn]')[idx]
      if (!btn) return
      setPos({ left: btn.offsetLeft, width: btn.offsetWidth })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, itemsKey, expand])

  // 首次定位完成后再开启过渡，避免开屏时从原点滑入
  useLayoutEffect(() => {
    if (pos && !animated && !prefersReducedMotion()) setAnimated(true)
  }, [pos, animated])

  return (
    <div
      ref={trackRef}
      className="relative inline-flex items-center bg-surface-sunken rounded-lg p-[3px] gap-0.5"
    >
      {pos && (
        <span
          className="absolute top-[3px] bottom-[3px] left-0 rounded-md bg-surface-raised shadow-sm pointer-events-none"
          style={{
            transform: `translateX(${pos.left}px)`,
            width: pos.width,
            transition: animated
              ? 'transform 0.26s cubic-bezier(0.32,0.72,0,1), width 0.26s cubic-bezier(0.32,0.72,0,1)'
              : 'none',
          }}
        />
      )}
      {items.map((it) => {
        const isActive = it.id === value
        const Icon = it.icon
        const showLabel = !expand || isActive
        return (
          <button
            key={it.id}
            data-seg-btn
            type="button"
            onClick={() => onChange(it.id)}
            title={it.label}
            aria-label={it.label}
            className={`relative z-[1] inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md cursor-pointer border-none bg-transparent font-sans text-[13px] font-medium transition-colors duration-200 ${
              isActive ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {Icon && <Icon size={18} strokeWidth={1.75} />}
            {showLabel && <span className="whitespace-nowrap">{it.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
