import { useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Bucket } from '@/hooks/useStatsAggregation'
import type { Category } from '@/domain/category'
import type { CategoryId } from '@/domain/category'
import { useEstimateStore } from '@/stores/estimateStore'
import { computeDeviations } from '@/domain/estimate'

interface EstimateVsActualProps {
  current: Bucket
  categories: Category[]
  weekStart: number
  language: 'zh' | 'en'
}

const ALL_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']
const DEVIATION_HIGHLIGHT = 30 // ±%

export function EstimateVsActual({ current, categories, weekStart, language }: EstimateVsActualProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const estimates = useEstimateStore((s) => s.estimates)
  const loadEstimates = useEstimateStore((s) => s.loadEstimates)
  const saveEstimate = useEstimateStore((s) => s.saveEstimate)
  const isLoaded = useEstimateStore((s) => s.isLoaded)

  useEffect(() => {
    void loadEstimates(weekStart)
  }, [loadEstimates, weekStart])

  const deviations = useMemo(() => {
    if (!isLoaded || estimates.length === 0) return null
    return computeDeviations(estimates, current.byCategory)
  }, [estimates, current.byCategory, isLoaded])

  const handleEstimateChange = (categoryId: CategoryId, value: number) => {
    if (value >= 0 && value <= 168) {
      void saveEstimate(weekStart, categoryId, value)
    }
  }

  // No estimates yet: show prompt
  if (isLoaded && estimates.length === 0) {
    return (
      <div className="bg-surface-raised border border-border-subtle p-6">
        <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
          {t('预估 vs 实际', 'Estimate vs. Actual')}
        </h3>
        <p className="text-[11px] text-text-tertiary mb-4">
          {t('预估本周各分类的时间，周末回来对比', 'Predict your time per category — compare at week end')}
        </p>

        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: `var(--event-${cat.id}-fill)` }}
              />
              <span className="text-[13px] text-text-primary flex-1">{cat.name[language]}</span>
              <input
                type="number"
                min={0}
                max={168}
                step={1}
                placeholder="0"
                onBlur={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) handleEstimateChange(cat.id, v)
                  else e.target.value = ''
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                className="w-14 px-2 py-1 text-xs font-mono text-text-primary bg-surface-base border border-border-subtle rounded-md text-center focus:outline-none focus:border-border-default"
              />
              <span className="text-[11px] text-text-tertiary w-4">h</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Has estimates: show comparison
  if (deviations) {
    return (
      <div className="bg-surface-raised border border-border-subtle p-6">
        <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
          {t('预估 vs 实际', 'Estimate vs. Actual')}
        </h3>
        <p className="text-[11px] text-text-tertiary mb-4">
          {t('对比预估与实际记录', 'Estimated vs. recorded hours')}
        </p>

        <div className="space-y-2.5">
          {ALL_IDS.map((id) => {
            const d = deviations.find((d) => d.categoryId === id)
            const cat = categories.find((c) => c.id === id)
            if (!d || (d.estimated === 0 && d.actual === 0)) return null
            const highDev = Math.abs(d.deviationPct) >= DEVIATION_HIGHLIGHT

            return (
              <div key={id} className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `var(--event-${id}-fill)` }}
                  />
                  <span className="text-[13px] text-text-primary truncate">{cat?.name[language] ?? id}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs flex-shrink-0">
                  <span className="text-text-secondary">
                    {t('预估', 'Est')} {d.estimated.toFixed(0)}h
                  </span>
                  <span className="text-text-tertiary">/</span>
                  <span className="text-text-primary font-semibold">
                    {t('实际', 'Act')} {d.actual.toFixed(1)}h
                  </span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-sm text-[10px]',
                    highDev
                      ? d.deviation > 0
                        ? 'text-color-text-danger bg-surface-sunken'
                        : 'text-[#B8823A] bg-[#F5EDD8]'
                      : 'text-text-tertiary',
                  )}>
                    {d.deviation >= 0 ? '+' : ''}{d.deviation.toFixed(1)}h ({d.deviationPct >= 0 ? '+' : ''}{d.deviationPct}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}
