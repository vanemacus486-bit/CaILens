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
  // Standard week
  isStandardWeek: boolean
  onToggleStandardWeek: () => void
  standardWeekRange: '4w' | '12w' | 'all'
  onStandardWeekRangeChange: (range: '4w' | '12w' | 'all') => void
  hideSleep: boolean
  onHideSleepChange: (hide: boolean) => void
  standardWeekSpanWeeks: number
}

export function WeekToolbar({
  weekStart,
  onPrev,
  onNext,
  onToday,
  onQuickLog,
  mobileViewMode,
  onMobileViewModeChange,
  isStandardWeek,
  onToggleStandardWeek,
  standardWeekRange,
  onStandardWeekRangeChange,
  hideSleep,
  onHideSleepChange,
  standardWeekSpanWeeks,
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
            {isStandardWeek ? (
              /* Disabled arrows in standard week mode */
              <>
                <span className="w-7 h-7 flex items-center justify-center text-text-tertiary cursor-not-allowed text-lg leading-none">‹</span>
                <span className="w-7 h-7 flex items-center justify-center text-text-tertiary cursor-not-allowed text-lg leading-none">›</span>
              </>
            ) : (
              <>
                <button
                  onClick={onPrev}
                  aria-label="Previous week"
                  className="w-7 h-7 max-sm:min-w-[44px] max-sm:min-h-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer text-lg leading-none"
                >
                  ‹
                </button>
                <button
                  onClick={onNext}
                  aria-label="Next week"
                  className="w-7 h-7 max-sm:min-w-[44px] max-sm:min-h-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer text-lg leading-none"
                >
                  ›
                </button>
              </>
            )}

            <div className="text-center md:min-w-[180px]">
              {isStandardWeek ? (
                <span className="font-serif text-base font-medium text-text-primary whitespace-nowrap">
                  {t('标准周', 'Standard Week')}
                  {standardWeekSpanWeeks > 0 && (
                    <span className="font-mono text-xs text-text-secondary ml-2">
                      {t(`基于 ${standardWeekSpanWeeks} 周历史`, `based on ${standardWeekSpanWeeks} weeks`)}
                    </span>
                  )}
                </span>
              ) : (
                <>
                  <span className="hidden md:inline font-serif text-base font-medium text-text-primary">
                    {t(`第 ${weekNum} 周`, `Week ${weekNum}`)}
                  </span>
                  <span className="font-mono text-xs text-text-secondary md:ml-2 whitespace-nowrap">
                    {rangeLabel}
                  </span>
                </>
              )}
            </div>

            <div className="w-px h-5 bg-border-subtle mx-2" />

            {/* Standard week controls — only visible in standard week mode */}
            {isStandardWeek && (
              <>
                <select
                  value={standardWeekRange}
                  onChange={(e) => onStandardWeekRangeChange(e.target.value as '4w' | '12w' | 'all')}
                  className="h-[30px] px-2 rounded-md text-xs font-sans bg-surface-sunken border border-border-subtle text-text-secondary cursor-pointer"
                >
                  <option value="4w">{t('最近 4 周', 'Last 4 weeks')}</option>
                  <option value="12w">{t('最近 12 周', 'Last 12 weeks')}</option>
                  <option value="all">{t('全部历史', 'All history')}</option>
                </select>

                <label className="flex items-center gap-1.5 text-xs font-sans text-text-secondary cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={hideSleep}
                    onChange={(e) => onHideSleepChange(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm accent-accent cursor-pointer"
                  />
                  {t('隐藏睡眠', 'Hide sleep')}
                </label>

                <div className="w-px h-5 bg-border-subtle mx-1" />
              </>
            )}

            {/* Search */}
            <button
              onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
              disabled={isStandardWeek}
              aria-label={t('搜索事件', 'Search events')}
              className={cn(
                'w-7 h-7 max-sm:min-w-[44px] max-sm:min-h-[44px] flex items-center justify-center rounded-md transition-colors duration-200',
                isStandardWeek
                  ? 'text-text-tertiary cursor-not-allowed'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken cursor-pointer',
              )}
            >
              <Search size={14} strokeWidth={1.75} />
            </button>

            {/* Quick log + */}
            {isStandardWeek ? (
              <span className="w-7 h-7 max-sm:min-w-[44px] max-sm:min-h-[44px] flex items-center justify-center rounded-md text-text-tertiary cursor-not-allowed">
                <span className="text-lg leading-none">+</span>
              </span>
            ) : (
              <QuickLogTrigger onClick={onQuickLog} />
            )}

            {/* Today */}
            <button
              onClick={onToday}
              disabled={isCurrentWeek || isStandardWeek}
              className={cn(
                'h-[30px] max-sm:min-h-[44px] px-3 rounded-md text-xs font-sans font-medium transition-colors duration-200',
                isCurrentWeek || isStandardWeek
                  ? 'text-text-tertiary cursor-not-allowed'
                  : 'text-text-secondary bg-surface-sunken border border-border-subtle hover:text-text-primary hover:bg-surface-raised cursor-pointer',
              )}
            >
              {t('今天', 'Today')}
            </button>

            {/* Standard week toggle */}
            <button
              onClick={onToggleStandardWeek}
              className={cn(
                'h-[30px] max-sm:min-h-[44px] px-3 rounded-md text-xs font-sans font-medium transition-colors duration-200 border cursor-pointer',
                isStandardWeek
                  ? 'bg-accent-light border-accent/30 text-accent'
                  : 'text-text-secondary border-border-subtle hover:text-text-primary hover:bg-surface-sunken',
              )}
            >
              {t('标准周', 'Std Week')}
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
