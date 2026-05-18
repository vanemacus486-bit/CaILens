import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Granularity } from '@/hooks/useStatsAggregation'

type ViewMode = 'trend' | 'heatmap' | 'sleep' | 'gaps' | 'type'

const PERIODS: { key: Granularity; label: string; labelZh: string }[] = [
  { key: 'week', label: 'Week', labelZh: '周' },
  { key: 'month', label: 'Month', labelZh: '月' },
  { key: 'quarter', label: 'Quarter', labelZh: '季' },
  { key: 'year', label: 'Year', labelZh: '年' },
  { key: 'all', label: 'All-time', labelZh: '全部' },
]

const VIEWS: { key: ViewMode; label: string; labelZh: string }[] = [
  { key: 'trend', label: 'Trend', labelZh: '趋势' },
  { key: 'heatmap', label: 'Heatmap', labelZh: '热力图' },
  { key: 'sleep', label: 'Sleep', labelZh: '睡眠' },
  { key: 'gaps', label: 'Gaps', labelZh: '缺口' },
  { key: 'type', label: 'I/II', labelZh: 'I/II型' },
]

interface EasternStatsShellProps {
  language: 'zh' | 'en'
  currentView: ViewMode
  onViewChange: (v: ViewMode) => void
  period?: Granularity
  onPeriodChange?: (p: Granularity) => void
  onNavigate?: (dir: -1 | 1) => void
  onGoToday?: () => void
  showNavigation?: boolean
  children: ReactNode
}

export function EasternStatsShell({
  language,
  currentView,
  onViewChange,
  period,
  onPeriodChange,
  onNavigate,
  onGoToday,
  showNavigation,
  children,
}: EasternStatsShellProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--stats-shell-bg)', fontFamily: "'Noto Sans SC', sans-serif", color: 'var(--stats-shell-ink-1)' }}
    >
      {/* Sticky header */}
      <header
        className="sticky top-0 z-50 flex items-center gap-3 h-[52px] px-4 md:px-12 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--stats-shell-rule)' }}
      >
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-sans text-[var(--stats-shell-ink-2)] hover:text-[var(--stats-shell-ink-1)] transition-colors duration-200 flex-shrink-0 no-underline"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          <span>{t('返回日历', 'Back to calendar')}</span>
        </Link>

        <div style={{ width: 1, height: 20, backgroundColor: 'var(--stats-shell-rule)', flexShrink: 0 }} />

        {/* View tabs */}
        <div className="flex gap-0 flex-shrink-0" style={{ height: 52 }}>
          {VIEWS.map((v) => {
            const active = currentView === v.key
            return (
              <button
                key={v.key}
                onClick={() => onViewChange(v.key)}
                className="px-3 flex items-center bg-transparent border-none cursor-pointer transition-colors duration-200"
                style={{
                  fontFamily: "'Noto Sans SC', sans-serif",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--stats-shell-ink-1)' : 'var(--stats-shell-ink-3)',
                  borderBottom: active ? '1.5px solid var(--c-active)' : '1.5px solid transparent',
                  transition: 'color 0.25s ease, border-color 0.4s ease',
                }}
              >
                {language === 'zh' ? v.labelZh : v.label}
              </button>
            )
          })}
        </div>

        {/* Period selector (hidden for heatmap) */}
        {onPeriodChange && period && showNavigation !== false && (
          <>
            <div style={{ width: 1, height: 20, backgroundColor: 'var(--stats-shell-rule)', flexShrink: 0 }} />
            <div
              className="flex gap-0 flex-shrink-0 rounded-full"
              style={{ backgroundColor: 'var(--stats-shell-pill-bg)', padding: 4 }}
            >
              {PERIODS.map((p) => {
                const active = period === p.key
                return (
                  <button
                    key={p.key}
                    onClick={() => onPeriodChange(p.key)}
                    className="px-2.5 py-1 rounded-full bg-transparent border-none cursor-pointer transition-colors duration-200"
                    style={{
                      fontFamily: "'Noto Sans SC', sans-serif",
                      fontSize: 12,
                      fontWeight: active ? 600 : 400,
                      color: active ? 'var(--stats-shell-ink-1)' : 'var(--stats-shell-ink-3)',
                      backgroundColor: active ? 'var(--stats-shell-bg)' : 'transparent',
                    }}
                  >
                    {language === 'zh' ? p.labelZh : p.label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Navigation arrows */}
        {onNavigate && onGoToday && showNavigation && period !== 'all' && (
          <>
            <div style={{ width: 1, height: 20, backgroundColor: 'var(--stats-shell-rule)', flexShrink: 0 }} />
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onNavigate(-1)}
                className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer transition-colors duration-200"
                style={{ fontSize: 16, color: 'var(--stats-shell-ink-2)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--stats-shell-ink-1)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--stats-shell-ink-2)')}
              >
                &#8249;
              </button>
              <button
                onClick={onGoToday}
                className="px-2 py-1 rounded bg-transparent border-none cursor-pointer transition-colors duration-200"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", fontSize: 12, color: 'var(--stats-shell-ink-2)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--stats-shell-ink-1)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--stats-shell-ink-2)')}
              >
                {t('今天', 'Today')}
              </button>
              <button
                onClick={() => onNavigate(1)}
                className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer transition-colors duration-200"
                style={{ fontSize: 16, color: 'var(--stats-shell-ink-2)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--stats-shell-ink-1)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--stats-shell-ink-2)')}
              >
                &#8250;
              </button>
            </div>
          </>
        )}

        {period === 'all' && showNavigation && (
          <span
            className="flex-shrink-0"
            style={{ fontFamily: "'Noto Sans SC', sans-serif", fontSize: 13, color: 'var(--stats-shell-ink-3)' }}
          >
            {t('全部时间', 'All time')}
          </span>
        )}
      </header>

      {/* Content area */}
      <section className="flex-1 overflow-y-auto flex flex-col">
        <div className="max-w-[1100px] mx-auto px-4 md:px-12 pt-12 pb-20 flex-1 flex flex-col w-full">
          {children}
        </div>
      </section>
    </div>
  )
}
