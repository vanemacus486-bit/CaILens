import type { Bucket } from '@/hooks/useStatsAggregation'
import type { Category } from '@/domain/category'

interface WeekInReviewProps {
  current: Bucket
  previous: Bucket | null
  categories: Category[]
  language: 'zh' | 'en'
}

export function WeekInReview({ current, previous, categories, language }: WeekInReviewProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const total = current.total
  const delta = previous ? total - previous.total : 0
  const up = delta > 0

  // Top category
  let topCat = 'accent'
  let topHrs = 0
  for (const [id, hrs] of Object.entries(current.byCategory)) {
    if (hrs > topHrs) { topHrs = hrs; topCat = id }
  }
  const topCatName = categories.find((c) => c.id === topCat)?.name[language] ?? topCat

  // Find the category with the largest increase vs previous
  let biggestGainer = ''
  let biggestGain = 0
  if (previous) {
    for (const id of ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']) {
      const gain = (current.byCategory[id] || 0) - (previous.byCategory[id] || 0)
      if (gain > biggestGain) { biggestGain = gain; biggestGainer = id }
    }
  }
  const gainerName = categories.find((c) => c.id === biggestGainer)?.name[language] ?? biggestGainer

  const deltaDir = up ? t('多', 'more') : t('少', 'less')
  const absDelta = Math.abs(delta).toFixed(1)

  return (
    <div className="bg-surface-raised border border-border-subtle px-10 py-9">
      <h3 className="font-serif text-[22px] font-bold text-text-primary mb-1">
        {t('本周回顾', 'The Week in Review')}
      </h3>
      <p className="text-xs text-text-tertiary mb-6">
        {t('本周 · 数据背后的反思', 'This period · A considered look at what the numbers mean')}
      </p>

      <div className="w-10 h-px bg-accent mb-6" />

      <div className="space-y-3.5">
        <p className="text-[15px] leading-[1.78] text-text-primary">
          {t(
            `本周净有效时间为 ${total.toFixed(1)}h — 比上期${deltaDir}了 ${absDelta}h。`,
            `This period closed at ${total.toFixed(1)}h of net effective time — ${absDelta}h ${deltaDir} than last period.`,
          )}
        </p>

        <p className="text-[15px] leading-[1.78] text-text-primary">
          {t(
            `${topCatName} 占据了最多时间，达到 ${topHrs.toFixed(1)}h，是最主要的投入方向。`,
            `${topCatName} dominated at ${topHrs.toFixed(1)}h, the single largest allocation.`,
          )}
        </p>

        {biggestGain > 0 && (
          <p className="text-[15px] leading-[1.78] text-text-primary">
            {t(
              `${gainerName} 增长了 ${biggestGain.toFixed(1)}h，是变化最显著的部分。`,
              `${gainerName} rose by ${biggestGain.toFixed(1)}h, the most significant shift.`,
            )}
          </p>
        )}

        <p className="text-[15px] leading-[1.78] text-text-secondary italic">
          {t(
            '记录让不可见变得可见。每一个数字背后，是一个小时的选择。',
            'The record makes the invisible visible. Behind every number is an hour chosen.',
          )}
        </p>
      </div>
    </div>
  )
}
