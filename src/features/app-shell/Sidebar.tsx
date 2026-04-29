import { type ElementType, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Settings,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { addWeeks, getWeekStart, isSameDay } from '@/domain/time'
import { useWeekFromURL } from '@/features/week-view/hooks/useWeekFromURL'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { ImportIcsDialog } from '@/features/import-ics/ImportIcsDialog'

// ── Tooltip ───────────────────────────────────────────────

interface TooltipProps {
  content: string
  children: React.ReactNode
}

function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
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
  icon:     ElementType
  tooltip:  string
  onClick?: () => void
  disabled?: boolean
}

function NavButton({ icon: Icon, tooltip, onClick, disabled = false }: NavButtonProps) {
  return (
    <Tooltip content={tooltip}>
      <button
        onClick={disabled ? undefined : onClick}
        aria-label={tooltip}
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded-lg transition-colors duration-200',
          disabled
            ? 'opacity-40 cursor-not-allowed text-text-secondary'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised cursor-pointer',
        )}
      >
        <Icon size={18} strokeWidth={1.75} />
      </button>
    </Tooltip>
  )
}

// ── Sidebar ───────────────────────────────────────────────

export function Sidebar() {
  const { weekStart, setWeekStart } = useWeekFromURL()
  const language = useAppSettingsStore((s) => s.settings.language)
  const [importOpen, setImportOpen] = useState(false)
  const navigate = useNavigate()

  const currentWeekStart = getWeekStart(new Date(), 1)
  const isOnCurrentWeek  = isSameDay(weekStart, currentWeekStart)

  const goToday = () => setWeekStart(currentWeekStart)
  const goPrev  = () => setWeekStart(addWeeks(weekStart, -1))
  const goNext  = () => setWeekStart(addWeeks(weekStart, 1))

  const todayTooltip = isOnCurrentWeek
    ? (language === 'zh' ? '当前周' : "You're on this week")
    : (language === 'zh' ? '本周' : 'Today')

  return (
    <div className="w-12 flex-shrink-0 border-r border-border-subtle bg-surface-base flex flex-col items-center py-3">
      {/* Navigation group */}
      <div className="flex flex-col items-center gap-1">
        <NavButton
          icon={CalendarCheck}
          tooltip={todayTooltip}
          onClick={goToday}
          disabled={isOnCurrentWeek}
        />
        <Divider />
        <NavButton icon={ChevronLeft}  tooltip={language === 'zh' ? '上一周' : 'Previous week'} onClick={goPrev} />
        <NavButton icon={ChevronRight} tooltip={language === 'zh' ? '下一周' : 'Next week'}     onClick={goNext} />
        <Divider />
      </div>

      {/* Tools group */}
      <div className="flex flex-col items-center gap-1">
        <NavButton icon={Upload}    tooltip={language === 'zh' ? '导入日历' : 'Import .ics'} onClick={() => setImportOpen(true)} />
        <NavButton icon={BarChart3} tooltip={language === 'zh' ? '时间统计' : 'Stats'} onClick={() => navigate('/stats')} />
      </div>

      {/* Push settings to bottom */}
      <div className="flex-1" />

      <NavButton icon={Settings} tooltip="Settings" onClick={() => navigate('/settings')} />

      <ImportIcsDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
