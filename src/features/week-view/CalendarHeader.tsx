import { Search, Settings, Menu } from 'lucide-react'
import { addDays, getISOWeek } from 'date-fns'
import { formatMonthDay, formatWeekday } from '@/domain/time'
import { SlideSegmented } from '@/components/nav/SlideSegmented'
import { useUIStore } from '@/stores/uiStore'
import { useDomainNav } from '@/components/nav/domainNav'

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface CalendarHeaderProps {
  viewMode: 'week' | 'month' | 'day'
  weekStart: Date
  selectedDay: Date
  language: 'zh' | 'en'
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSetWeek: () => void
  onSetMonth: () => void
  onSearch: () => void
}

export function CalendarHeader({
  viewMode, weekStart, selectedDay, language,
  onPrev, onNext, onToday, onSetWeek, onSetMonth, onSearch,
}: CalendarHeaderProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const { activeMode, navItems, handleModeChange } = useDomainNav(language)

  let label: string
  let todayLabel: string
  if (viewMode === 'month') {
    label = language === 'zh'
      ? `${selectedDay.getFullYear()}年${selectedDay.getMonth() + 1}月`
      : `${MONTHS_EN[selectedDay.getMonth()]} ${selectedDay.getFullYear()}`
    todayLabel = t('回到本月', 'This month')
  } else if (viewMode === 'day') {
    const wn = getISOWeek(selectedDay)
    label = language === 'zh'
      ? `${selectedDay.getMonth() + 1}月${selectedDay.getDate()}日 ${formatWeekday(selectedDay, 'long')} · 第${wn}周`
      : `${formatWeekday(selectedDay, 'long')}, ${MONTHS_EN[selectedDay.getMonth()]} ${selectedDay.getDate()} · W${wn}`
    todayLabel = t('今天', 'Today')
  } else {
    const weekEnd = addDays(weekStart, 6)
    const wn = getISOWeek(weekStart)
    label = `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}`
      + (language === 'zh' ? ` · 第${wn}周` : ` · W${wn}`)
    todayLabel = t('回到本周', 'This week')
  }

  return (
    <div className="nav-bar flex items-center px-3 h-[52px] flex-shrink-0">
      {/* ── ☰ 切换左侧面板 ── */}
      <button
        onClick={() => useUIStore.getState().toggleSidebar()}
        className="w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken cursor-pointer transition-colors duration-200 flex-shrink-0"
        aria-label={t('切换侧栏', 'Toggle sidebar')}
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>

      {/* ── 品牌名 ── */}
      <span className="ml-1 mr-3 font-serif text-[17px] font-semibold text-text-primary tracking-[-0.01em] select-none flex-shrink-0">
        CaILens
      </span>

      {/* ── 回到今天 ── */}
      <button
        onClick={onToday}
        className="font-sans text-xs text-text-secondary border border-border-subtle rounded-md px-2.5 py-1 cursor-pointer hover:bg-surface-sunken transition-colors duration-200 bg-transparent flex-shrink-0"
      >
        {todayLabel}
      </button>

      {/* ── 周期导航 ── */}
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={onPrev}
          className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary text-lg leading-none cursor-pointer transition-colors duration-200"
          aria-label={t('上一个', 'Previous')}
        >
          ‹
        </button>
        <span className="font-serif text-sm text-text-primary whitespace-nowrap min-w-[140px] text-center select-none">
          {label}
        </span>
        <button
          onClick={onNext}
          className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary text-lg leading-none cursor-pointer transition-colors duration-200"
          aria-label={t('下一个', 'Next')}
        >
          ›
        </button>
      </div>

      <div className="flex-1" />

      {/* ── 右：周/月 切换 | 日历/复盘 切换 | 搜索 | 设置 ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <SlideSegmented
          items={[
            { id: 'week'  as const, label: t('周', 'Week')  },
            { id: 'month' as const, label: t('月', 'Month') },
          ]}
          value={viewMode === 'day' ? 'week' : viewMode}
          onChange={(v) => v === 'month' ? onSetMonth() : onSetWeek()}
        />

        <SlideSegmented items={navItems} value={activeMode} onChange={handleModeChange} expand shareKey="domain" />

        <button
          onClick={onSearch}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken cursor-pointer transition-colors duration-200"
          aria-label={t('搜索事件', 'Search events')}
        >
          <Search size={15} strokeWidth={1.75} />
        </button>

        <button
          onClick={() => useUIStore.getState().setSettingsModalOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer"
          aria-label="Settings"
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
