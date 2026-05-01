import { cn } from '@/lib/utils'
import type { DataMaturity } from '@/domain/maturity'
import type { PeriodMultiplier } from '@/domain/projection'
import { computeAnnualProjection } from '@/domain/projection'

interface OverviewCardsProps {
  netEffective: number
  deepWork: number
  streak: number
  monthTotal: number
  netEffectiveDelta: number | null
  deepWorkDelta: number | null
  monthTotalDelta: number | null
  language: 'zh' | 'en'
  maturity: DataMaturity
  periodType: PeriodMultiplier | 'all'
}

function OvCard({ label, value, unit, delta, cold, footer }: {
  label: string
  value: string
  unit: string
  delta: number | null
  cold: boolean
  footer?: string
}) {
  const up = delta !== null && delta >= 0
  const dn = delta !== null && delta < 0

  return (
    <div className="bg-surface-raised border border-border-subtle px-[22px] py-5">
      <div className="text-[11px] font-sans text-text-tertiary tracking-[0.04em] uppercase mb-2 select-none">
        {label}
      </div>
      <div className="font-mono text-[32px] font-bold text-text-primary leading-none">
        {value}
        <span className="text-sm font-normal text-text-tertiary ml-0.5">{unit}</span>
      </div>
      {delta !== null && !cold && (
        <div className="mt-2">
          <span className={cn(
            'text-[11px] font-mono px-1.5 py-0.5 rounded-sm',
            up ? 'text-[#7A9448] bg-[#ECF0E4]' : '',
            dn ? 'text-[#9E7A5A] bg-[#F0E8DC]' : '',
          )}>
            {up ? '↑' : dn ? '↓' : ''} {Math.abs(delta).toFixed(1)}{unit}
          </span>
        </div>
      )}
      {footer && (
        <div className="mt-2 text-[10px] text-text-tertiary leading-tight">
          {footer}
        </div>
      )}
    </div>
  )
}

export function OverviewCards({
  netEffective,
  deepWork,
  streak,
  monthTotal,
  netEffectiveDelta,
  deepWorkDelta,
  monthTotalDelta,
  language,
  maturity,
  periodType,
}: OverviewCardsProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const cold = maturity.maturityLevel === 'cold'
  const warming = maturity.maturityLevel !== 'cold'

  const deepWorkFooter = (warming && deepWork > 0 && periodType !== 'all')
    ? (() => {
        const proj = computeAnnualProjection(deepWork, 0, periodType)
        return language === 'zh'
          ? `相当于全年 ${proj.typeIAnnual.toFixed(0)}h · 柳比歇夫年均的 ${proj.ratio}%`
          : `Annualized: ${proj.typeIAnnual.toFixed(0)}h · ${proj.ratio}% of Lyubishchev's avg`
      })()
    : undefined

  return (
    <div className="grid grid-cols-4 gap-4">
      <OvCard
        label={t('净有效时间', 'Net Effective Time')}
        value={netEffective.toFixed(1)}
        unit="h"
        delta={netEffectiveDelta}
        cold={cold}
      />
      <OvCard
        label={t('主要矛盾', 'Core Focus')}
        value={deepWork.toFixed(1)}
        unit="h"
        delta={deepWorkDelta}
        cold={cold}
        footer={deepWorkFooter}
      />
      <OvCard
        label={t('连续记录', 'Tracking Streak')}
        value={String(streak)}
        unit={t('天', 'days')}
        delta={null}
        cold={cold}
      />
      <OvCard
        label={t('本期累计', 'Period Total')}
        value={monthTotal.toFixed(1)}
        unit="h"
        delta={monthTotalDelta}
        cold={cold}
      />
    </div>
  )
}
