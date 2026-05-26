import { cn } from '@/lib/utils'

// ── ChoresPanel ─────────────────────────────────────────

interface ChoresPanelProps {
  onSelectMeal:   () => void
  onSelectWash:   () => void
  onSelectShower: () => void
  onSelectClean:  () => void
  language: 'zh' | 'en'
}

export function ChoresPanel({ onSelectMeal, onSelectWash, onSelectShower, onSelectClean, language }: ChoresPanelProps) {
    return (
    <div className="flex flex-wrap gap-2 mt-3">
      <button
        onClick={onSelectMeal}
        className={choreBtn}
      >
        <span className="text-base leading-none">🍚</span>
        <span className="text-xs">{'吃饭'}</span>
      </button>
      <button
        onClick={onSelectWash}
        className={choreBtn}
      >
        <span className="text-base leading-none">🪥</span>
        <span className="text-xs">{'洗漱'}</span>
      </button>
      <button
        onClick={onSelectShower}
        className={choreBtn}
      >
        <span className="text-base leading-none">🚿</span>
        <span className="text-xs">{'洗澡'}</span>
      </button>
      <button
        onClick={onSelectClean}
        className={choreBtn}
      >
        <span className="text-base leading-none">🧹</span>
        <span className="text-xs">{'打扫'}</span>
      </button>
    </div>
  )
}

const choreBtn = cn(
  'flex items-center gap-1.5 px-3 py-2 rounded-lg',
  'bg-[var(--event-sand-bg)] text-[var(--event-sand-text)]',
  'border border-transparent hover:border-[var(--event-sand-fill)]',
  'transition-all duration-150 cursor-pointer',
)

// ── MealFoodPanel ───────────────────────────────────────

interface MealFoodPanelProps {
  foodInput:  string
  onChange:   (value: string) => void
  recentFoods: string[]
  onSelect:   (food: string) => void
  language:   'zh' | 'en'
}

export function MealFoodPanel({ foodInput, onChange, recentFoods, onSelect, language }: MealFoodPanelProps) {
    return (
    <div className="animate-slide-down mt-2">
      <div className="font-serif text-sm text-text-secondary italic mb-2">
        {'吃了什么？'}
      </div>
      <input
        autoFocus
        value={foodInput}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'例如：牛肉面'}
        className={cn(
          'w-full font-sans text-sm text-text-primary',
          'bg-surface-sunken border border-border-subtle rounded-md',
          'px-3 py-2',
          'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'placeholder:text-text-tertiary transition-colors duration-150',
        )}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            // Enter here is handled by the parent FloatingEventCard
          }
        }}
      />
      {recentFoods.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {recentFoods.map((food) => (
            <button
              key={food}
              onClick={() => onSelect(food)}
              className="text-xs text-text-secondary bg-surface-sunken border border-border-subtle rounded-full px-2.5 py-1 hover:bg-surface-base transition-colors cursor-pointer"
            >
              {food}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── GrowthPanel ─────────────────────────────────────────

interface GrowthPanelProps {
  onSelectRead:   () => void
  onSelectSport:  () => void
  language: 'zh' | 'en'
}

export function GrowthPanel({ onSelectRead, onSelectSport, language }: GrowthPanelProps) {
    return (
    <div className="flex flex-wrap gap-2 mt-3">
      <button onClick={onSelectRead} className={growthBtn}>
        <span className="text-base leading-none">📖</span>
        <span className="text-xs">{'阅读'}</span>
      </button>
      <button onClick={onSelectSport} className={growthBtn}>
        <span className="text-base leading-none">🏋️</span>
        <span className="text-xs">{'运动'}</span>
      </button>
    </div>
  )
}

const growthBtn = cn(
  'flex items-center gap-1.5 px-3 py-2 rounded-lg',
  'bg-[var(--event-sky-bg)] text-[var(--event-sky-text)]',
  'border border-transparent hover:border-[var(--event-sky-fill)]',
  'transition-all duration-150 cursor-pointer',
)

// ── GrowthSubPanel ─────────────────────────────────────

interface GrowthSubPanelProps {
  subMode: 'read' | 'sport'
  input:   string
  onChange: (value: string) => void
  recent:  string[]
  onSelect: (value: string) => void
  onSubmit?: () => void
  language: 'zh' | 'en'
}

export function GrowthSubPanel({ subMode, input, onChange, recent, onSelect, onSubmit, language }: GrowthSubPanelProps) {
    const prompt = subMode === 'read'
    ? '读了什么？'
    : '做了什么运动？'
  const placeholder = subMode === 'read'
    ? '例如：百年孤独'
    : '例如：跑步 5km'

  return (
    <div className="animate-slide-down mt-2">
      <div className="font-serif text-sm text-text-secondary italic mb-2">{prompt}</div>
      <input
        autoFocus
        value={input}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSubmit?.()
          }
        }}
        className={cn(
          'w-full font-sans text-sm text-text-primary',
          'bg-surface-sunken border border-border-subtle rounded-md',
          'px-3 py-2',
          'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'placeholder:text-text-tertiary transition-colors duration-150',
        )}
      />
      {recent.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {recent.map((item) => (
            <button
              key={item}
              onClick={() => onSelect(item)}
              className="text-xs text-text-secondary bg-surface-sunken border border-border-subtle rounded-full px-2.5 py-1 hover:bg-surface-base transition-colors cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── LeisurePanel ────────────────────────────────────────

interface LeisurePanelProps {
  recentLeisure: string[]
  onSelect: (title: string) => void
  language: 'zh' | 'en'
}

export function LeisurePanel({ recentLeisure, onSelect, language }: LeisurePanelProps) {
    if (recentLeisure.length === 0) return null
  return (
    <div className="mt-3">
      <div className="text-xs text-text-tertiary mb-1.5 font-sans">{'最近放松'}</div>
      <div className="flex flex-wrap gap-1.5">
        {recentLeisure.map((item) => (
          <button
            key={item}
            onClick={() => onSelect(item)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs',
              'bg-[var(--event-rose-bg)] text-[var(--event-rose-text)]',
              'border border-transparent hover:border-[var(--event-rose-fill)]',
              'transition-all duration-150 cursor-pointer',
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── SleepPanel ──────────────────────────────────────────

interface SleepPanelProps {
  sleepType: 'main' | 'nap' | 'insomnia'
  quality:   1 | 2 | 3 | 4 | 5 | null
  onChangeSleepType:  (type: 'main' | 'nap' | 'insomnia') => void
  onChangeQuality:    (q: 1 | 2 | 3 | 4 | 5) => void
  language: 'zh' | 'en'
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

export function SleepPanel({ sleepType, quality, onChangeSleepType, onChangeQuality, language }: SleepPanelProps) {
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
          😴 {'主睡眠'}
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
              <span className="text-[10px] leading-tight">{isSelected ? label[language === 'zh' ? 0 : 1] : ''}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
