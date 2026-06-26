/**
 * # SlideSegmented — 通用滑块分段切换
 *
 * 单个滑块在分段间 translateX + width 滑动（0.26s 缓动）。
 * 支持两种形态：
 *  - 纯文字（周/月）
 *  - expand：激活项展开「图标 + 文字」，未激活仅图标（日历/复盘）
 *
 * **跨实例接力（shareKey）**：日历页(CalendarHeader)与复盘页(TopNavBar)各渲染
 * 一份域切换器，切换域会导航路由 → 组件 mount/unmount，普通做法下滑块无法滑动。
 * 传相同 shareKey 时，卸载的实例把滑块屏幕坐标存入模块表，新挂载的实例据此从
 * 上一处「滑入」到自己的位置，视觉上连成一次滑动。失败时静默退化为无动画。
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
  /** 跨 mount/unmount 接力滑块用的共享键（同一逻辑切换器在不同路由各一份时设相同值） */
  shareKey?: string
}

// 卸载实例 → 模块表保存滑块屏幕位置；新实例据此滑入。TTL 防陈旧。
const sharedPillRects = new Map<string, { left: number; width: number; time: number }>()
const SHARE_TTL = 1200
const EASE = 'transform 0.26s cubic-bezier(0.32,0.72,0,1), width 0.26s cubic-bezier(0.32,0.72,0,1)'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SlideSegmented<T extends string>({ items, value, onChange, expand = false, shareKey }: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ left: number; width: number } | null>(null)
  // entry = 接力滑入的起点（新实例从上一处屏幕位置开始）
  const [entry, setEntry] = useState<{ left: number; width: number } | null>(null)
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

  // 挂载时：若有上一处保存的新鲜滑块位置，换算到本 track 局部坐标作为滑入起点
  useLayoutEffect(() => {
    if (!shareKey || prefersReducedMotion()) return
    const track = trackRef.current
    const saved = sharedPillRects.get(shareKey)
    if (track && saved && Date.now() - saved.time < SHARE_TTL) {
      sharedPillRects.delete(shareKey) // 一次性，避免无关重挂载复用
      const trackLeft = track.getBoundingClientRect().left
      setEntry({ left: saved.left - trackLeft, width: saved.width })
    }
    // 仅挂载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 首帧定位后开启过渡：无 entry 直接开；有 entry 用双 rAF 让起点先画一帧再滑到 pos
  useLayoutEffect(() => {
    if (!pos || animated) return
    if (prefersReducedMotion() || !entry) {
      setAnimated(true)
      return
    }
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setAnimated(true)
        setEntry(null)
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [pos, animated, entry])

  // 卸载时保存当前滑块屏幕位置，供下一处接力
  useLayoutEffect(() => {
    if (!shareKey) return
    return () => {
      const el = indicatorRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        sharedPillRects.set(shareKey, { left: r.left, width: r.width, time: Date.now() })
      }
    }
  }, [shareKey])

  const shown = entry ?? pos

  return (
    <div
      ref={trackRef}
      className="relative inline-flex items-center bg-surface-sunken rounded-lg p-[3px] gap-0.5"
    >
      {shown && (
        <span
          ref={indicatorRef}
          className="absolute top-[3px] bottom-[3px] left-0 rounded-md bg-surface-raised shadow-sm pointer-events-none"
          style={{
            transform: `translateX(${shown.left}px)`,
            width: shown.width,
            transition: animated ? EASE : 'none',
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
