import type { ReactNode } from 'react'
import type { Granularity } from '@/hooks/useStatsAggregation'

type ViewMode = 'trend' | 'heatmap'

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
      style={{ backgroundColor: '#F1EADB', fontFamily: "'Noto Sans SC', sans-serif", color: '#2E2823' }}
    >
      {/* Sticky header */}
      <header
        className="sticky top-0 z-50 flex items-center gap-3 h-[52px] px-4 md:px-12 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(46,40,35,0.10)' }}
      >
        {/* Back link */}
        <a
          href="#/"
          className="inline-flex items-center justify-center w-8 h-8 rounded text-[#6F6453] hover:text-[#2E2823] transition-colors duration-200 flex-shrink-0 no-underline"
          style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 18 }}
        >
          &#8592;
        </a>

        {/* Brand */}
        <span
          className="flex-shrink-0 select-none"
          style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 20,
            fontStyle: 'italic',
            color: 'var(--c-active, #C8693E)',
            fontWeight: 600,
            transition: 'color 0.4s ease',
          }}
        >
          CaILens
        </span>

        <div style={{ width: 1, height: 20, backgroundColor: 'rgba(46,40,35,0.10)', flexShrink: 0 }} />

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
                  color: active ? '#2E2823' : '#A89B83',
                  borderBottom: active ? '1.5px solid var(--c-active, #C8693E)' : '1.5px solid transparent',
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
            <div style={{ width: 1, height: 20, backgroundColor: 'rgba(46,40,35,0.10)', flexShrink: 0 }} />
            <div
              className="flex gap-0 flex-shrink-0 rounded-full"
              style={{ backgroundColor: '#E8DFCC', padding: 4 }}
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
                      color: active ? '#2E2823' : '#A89B83',
                      backgroundColor: active ? '#F1EADB' : 'transparent',
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
            <div style={{ width: 1, height: 20, backgroundColor: 'rgba(46,40,35,0.10)', flexShrink: 0 }} />
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onNavigate(-1)}
                className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer transition-colors duration-200"
                style={{ fontSize: 16, color: '#6F6453' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#2E2823')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6F6453')}
              >
                &#8249;
              </button>
              <button
                onClick={onGoToday}
                className="px-2 py-1 rounded bg-transparent border-none cursor-pointer transition-colors duration-200"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", fontSize: 12, color: '#6F6453' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#2E2823')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6F6453')}
              >
                {t('今天', 'Today')}
              </button>
              <button
                onClick={() => onNavigate(1)}
                className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer transition-colors duration-200"
                style={{ fontSize: 16, color: '#6F6453' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#2E2823')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6F6453')}
              >
                &#8250;
              </button>
            </div>
          </>
        )}

        {period === 'all' && showNavigation && (
          <span
            className="flex-shrink-0"
            style={{ fontFamily: "'Noto Sans SC', sans-serif", fontSize: 13, color: '#A89B83' }}
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
