import { useMemo } from 'react'
import type { Bucket } from '@/hooks/useStatsAggregation'

interface TimeAccountCardProps {
  current: Bucket
  language: 'zh' | 'en'
}

export function TimeAccountCard({ current, language }: TimeAccountCardProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const { recordedH, sleepH, unrecordedH, totalH, recordedPct, sleepPct, unrecordedPct } = useMemo(() => {
    const daysInPeriod = Math.max(
      Math.round((current.end.getTime() - current.start.getTime()) / (24 * 60 * 60_000)),
      1,
    )
    const total = daysInPeriod * 24
    const recorded = current.total
    const sleep = daysInPeriod * 8
    const unrecorded = Math.max(total - recorded - sleep, 0)

    return {
      recordedH: recorded,
      sleepH: sleep,
      unrecordedH: unrecorded,
      totalH: total,
      recordedPct: total > 0 ? (recorded / total) * 100 : 0,
      sleepPct: total > 0 ? (sleep / total) * 100 : 0,
      unrecordedPct: total > 0 ? (unrecorded / total) * 100 : 0,
    }
  }, [current])

  return (
    <div className="bg-surface-raised border border-border-subtle px-5 py-4">
      <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
        {t('时间去向', 'Time Account')}
      </h3>
      <p className="text-[11px] text-text-tertiary mb-4">
        {language === 'zh'
          ? `本周 ${totalH} 小时如何分配`
          : `How ${totalH} hours are allocated this period`}
      </p>

      {/* Three-segment bar */}
      <div className="flex gap-0.5 h-2.5 rounded-sm overflow-hidden mb-3">
        <div
          className="h-full rounded-l-sm"
          style={{
            width: `${recordedPct}%`,
            backgroundColor: 'var(--accent)',
          }}
          title={`${t('已记录', 'Recorded')}: ${recordedH.toFixed(1)}h`}
        />
        <div
          className="h-full"
          style={{
            width: `${sleepPct}%`,
            backgroundColor: 'var(--event-sage-fill)',
          }}
          title={`${t('睡眠', 'Sleep')}: ${sleepH.toFixed(0)}h`}
        />
        <div
          className="h-full rounded-r-sm"
          style={{
            width: `${unrecordedPct}%`,
            backgroundColor: 'var(--border-default)',
          }}
          title={`${t('未记录', 'Unrecorded')}: ${unrecordedH.toFixed(1)}h`}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-text-tertiary">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
          <span>{t('已记录', 'Recorded')}</span>
          <span className="font-mono text-text-secondary">{recordedH.toFixed(1)}h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--event-sage-fill)' }} />
          <span>{t('睡眠', 'Sleep')}</span>
          <span className="font-mono text-text-secondary">{sleepH.toFixed(0)}h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--border-default)' }} />
          <span>{t('未记录', 'Unrecorded')}</span>
          <span className="font-mono text-text-secondary">{unrecordedH.toFixed(1)}h</span>
        </div>
      </div>
    </div>
  )
}
