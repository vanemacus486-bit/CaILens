import type { Bucket } from '@/hooks/useStatsAggregation'
import type { CategoryId } from '@/domain/category'
import { useCategoryColors } from '@/constants/categoryColors'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

const CAT_NAMES: Record<CategoryId, string> = {
  accent: 'Core Work',
  sage: 'Support Work',
  sand: 'Essentials',
  sky: 'Reading & Study',
  rose: 'Rest',
  stone: 'Other',
}

interface MonthCompareCardsProps {
  current: Bucket
  previous: Bucket | null
}

function UpArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M5,1 L9,7 L1,7 Z" fill="currentColor" />
    </svg>
  )
}

function DownArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M5,9 L9,3 L1,3 Z" fill="currentColor" />
    </svg>
  )
}

interface ChangeIndicatorProps {
  currHrs: number
  prevHrs: number
}

function ChangeIndicator({ currHrs, prevHrs }: ChangeIndicatorProps) {
  const deltaHrs = currHrs - prevHrs
  const deltaPct = prevHrs > 0 ? Math.round((deltaHrs / prevHrs) * 100) : null

  // Previous = 0, current = 0
  if (prevHrs === 0 && currHrs === 0) {
    return <span style={{ color: 'var(--text-tertiary)' }}>— 0%</span>
  }

  // Previous = 0, current > 0
  if (prevHrs === 0 && currHrs > 0) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--color-text-success)' }}>
        <UpArrow /> —
      </span>
    )
  }

  // deltaPct is guaranteed to be non-null here since prevHrs > 0
  if (Math.abs(deltaPct!) < 1) {
    return <span style={{ color: 'var(--text-tertiary)' }}>— 0%</span>
  }

  if (deltaPct! >= 1) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--color-text-success)' }}>
        <UpArrow /> {deltaPct}%
      </span>
    )
  }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--color-text-danger)' }}>
      <DownArrow /> {Math.abs(deltaPct!)}
    </span>
  )
}

function generateInsight(current: Bucket, previous: Bucket | null): string | null {
  if (!previous) return null

  const deltas = CATEGORY_IDS.map((id) => ({
    id,
    name: CAT_NAMES[id],
    delta: current.byCategory[id] - previous.byCategory[id],
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const [a, b] = deltas
  if (Math.abs(a.delta) < 2) return null

  const verb = (d: number) => (d > 0 ? 'increased' : 'decreased')

  let msg = `${a.name} ${verb(a.delta)} ${Math.abs(a.delta).toFixed(1)}h`
  if (Math.abs(b.delta) >= 2) {
    msg += `, ${b.name} ${verb(b.delta)} ${Math.abs(b.delta).toFixed(1)}h`
  }

  if (a.id === 'accent' && a.delta < 0 && b.id === 'rose' && b.delta < 0) {
    msg += ' — Crunch time?'
  } else if (a.id === 'sky' && a.delta > 0) {
    msg += ' — Learning investment increasing, great!'
  } else {
    msg += ' — Does this match your expectations?'
  }

  return msg
}

export function MonthCompareCards({ current, previous }: MonthCompareCardsProps) {
  const colors = useCategoryColors()

  if (!previous) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 13,
        }}
      >
        Needs at least 2 months of data for comparison
      </div>
    )
  }

  const insight = generateInsight(current, previous)

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {CATEGORY_IDS.map((id) => {
          const prevHrs = previous.byCategory[id]
          const currHrs = current.byCategory[id]
          return (
            <div
              key={id}
              style={{
                background: 'var(--surface-raised)',
                borderRadius: 12,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: colors[id].fill,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    fontFamily: 'serif',
                  }}
                >
                  {CAT_NAMES[id]}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    fontFamily: 'mono',
                  }}
                >
                  {currHrs.toFixed(1)}h
                </span>
                <ChangeIndicator currHrs={currHrs} prevHrs={prevHrs} />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  marginTop: 4,
                }}
              >
                Prev: {prevHrs.toFixed(1)}h
              </div>
            </div>
          )
        })}
      </div>
      {insight && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            background: 'var(--color-bg-info)',
            borderRadius: 12,
            fontSize: 13,
            color: 'var(--color-text-info)',
          }}
        >
          {insight}
        </div>
      )}
    </div>
  )
}
