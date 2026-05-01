import type { CalendarEvent } from '@/domain/event'
import { computeRecordQuality } from '@/domain/quality'

interface RecordQualityProps {
  rangeEvents: readonly CalendarEvent[]
  periodStart: number
  periodEnd: number
  language: 'zh' | 'en'
}

export function RecordQuality({ rangeEvents, periodStart, periodEnd, language }: RecordQualityProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const q = computeRecordQuality(rangeEvents, periodStart, periodEnd)

  const rtPct = Math.round(q.realTimeRatio * 100)
  const covPct = Math.round(q.coverage * 100)

  const metrics = [
    {
      label: t('记录条数', 'Events'),
      value: String(q.eventCount),
      desc: t('条', 'events'),
    },
    {
      label: t('平均颗粒度', 'Avg granularity'),
      value: q.avgGranularity > 0 ? q.avgGranularity.toFixed(1) : '—',
      desc: t('小时/条', 'h/event'),
    },
    {
      label: t('实时记录', 'Real-time'),
      value: `${rtPct}%`,
      desc: q.realTimeRatio >= 0.8
        ? t('良好', 'Good')
        : q.realTimeRatio >= 0.5
          ? t('一般', 'Fair')
          : t('偏低', 'Low'),
    },
    {
      label: t('覆盖率', 'Coverage'),
      value: `${covPct}%`,
      desc: t('清醒时段', 'of waking hrs'),
    },
  ]

  return (
    <div className="bg-surface-raised border border-border-subtle px-6 py-4">
      <h3 className="text-[11px] font-sans text-text-tertiary tracking-[0.04em] uppercase mb-3 select-none">
        {t('记录质量', 'Recording Quality')}
      </h3>
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-[10px] text-text-tertiary mb-0.5">{m.label}</div>
            <div className="font-mono text-sm font-semibold text-text-secondary">
              {m.value}
              <span className="text-[10px] font-normal text-text-tertiary ml-1">{m.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
