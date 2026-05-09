import { useMemo } from 'react'
import { computeDistribution, type DistributionResult } from '@/domain/diagnosis'

interface DistributionMatchCardProps {
  byHourSlot: number[][]
  historyByHourSlot: number[][][]
  currentDayIndex: number
  language: 'zh' | 'en'
}

export function DistributionMatchCard({
  byHourSlot,
  historyByHourSlot,
  currentDayIndex,
  language,
}: DistributionMatchCardProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const dist = useMemo<DistributionResult>(
    () => computeDistribution(byHourSlot, historyByHourSlot, currentDayIndex),
    [byHourSlot, historyByHourSlot, currentDayIndex],
  )

  if (!dist.mostSimilarDay || dist.profiles.length === 0) {
    return (
      <div
        className="rounded-lg px-4 py-4 flex flex-col items-center justify-center"
        style={{ backgroundColor: '#EDE8DA', minHeight: 120 }}
      >
        <span className="text-xs" style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#6F6453' }}>
          {t('暂无充足数据', 'Not enough data yet')}
        </span>
      </div>
    )
  }

  // Mini 7×24 heatmap: 7 rows x 24 tiny squares
  const maxVal = Math.max(
    ...byHourSlot.flat().filter((v) => v > 0),
    1,
  )

  const dayLabel = language === 'zh'
    ? dist.mostSimilarDay.labelZh
    : dist.mostSimilarDay.labelEn

  return (
    <div
      className="rounded-lg px-4 py-4 flex flex-col"
      style={{ backgroundColor: '#EDE8DA' }}
    >
      <span
        className="text-xs font-semibold mb-2"
        style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#2E2823' }}
      >
        {t('今天最像周几？', "Today's rhythm most like?")}
      </span>

      {/* Mini heatmap grid */}
      <div className="flex justify-center">
        <div className="inline-grid grid-cols-24 gap-px" style={{ width: 168 }}>
          {byHourSlot.map((day, di) =>
            day.map((val, hi) => {
              const intensity = val > 0 ? Math.min(val / maxVal, 1) : 0
              const alpha = 0.08 + intensity * 0.5
              return (
                <div
                  key={`${di}-${hi}`}
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: intensity > 0
                      ? `rgba(200,105,62,${alpha})`
                      : 'rgba(0,0,0,0.04)',
                    borderRadius: 1,
                  }}
                />
              )
            }),
          )}
        </div>
      </div>

      {/* Weekday labels */}
      <div
        className="flex justify-between mt-1.5 px-0.5"
        style={{ fontFamily: "'Noto Sans SC', sans-serif", fontSize: 8, color: '#6F6453' }}
      >
        {language === 'zh'
          ? ['一', '二', '三', '四', '五', '六', '日'].map((d) => (
              <span key={d}>{d}</span>
            ))
          : ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => (
              <span key={d}>{d}</span>
            ))}
      </div>

      {/* Match result */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <span
          className="text-sm font-semibold"
          style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#C8693E' }}
        >
          {dayLabel}
        </span>
        <span className="text-[10px] font-mono" style={{ color: '#6F6453' }}>
          ({dist.similarityScore}%
          {t('相似', ' match')})
        </span>
      </div>
    </div>
  )
}
