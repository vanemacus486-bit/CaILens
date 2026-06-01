/**
 * # WeekNavigation — 周切换导航 + 粘性周概览条
 *
 * 顶部粘性区域：← 周标签 → + 完成率进度条。
 * 固定不随卡片墙滚动。
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'

// ── Props ──────────────────────────────────────────────────

interface WeekNavigationProps {
  weekLabel: string
  doneCount: number
  totalCount: number
  /** 是否支持"回到本周"（当前不在本周时显示） */
  showToday?: boolean
  /** 隐藏进度条和统计 */
  hideProgress?: boolean
  onPrevWeek: () => void
  onNextWeek: () => void
  onGoToday?: () => void
}

// ── 组件 ──────────────────────────────────────────────────

export function WeekNavigation({
  weekLabel,
  doneCount,
  totalCount,
  showToday,
  hideProgress,
  onPrevWeek,
  onNextWeek,
  onGoToday,
}: WeekNavigationProps) {
  const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  return (
    <div className="flex items-center justify-between gap-4 px-1 pb-3 border-b border-border-subtle/40">
      {/* ── 左：周切换 ── */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onPrevWeek}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-all cursor-pointer border-none bg-transparent"
          title="上一周"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>

        <h2 className="font-serif text-sm font-medium text-text-primary min-w-[180px] text-center select-none">
          {weekLabel}
        </h2>

        <button
          onClick={onNextWeek}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-all cursor-pointer border-none bg-transparent"
          title="下一周"
        >
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>

        {/* "本周"快捷按钮 */}
        {showToday && onGoToday && (
          <button
            onClick={onGoToday}
            className="ml-2 h-7 px-3 rounded-lg text-[11px] font-sans font-medium text-accent hover:bg-accent/10 transition-colors cursor-pointer border-none bg-transparent"
          >
            {'本周'}
          </button>
        )}
      </div>

      {/* ── 右：统计 + 进度条（日志模式下隐藏） ── */}
      {!hideProgress && (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="font-sans text-xs text-text-secondary font-medium">
            {doneCount}/{totalCount}
          </span>
          <span className="font-sans text-[11px] text-text-tertiary ml-1">
            {'已完成'}
          </span>
        </div>

        {/* 微型进度条 */}
        <div className="w-24 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${percent}%`,
              backgroundColor: percent === 100
                ? 'var(--success)'
                : 'var(--accent)',
            }}
          />
        </div>
      </div>
      )}
    </div>
  )
}
