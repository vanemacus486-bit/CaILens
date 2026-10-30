export interface SegmentedOption {
  id: string
  label: string
}

interface StatsHeaderProps {
  title: string
  segments?: SegmentedOption[]
  value?: string
  onChange?: (id: string) => void
  rail?: React.ReactNode
}

export function StatsHeader({ title, segments, value, onChange, rail }: StatsHeaderProps) {
  return (
    <header className="stats-header-b3">
      <div className="stats-header-b3-copy">
        <span>复盘视角</span>
        <h1 className="stats-header-title">{title}</h1>
      </div>
      {segments && segments.length > 0 && (
        <div className="stats-header-row2 stats-lens-tabs scrubber" role="tablist" aria-label="复盘分析视角">
          {segments.map((segment) => (
            <button
              key={segment.id}
              type="button"
              role="tab"
              aria-label={segment.label}
              aria-selected={segment.id === value}
              aria-current={segment.id === value ? 'true' : undefined}
              className={`scrubber-zone${segment.id === value ? ' is-active' : ''}`}
              onClick={() => onChange?.(segment.id)}
            >
              {segment.label}
            </button>
          ))}
        </div>
      )}
      {rail && <div className="stats-header-b3-rail stats-header-rail">{rail}</div>}
    </header>
  )
}
