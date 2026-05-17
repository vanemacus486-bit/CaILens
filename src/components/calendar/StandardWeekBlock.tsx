import React from 'react'
import { cn } from '@/lib/utils'
import type { MergedBlock } from '@/domain/standardWeek'
import { EVENT_COLOR_CLASSES } from './eventColors'

export interface StandardWeekBlockProps {
  block: MergedBlock
  spanWeeks: number
  language: 'zh' | 'en'
}

const WEEKDAY_LABELS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmtHM(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export const StandardWeekBlock = React.memo(function StandardWeekBlock({
  block,
  spanWeeks,
  language,
}: StandardWeekBlockProps) {
  const top = block.buckets[0]?.entries[0]
  const pct = top?.percentage ?? 0
  const title = block.topTitle || (language === 'zh' ? '无标题' : 'Untitled')
  const isLowConfidence = pct < 30

  const useCount = spanWeeks <= 8

  // Build subtitle text.
  let sub: string
  if (isLowConfidence) {
    sub = ''
  } else if (useCount) {
    const wc = top?.weekCount ?? 0
    sub = language === 'zh' ? `${wc}/${spanWeeks} 周` : `${wc}/${spanWeeks}w`
  } else {
    sub = `${Math.round(pct)}%`
  }

  const weekdayLabel = language === 'zh' ? WEEKDAY_LABELS_ZH[block.weekday] : WEEKDAY_LABELS_EN[block.weekday]
  const hourLabel = `${weekdayLabel} ${fmtHM(block.startHour)}`

  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  return (
    <div
      className={cn(
        'group relative rounded-md px-2 py-1 overflow-hidden select-none',
        // Low-confidence: transparent, no category coloring.
        isLowConfidence
          ? 'bg-transparent'
          : cn(EVENT_COLOR_CLASSES[top!.categoryId]?.bg, EVENT_COLOR_CLASSES[top!.categoryId]?.text),
      )}
      style={isLowConfidence ? undefined : { opacity: pct / 100 }}
    >
      {/* Main content */}
      <p
        className={cn(
          'font-sans font-normal leading-tight truncate',
          isLowConfidence ? 'text-[10px] text-text-tertiary italic' : 'text-xs',
        )}
      >
        {isLowConfidence ? t('无规律', 'No pattern') : title}
      </p>
      {sub && (
        <p className="text-xs-alt opacity-70 font-mono leading-tight mt-0.5">
          {sub}
        </p>
      )}

      {/* Tooltip */}
      <div
        className={cn(
          'absolute left-full ml-2 top-0 z-50 hidden group-hover:block',
          'bg-surface-raised border border-border-default rounded-lg',
          'px-3 py-2 shadow-lg min-w-[180px] max-w-[260px]',
        )}
      >
        <p className="font-sans text-xs font-medium text-text-primary mb-1.5">
          {hourLabel}
          {block.endHour > block.startHour + 1 && ` – ${fmtHM(block.endHour)}`}
        </p>
        <div className="space-y-1">
          {block.buckets.flatMap((b) => b.entries).map((entry, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-sans text-text-primary truncate">
                {entry.title || (language === 'zh' ? '无标题' : 'Untitled')}
              </span>
              <span className="font-mono text-text-tertiary flex-shrink-0 tabular-nums">
                {useCount
                  ? `${entry.weekCount}/${spanWeeks}`
                  : entry.percentage < 100
                    ? `${Math.round(entry.percentage)}%`
                    : ''}
                <span className="ml-1 opacity-60">{Math.round(entry.minutes)} min</span>
              </span>
            </div>
          ))}
        </div>
        {block.buckets.length === 1 &&
          block.buckets[0]!.entries.length === 1 &&
          block.buckets[0]!.totalMinutes <= 60 && (
          <p className="text-xs-alt text-text-tertiary mt-1">
            {t('可能仅 1 次记录', 'Likely 1 recording')}
          </p>
        )}
        {spanWeeks < 3 && (
          <p className="text-xs-alt text-text-tertiary mt-1">
            {t(`基于 ${spanWeeks} 周 · 数据较少`, `Based on ${spanWeeks} week(s) · limited data`)}
          </p>
        )}
      </div>
    </div>
  )
})
