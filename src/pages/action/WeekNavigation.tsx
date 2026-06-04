/**
 * # WeekNavigation — 周切换导航 + 粘性周概览条
 *
 * 顶部粘性区域：← 周标签（+ 总时数）→ + 完成日圆点阵。
 * 固定不随卡片墙滚动。
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtDurationCompact } from '@/domain/log'

// ── Props ──────────────────────────────────────────────────

export interface DayCompletionStat {
  hasDone: boolean
  doneCount: number
  /** 当日有效投入时长（ms），用于 tooltip 显示 */
  totalMs?: number
}

interface WeekNavigationProps {
  weekLabel: string
  doneCount: number
  totalCount: number
  /** 是否支持"回到本周"（当前不在本周时显示） */
  showToday?: boolean
  /** 隐藏进度条和统计 */
  hideProgress?: boolean
  /** 周中各日完成统计（7 个圆点） */
  completionStats?: DayCompletionStat[]
  /** 本周总投入时长（ms），显示在周标签旁 */
  weekTotalHours?: number
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
  completionStats,
  weekTotalHours,
  onPrevWeek,
  onNextWeek,
  onGoToday,
}: WeekNavigationProps) {
  const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <div className="flex flex-col gap-2 px-1 pb-3 border-b border-border-subtle/40">
      {/* ── 主导航 ── */}
      <div className="flex items-center justify-between gap-4">
        {/* ── 左：周切换 + 标签 + 总时数 ── */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrevWeek}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-all cursor-pointer border-none bg-transparent"
            title="上一周"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>

          <div className="min-w-[180px] text-center select-none">
            <span className="font-serif text-sm font-medium text-text-primary">
              {weekLabel}
            </span>
            {weekTotalHours !== undefined && weekTotalHours > 0 && (
              <span className="font-mono text-[11px] text-text-tertiary ml-2">
                {fmtDurationCompact(weekTotalHours)}
              </span>
            )}
          </div>

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

      {/* ── 完成日圆点阵 ── */}
      {completionStats && completionStats.length === 7 && (
        <div className="flex items-center gap-1.5 self-center">
          {WEEKDAY_LABELS.map((label, i) => {
            const stat = completionStats[i]
            const tooltip = stat.totalMs
              ? `${stat.doneCount} 项完成 · ${fmtDurationCompact(stat.totalMs)}`
              : `${stat.doneCount} 项完成`
            return (
              <div key={i} className="flex flex-col items-center gap-0.5" title={tooltip}>
                <span className="font-mono text-[8px] text-text-quaternary/60 leading-none">{label}</span>
                <span
                  className="w-2 h-2 rounded-full transition-colors duration-200"
                  style={{
                    backgroundColor: stat.hasDone
                      ? 'var(--accent)'
                      : 'var(--border-subtle)',
                    opacity: stat.hasDone ? 0.8 : 0.3,
                  }}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
