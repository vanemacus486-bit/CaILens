import type { Bucket } from '@/hooks/useStatsAggregation'
import type { Category } from '@/domain/category'
import type { DataMaturity } from '@/domain/maturity'
import { generateWeeklyReflection } from '@/domain/reflection'

interface WeekInReviewProps {
  current: Bucket
  previous: Bucket | null
  categories: Category[]
  language: 'zh' | 'en'
  maturity: DataMaturity
}

export function WeekInReview({ current, previous, categories, language, maturity }: WeekInReviewProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const sentences = generateWeeklyReflection({
    current: {
      total: current.total,
      byCategory: current.byCategory,
    },
    previous: previous ? {
      total: previous.total,
      byCategory: previous.byCategory,
    } : null,
    categories,
    maturity,
    language,
  })

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
        {sentences.map((s, i) => {
          const isLast = i === sentences.length - 1
          return (
            <p
              key={i}
              className={`text-[15px] leading-[1.78] ${isLast ? 'text-text-secondary italic' : 'text-text-primary'}`}
            >
              {s}
            </p>
          )
        })}
      </div>
    </div>
  )
}
