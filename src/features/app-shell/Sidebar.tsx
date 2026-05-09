import { type ElementType, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  HardDrive,
  Info,
  LayoutGrid,
  Palette,
  Pin,
  PinOff,
  Settings,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { addWeeks, getWeekStart, isSameDay } from '@/domain/time'
import { useWeekFromURL } from '@/features/week-view/hooks/useWeekFromURL'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { ImportIcsDialog } from '@/features/import-ics/ImportIcsDialog'

// ── Tooltip (only shown when not expanded) ──────────────────

interface TooltipProps {
  content: string
  disabled?: boolean
  children: React.ReactNode
}

function Tooltip({ content, disabled = false, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (disabled) return
    timerRef.current = setTimeout(() => setVisible(true), 400)
  }
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className="relative flex items-center" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={cn(
            'absolute left-full ml-3 z-50 pointer-events-none',
            'bg-surface-raised border border-border-subtle rounded-lg',
            'px-2.5 py-1.5 text-xs font-sans text-text-primary whitespace-nowrap',
          )}
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────

function Divider() {
  return <div className="w-6 h-px bg-border-subtle my-1 mx-auto" />
}

// ── NavButton ─────────────────────────────────────────────

interface NavButtonProps {
  icon: ElementType
  tooltip: string
  label?: string
  expanded?: boolean
  onClick?: () => void
  disabled?: boolean
  active?: boolean
}

function NavButton({ icon: Icon, tooltip, label, expanded = false, onClick, disabled = false, active = false }: NavButtonProps) {
  return (
    <Tooltip content={tooltip} disabled={expanded}>
      <button
        onClick={disabled ? undefined : onClick}
        aria-label={tooltip}
        className={cn(
          'flex items-center gap-2.5 rounded-lg transition-colors duration-200',
          expanded ? 'w-full px-3 h-9 justify-start' : 'w-10 h-10 justify-center',
          disabled
            ? 'opacity-40 cursor-not-allowed text-text-secondary'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised cursor-pointer',
          active && 'bg-surface-sunken text-text-primary',
        )}
      >
        <Icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
        {expanded && label && (
          <span className="text-[12px] font-sans text-text-secondary truncate">{label}</span>
        )}
      </button>
    </Tooltip>
  )
}

// ── Settings Nav ──────────────────────────────────────────

const SETTINGS_ITEMS: { key: string; label: string; labelZh: string; icon: ElementType }[] = [
  { key: '/settings',           label: 'Categories', labelZh: '分类', icon: LayoutGrid },
  { key: '/settings/appearance', label: 'Appearance', labelZh: '外观', icon: Palette },
  { key: '/settings/data',      label: 'Data',       labelZh: '数据', icon: Download },
  { key: '/settings/storage',   label: 'Storage',    labelZh: '存储', icon: HardDrive },
  { key: '/settings/about',     label: 'About',      labelZh: '关于', icon: Info },
]

// ── Calendar Nav ──────────────────────────────────────────

interface CalendarNavProps {
  expanded: boolean
  language: 'zh' | 'en'
  onImport: () => void
  onStats: () => void
  onSettings: () => void
}

function CalendarNav({ expanded, language, onImport, onStats, onSettings }: CalendarNavProps) {
  const { weekStart, setWeekStart } = useWeekFromURL()
  const currentWeekStart = getWeekStart(new Date(), 1)
  const isOnCurrentWeek = isSameDay(weekStart, currentWeekStart)

  const goToday = () => setWeekStart(currentWeekStart)
  const goPrev = () => setWeekStart(addWeeks(weekStart, -1))
  const goNext = () => setWeekStart(addWeeks(weekStart, 1))

  const todayTooltip = isOnCurrentWeek
    ? (language === 'zh' ? '当前周' : "You're on this week")
    : (language === 'zh' ? '本周' : 'Today')

  return (
    <>
      <nav aria-label="Main navigation" className="flex flex-col gap-1 w-full">
        <NavButton
          icon={CalendarCheck}
          tooltip={todayTooltip}
          label={language === 'zh' ? '本周' : 'This week'}
          expanded={expanded}
          onClick={goToday}
          disabled={isOnCurrentWeek}
        />
        <Divider />
        <NavButton
          icon={ChevronLeft}
          tooltip={language === 'zh' ? '上一周' : 'Previous week'}
          label={language === 'zh' ? '上一周' : 'Previous'}
          expanded={expanded}
          onClick={goPrev}
        />
        <NavButton
          icon={ChevronRight}
          tooltip={language === 'zh' ? '下一周' : 'Next week'}
          label={language === 'zh' ? '下一周' : 'Next'}
          expanded={expanded}
          onClick={goNext}
        />
        <Divider />
      </nav>

      <div className="flex flex-col gap-1 w-full">
        <NavButton
          icon={Upload}
          tooltip={language === 'zh' ? '导入日历' : 'Import .ics'}
          label={language === 'zh' ? '导入' : 'Import'}
          expanded={expanded}
          onClick={onImport}
        />
        <NavButton
          icon={BarChart3}
          tooltip={language === 'zh' ? '时间统计' : 'Stats'}
          label={language === 'zh' ? '统计' : 'Stats'}
          expanded={expanded}
          onClick={onStats}
        />
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-1 w-full">
        <NavButton
          icon={Settings}
          tooltip="Settings"
          label="Settings"
          expanded={expanded}
          onClick={onSettings}
        />
      </div>
    </>
  )
}

// ── Settings Nav ──────────────────────────────────────────

interface SettingsNavProps {
  expanded: boolean
  language: 'zh' | 'en'
  currentPath: string
  onBack: () => void
  onNavigate: (path: string) => void
}

function SettingsNav({ expanded, language, currentPath, onBack, onNavigate }: SettingsNavProps) {
  return (
    <>
      <nav aria-label="Settings navigation" className="flex flex-col gap-1 w-full">
        <NavButton
          icon={ArrowLeft}
          tooltip={language === 'zh' ? '返回日历' : 'Back to calendar'}
          label={language === 'zh' ? '返回日历' : 'Back'}
          expanded={expanded}
          onClick={onBack}
        />
        <Divider />
        <div className="flex flex-col gap-0.5 w-full mt-1">
          {SETTINGS_ITEMS.map((item) => (
            <NavButton
              key={item.key}
              icon={item.icon}
              tooltip={language === 'zh' ? item.labelZh : item.label}
              label={language === 'zh' ? item.labelZh : item.label}
              expanded={expanded}
              onClick={() => onNavigate(item.key)}
              active={currentPath === item.key}
            />
          ))}
        </div>
      </nav>

      <div className="flex-1" />
    </>
  )
}

// ── Sidebar ───────────────────────────────────────────────

export function Sidebar() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const [importOpen, setImportOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen)
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen)
  const [hovered, setHovered] = useState(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setHovered(true), 200)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setHovered(false)
  }, [])

  useEffect(() => () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
  }, [])

  const expanded = sidebarExpanded || hovered

  const inSettings = location.pathname.startsWith('/settings')
  const settingsPath = inSettings
    ? SETTINGS_ITEMS.find((item) => location.pathname === item.key)?.key ?? '/settings'
    : '/settings'

  const handleBackToCalendar = () => navigate('/')
  const handleSettingsNav = (path: string) => navigate(path)

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          'flex-shrink-0 border-r border-border-subtle bg-surface-base flex flex-col py-3 transition-all duration-200',
          expanded ? 'w-40 items-start px-2' : 'w-12 items-center',
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-40 max-md:items-start max-md:px-2',
          mobileSidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full max-md:hidden',
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {inSettings ? (
          <SettingsNav
            expanded={expanded}
            language={language}
            currentPath={settingsPath}
            onBack={handleBackToCalendar}
            onNavigate={handleSettingsNav}
          />
        ) : (
          <CalendarNav
            expanded={expanded}
            language={language}
            onImport={() => setImportOpen(true)}
            onStats={() => navigate('/stats')}
            onSettings={() => navigate('/settings')}
          />
        )}

        {/* Pin toggle */}
        <div className="flex flex-col gap-1 w-full">
          <button
            onClick={toggleSidebar}
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Pin sidebar'}
            className={cn(
              'flex items-center gap-2.5 rounded-lg transition-colors duration-200 cursor-pointer',
              expanded ? 'w-full px-3 h-9 justify-start' : 'w-10 h-10 justify-center',
              'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
            )}
          >
            {sidebarExpanded ? (
              <PinOff size={16} strokeWidth={1.75} className="flex-shrink-0" />
            ) : (
              <Pin size={16} strokeWidth={1.75} className="flex-shrink-0" />
            )}
            {expanded && (
              <span className="text-[12px] font-sans text-text-tertiary truncate">
                {sidebarExpanded
                  ? (language === 'zh' ? '收起' : 'Collapse')
                  : (language === 'zh' ? '固定' : 'Pin')}
              </span>
            )}
          </button>
        </div>

        <ImportIcsDialog open={importOpen} onOpenChange={setImportOpen} />
      </div>
    </>
  )
}
