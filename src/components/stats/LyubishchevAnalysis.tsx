import type { Bucket } from '@/hooks/useStatsAggregation'
import type { Category } from '@/domain/category'
import type { TypeSplit } from '@/domain/stats'
import type { CalendarEvent } from '@/domain/event'

interface LyubishchevAnalysisProps {
  current: Bucket
  typeSplit: TypeSplit
  rangeEvents: readonly CalendarEvent[]
  categories: Category[]
  language: 'zh' | 'en'
}

const TYPE_I_IDS = ['accent', 'sky'] as const
const TYPE_II_IDS = ['sage', 'sand', 'rose', 'stone'] as const

export function LyubishchevAnalysis({
  current, typeSplit, rangeEvents, categories, language,
}: LyubishchevAnalysisProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  // Cumulative hours per category
  const cumulatives = [...TYPE_I_IDS, ...TYPE_II_IDS].map((id) => {
    const cat = categories.find((c) => c.id === id)
    const total = current.byCategory[id] || 0
    const goal = 100 // aspirational target
    const pct = Math.min((total / goal) * 100, 100)
    return { id, name: cat?.name[language] ?? id, hours: total, goal, pct }
  })

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Type I / Type II Split */}
      <div className="bg-surface-raised border border-border-subtle p-6">
        <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
          {t('Type I / Type II 分离', 'Type I / Type II Split')}
        </h3>
        <p className="text-[11px] text-text-tertiary mb-4">
          {t('核心创造性工作 vs 辅助与恢复', 'Core creative work vs. auxiliary and recovery')}
        </p>

        {/* Stacked bar */}
        <div className="flex gap-0.5 h-2 rounded overflow-hidden mb-2 mt-3">
          <div
            className="rounded-l"
            style={{
              width: `${typeSplit.typeI.pct}%`,
              backgroundColor: 'var(--event-accent-fill)',
            }}
          />
          <div
            className="rounded-r"
            style={{
              width: `${typeSplit.typeII.pct}%`,
              backgroundColor: 'var(--event-sage-fill)',
            }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-mono text-text-secondary mb-4">
          <span style={{ color: 'var(--event-accent-fill)' }}>{typeSplit.typeI.pct}%</span>
          <span style={{ color: 'var(--event-sage-fill)' }}>{typeSplit.typeII.pct}%</span>
        </div>

        {[
          {
            label: t('Type I — 创造性核心', 'Type I — Creative Core'),
            value: typeSplit.typeI.hours,
            color: 'var(--event-accent-fill)',
            items: categories.filter(c => TYPE_I_IDS.includes(c.id as any)).map(c => c.name[language]).join(', '),
          },
          {
            label: t('Type II — 辅助', 'Type II — Auxiliary'),
            value: typeSplit.typeII.hours,
            color: 'var(--event-sage-fill)',
            items: categories.filter(c => TYPE_II_IDS.includes(c.id as any)).map(c => c.name[language]).join(', '),
          },
        ].map((tItem, i) => (
          <div key={i} className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tItem.color }} />
              <span className="font-serif italic text-[13px] text-text-primary">{tItem.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[22px] font-bold text-text-primary">{tItem.value.toFixed(1)}</span>
              <span className="text-[11px] text-text-tertiary">h — {tItem.items}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Category Cumulative Hours */}
      <div className="bg-surface-raised border border-border-subtle p-6">
        <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
          {t('分类累计小时', 'Category Cumulative Hours')}
        </h3>
        <p className="text-[11px] text-text-tertiary mb-4">
          {t('从首次记录到现在的累计', 'Running totals from first entry')}
        </p>

        {cumulatives.map((c, i) => (
          <div key={c.id} className="mb-[18px]">
            <div className="text-[13px] text-text-primary mb-1.5 font-medium">{c.name}</div>
            <div className="relative h-[5px] bg-surface-sunken rounded-sm">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${c.pct}%`,
                  backgroundColor: `var(--event-${c.id}-fill)`,
                  opacity: 0.85,
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className="font-mono text-[13px] font-semibold text-text-primary">
                {c.hours.toFixed(1)}
                <span className="text-[10px] font-normal text-text-tertiary">h / {c.goal}h goal</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
