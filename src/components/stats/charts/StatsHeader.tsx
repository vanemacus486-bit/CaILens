import { ChevronLeft, ChevronRight } from 'lucide-react'

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
  /** 标题下方的一行小字，用于显示当前所处的日期区间 */
  subtitle?: React.ReactNode
  /**
   * tabs 与色条一起收进右上角控制区（趋势视图用）。
   * 其余复盘视图不传，保持原来的「标题 + 色条 / tabs 独占一行」布局。
   */
  inlineControls?: boolean
  /** 提供后渲染周期步进按钮：dir=-1 上一段，dir=1 下一段 */
  onStep?: (dir: -1 | 1) => void
  stepLabel?: { prev: string; next: string }
}

export function StatsHeader({
  title,
  segments,
  value,
  onChange,
  rail,
  subtitle,
  inlineControls = false,
  onStep,
  stepLabel,
}: StatsHeaderProps) {

  const tabs = !!segments && segments.length > 0 && (
    <div
      className="stats-header-row2 stats-lens-tabs scrubber"
      role="tablist"
      aria-label="复盘分析视角"
    >
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
  )

  // 步进按钮与 tabs 同处一个胶囊容器，渲染成一体化控件而不是三个独立方块
  const stepButton = (dir: -1 | 1) => {
    if (!onStep) return null
    const label = (dir === -1 ? stepLabel?.prev : stepLabel?.next) ?? (dir === -1 ? '上一段' : '下一段')
    return (
      <button
        type="button"
        className="stats-step-btn"
        aria-label={label}
        title={label}
        onClick={() => onStep(dir)}
      >
        {dir === -1
          ? <ChevronLeft size={13} strokeWidth={1.6} />
          : <ChevronRight size={13} strokeWidth={1.6} />}
      </button>
    )
  }

  const railNode = rail && (
    <div className="stats-header-b3-rail stats-header-rail">{rail}</div>
  )

  return (
    <header className={`stats-header-b3${inlineControls ? ' is-inline' : ''}`}>
      <div className="stats-header-b3-copy">
        <span>复盘视角</span>
        <h1 className="stats-header-title">{title}</h1>
        {subtitle && <p className="stats-header-subtitle">{subtitle}</p>}
      </div>

      {inlineControls ? (
        <div className="stats-header-controls">
          <div className={`stats-lens-cluster${onStep ? ' has-stepper' : ''}`}>
            {stepButton(-1)}
            {tabs}
            {stepButton(1)}
          </div>
          {railNode}
        </div>
      ) : (
        <>
          {tabs}
          {railNode}
        </>
      )}
    </header>
  )
}
