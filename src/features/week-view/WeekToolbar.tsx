import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { BarChart3, Menu, Search, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatISODate, formatMonthDay, getWeekStart, isSameDay } from '@/domain/time'
import { addDays } from 'date-fns'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { QuickLogTrigger } from '@/features/quick-log'
import { AnalyzeButton } from '@/features/ai-analysis'
import { MobileMenu } from './MobileMenu'

interface WeekToolbarProps {
  weekStart: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onQuickLog: () => void
  mobileViewMode?: 'day' | 'week'
  onMobileViewModeChange?: (mode: 'day' | 'week') => void
}

export function WeekToolbar({
  weekStart,
  onPrev,
  onNext,
  onToday,
  onQuickLog,
  mobileViewMode,
  onMobileViewModeChange,
}: WeekToolbarProps) {
  const navigate = useNavigate()
  const language = useAppSettingsStore((s) => s.settings.language)
  const setSettingsDrawerOpen = useUIStore((s) => s.setSettingsDrawerOpen)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  const weekEnd = addDays(weekStart, 6)
  const weekNum = getISOWeek(weekStart)
  const rangeLabel = `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}`
  const currentWeekStart = getWeekStart(new Date(), 1)
  const isCurrentWeek = isSameDay(weekStart, currentWeekStart)

  return (
    <>
      {isMobile ? (
        <div className="flex items-center justify-between px-3 py-3 border-b border-border-subtle flex-shrink-0">
          {/* Left: hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200"
            aria-label="Menu"
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>

          {/* Center: compact date range */}
          <div className="text-center">
            <span className="font-serif text-sm font-medium text-text-primary">
              {formatMonthDay(weekStart)} – {formatMonthDay(weekEnd)}
            </span>
          </div>

          {/* Right: add event */}
          <QuickLogTrigger onClick={onQuickLog} />

          <MobileMenu
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            weekStart={weekStart}
            mobileViewMode={mobileViewMode}
            onMobileViewModeChange={onMobileViewModeChange}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 md:px-7 py-3 border-b border-border-subtle flex-shrink-0 gap-2">
          {/* Left: Logo + tagline */}
          <div className="hidden md:flex items-baseline gap-2.5 select-none">
            <span className="font-serif text-[22px] font-semibold text-text-primary tracking-[-0.01em]">
              CaILens
            </span>
            <span className="font-serif text-body-sm text-text-secondary italic">
              — time, recorded
            </span>
          </div>

          {/* Center: Navigation */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onPrev}
              aria-label="Previous week"
              className="w-7 h-7 max-sm:min-w-[44px] max-sm:min-h-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer text-lg leading-none"
            >
              ‹
            </button>

            <div className="text-center md:min-w-[180px]">
              <span className="hidden md:inline font-serif text-base font-medium text-text-primary">
                {t(`第 ${weekNum} 周`, `Week ${weekNum}`)}
              </span>
              <span className="font-mono text-xs text-text-secondary md:ml-2 whitespace-nowrap">
                {rangeLabel}
              </span>
            </div>

            <button
              onClick={onNext}
              aria-label="Next week"
              className="w-7 h-7 max-sm:min-w-[44px] max-sm:min-h-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer text-lg leading-none"
            >
              ›
            </button>

            <div className="w-px h-5 bg-border-subtle mx-2" />

            {/* Search */}
            <button
              onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
              aria-label={t('搜索事件', 'Search events')}
              className={cn(
                'w-7 h-7 max-sm:min-w-[44px] max-sm:min-h-[44px] flex items-center justify-center rounded-md transition-colors duration-200',
                'text-text-secondary hover:text-text-primary hover:bg-surface-sunken cursor-pointer',
              )}
            >
              <Search size={14} strokeWidth={1.75} />
            </button>

            <QuickLogTrigger onClick={onQuickLog} />

            <button
              onClick={onToday}
              disabled={isCurrentWeek}
              className={cn(
                'h-[30px] max-sm:min-h-[44px] px-3 rounded-md text-xs font-sans font-medium transition-colors duration-200',
                isCurrentWeek
                  ? 'text-text-tertiary cursor-not-allowed'
                  : 'text-text-secondary bg-surface-sunken border border-border-subtle hover:text-text-primary hover:bg-surface-raised cursor-pointer',
              )}
            >
              {t('今天', 'Today')}
            </button>

          </div>

          {/* Right: Global icon buttons + View switcher pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/stats')}
              aria-label={t('统计', 'Stats')}
              className="w-8 h-8 max-sm:min-w-[44px] max-sm:min-h-[44px] flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer"
            >
              <BarChart3 size={16} strokeWidth={1.75} />
            </button>
            <AnalyzeButton weekStart={weekStart} />
            <button
              onClick={() => setSettingsDrawerOpen(true)}
              aria-label="Settings"
              className="w-8 h-8 max-sm:min-w-[44px] max-sm:min-h-[44px] flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer"
            >
              <Settings size={16} strokeWidth={1.75} />
            </button>

            <div className="w-px h-5 bg-border-subtle mx-1" />

            <div className="flex gap-1">
            <button
              onClick={() => navigate('/')}
              className={cn(
                'font-sans text-xs font-medium rounded-md px-2.5 py-1 max-sm:min-w-[44px] max-sm:min-h-[44px] transition-colors duration-200 cursor-pointer',
                'bg-accent-light border border-accent/30 text-accent',
              )}
            >
              W
            </button>
            <button
              onClick={() => navigate(`/day?date=${formatISODate(new Date())}`)}
              className="font-sans text-xs font-normal rounded-md px-2.5 py-1 max-sm:min-w-[44px] max-sm:min-h-[44px] transition-colors duration-200 cursor-pointer text-text-secondary hover:text-text-primary hover:bg-surface-sunken border border-transparent"
            >
              D
            </button>
          </div>
          </div>

        </div>
      )}
    </>
  )
}
