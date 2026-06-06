import { cn } from '@/lib/utils'

// ── SleepPanel ──────────────────────────────────────────

interface SleepPanelProps {
  sleepType: 'main' | 'nap' | 'insomnia'
  quality:   1 | 2 | 3 | 4 | 5 | null
  onChangeSleepType:  (type: 'main' | 'nap' | 'insomnia') => void
  onChangeQuality:    (q: 1 | 2 | 3 | 4 | 5) => void
}

const QUALITY_EMOJIS: Record<number, string> = {
  1: '😩',
  2: '😞',
  3: '🙂',
  4: '😊',
  5: '😌',
}

const QUALITY_LABELS: Record<number, [string, string]> = {
  1: ['很差', 'Awful'],
  2: ['不好', 'Poor'],
  3: ['一般', 'Fair'],
  4: ['良好', 'Good'],
  5: ['很好', 'Great'],
}

export function SleepPanel({ sleepType, quality, onChangeSleepType, onChangeQuality }: SleepPanelProps) {
    return (
    <div className="animate-slide-down mt-2">
      {/* Type toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onChangeSleepType('main')}
          className={cn(
            'flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
            sleepType === 'main'
              ? 'bg-[var(--event-stone-bg)] text-[var(--event-stone-text)] ring-1 ring-[var(--event-stone-fill)]'
              : 'bg-surface-sunken text-text-tertiary hover:bg-surface-base',
          )}
        >
          😴 {'睡觉'}
        </button>
        <button
          onClick={() => onChangeSleepType('nap')}
          className={cn(
            'flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
            sleepType === 'nap'
              ? 'bg-[var(--event-stone-bg)] text-[var(--event-stone-text)] ring-1 ring-[var(--event-stone-fill)]'
              : 'bg-surface-sunken text-text-tertiary hover:bg-surface-base',
          )}
        >
          💤 {'小睡'}
        </button>
        <button
          onClick={() => onChangeSleepType('insomnia')}
          className={cn(
            'flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
            sleepType === 'insomnia'
              ? 'bg-[var(--event-stone-bg)] text-[var(--event-stone-text)] ring-1 ring-[var(--event-stone-fill)]'
              : 'bg-surface-sunken text-text-tertiary hover:bg-surface-base',
          )}
        >
          🌙 {'失眠'}
        </button>
      </div>

      {/* Quality picker */}
      <div className="text-xs text-text-tertiary mb-2 font-sans">{'睡眠质量'}</div>
      <div className="flex justify-between gap-1">
        {([1, 2, 3, 4, 5] as const).map((q) => {
          const isSelected = quality === q
          const label = QUALITY_LABELS[q]
          return (
            <button
              key={q}
              onClick={() => onChangeQuality(q)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all duration-200 cursor-pointer',
                isSelected
                  ? 'bg-surface-raised ring-1 ring-text-secondary scale-105'
                  : 'bg-surface-sunken text-text-tertiary hover:bg-surface-base',
              )}
            >
              <span className="text-lg leading-none">{QUALITY_EMOJIS[q]}</span>
              <span className="text-[10px] leading-tight">{isSelected ? label[0] : ''}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
