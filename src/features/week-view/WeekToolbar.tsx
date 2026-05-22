/**
 * # WeekToolbar — 移动端精简周工具栏
 *
 * 桌面端周控件已全部由 TopNavBar 接管。
 * 此组件仅用于移动端：左侧汉堡菜单 + 日期范围 + 周切换箭头。
 */

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { formatMonthDay } from '@/domain/time'
import { addDays } from 'date-fns'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MobileMenu } from './MobileMenu'

interface WeekToolbarProps {
  weekStart: Date
  onPrev: () => void
  onNext: () => void
  mobileViewMode?: 'day' | 'week'
  onMobileViewModeChange?: (mode: 'day' | 'week') => void
}

export function WeekToolbar({
  weekStart,
  onPrev,
  onNext,
  mobileViewMode,
  onMobileViewModeChange,
}: WeekToolbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  const weekEnd = addDays(weekStart, 6)
  const rangeLabel = `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}`

  // 桌面端不渲染（TopNavBar 接管）
  if (!isMobile) return null

  return (
    <>
      <div className="flex items-center justify-between px-3 py-3 border-b border-border-subtle flex-shrink-0">
        {/* 左：汉堡菜单 */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200"
          aria-label="Menu"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>

        {/* 中：周切换 + 日期 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer text-lg leading-none"
            aria-label="Previous week"
          >
            ‹
          </button>

          <span className="font-serif text-sm font-medium text-text-primary select-none">
            {rangeLabel}
          </span>

          <button
            onClick={onNext}
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer text-lg leading-none"
            aria-label="Next week"
          >
            ›
          </button>
        </div>

        {/* 右：占位保持对称 */}
        <div className="w-10 h-10" />
      </div>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        mobileViewMode={mobileViewMode}
        onMobileViewModeChange={onMobileViewModeChange}
      />
    </>
  )
}
