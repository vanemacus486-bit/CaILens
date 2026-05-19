import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
type ViewMode = 'trend' | 'heatmap' | 'sleep'

const VIEWS: { key: ViewMode; label: string; labelZh: string }[] = [
  { key: 'trend', label: 'Trend', labelZh: '趋势' },
  { key: 'sleep', label: 'Sleep', labelZh: '睡眠' },
  { key: 'heatmap', label: 'Heatmap', labelZh: '热力图' },
]

interface EasternStatsShellProps {
  language: 'zh' | 'en'
  currentView: ViewMode
  onViewChange: (v: ViewMode) => void
  children: ReactNode
}

export function EasternStatsShell({
  language,
  currentView,
  onViewChange,
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
      </header>

      {/* Content area (scrollable) */}
      <section className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-4 md:px-12 pt-12 pb-8 w-full">
          {children}
        </div>
      </section>


    </div>
  )
}
