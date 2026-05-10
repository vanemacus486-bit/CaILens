import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { ArrowLeft, BarChart3, Loader2, AlertCircle, Settings } from 'lucide-react'
import { formatWeekday as fmtWday } from '@/domain/time'
import type { CalendarEvent } from '@/domain/event'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { useDayFromURL, getPrevDay, getNextDay } from './hooks/useDayFromURL'

function fmtTimeHM(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtFullDate(date: Date, language: 'zh' | 'en'): string {
  const months = language === 'zh'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const d = date.getDate()
  const m = months[date.getMonth()]
  const y = date.getFullYear()
  return language === 'zh' ? `${y}年${m}${d}日` : `${m} ${d}, ${y}`
}

export function DayView() {
  const navigate = useNavigate()
  const { dayStart, setDayStart } = useDayFromURL()

  const rangeEvents   = useEventStore((s) => s.rangeEvents)
  const isLoading      = useEventStore((s) => s.isLoading)
  const loadError      = useEventStore((s) => s.loadError)
  const loadRange      = useEventStore((s) => s.loadRange)
  const categories     = useCategoryStore((s) => s.categories)
  const language       = useAppSettingsStore((s) => s.settings.language)
  const setSettingsDrawerOpen = useUIStore((s) => s.setSettingsDrawerOpen)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const dayStartMs = dayStart.getTime()
  const dayEndMs   = dayStartMs + 86_400_000

  useEffect(() => {
    fireAndForget(loadRange(dayStartMs, dayEndMs), 'load day range')
  }, [dayStartMs, dayEndMs, loadRange])

  const dayEvents = useMemo(() => {
    return rangeEvents
      .filter((e) => e.startTime < dayEndMs && e.endTime > dayStartMs)
      .sort((a, b) => a.startTime - b.startTime)
  }, [rangeEvents, dayStartMs, dayEndMs])

  const weekNum = getISOWeek(dayStart)

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Header */}
      <header className="px-4 md:px-12 py-6 border-b border-border-subtle flex justify-between items-end flex-shrink-0">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/')}
            className="mt-1.5 w-8 h-8 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer flex-shrink-0"
            aria-label={t('返回周视图', 'Back to week view')}
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <div>
            <div className="font-serif text-[28px] font-semibold text-text-primary tracking-[-0.02em] leading-tight">
              {fmtWday(dayStart, 'long')}
            </div>
            <div className="font-serif text-base text-text-secondary italic mt-0.5">
              {fmtFullDate(dayStart, language)}{' · '}{t(`第 ${weekNum} 周`, `Week ${weekNum}`)}
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setDayStart(getPrevDay(dayStart))}
            className="font-sans text-xs text-text-secondary bg-transparent border border-border-subtle rounded-md px-3 py-1 cursor-pointer hover:bg-surface-sunken transition-colors duration-200"
          >
            ‹ {fmtWday(getPrevDay(dayStart), 'short')}
          </button>
          <button
            onClick={() => setDayStart(getNextDay(dayStart))}
            className="font-sans text-xs text-text-secondary bg-transparent border border-border-subtle rounded-md px-3 py-1 cursor-pointer hover:bg-surface-sunken transition-colors duration-200"
          >
            {fmtWday(getNextDay(dayStart), 'short')} ›
          </button>
          <div className="w-px h-5 bg-border-subtle mx-1" />
          <button
            onClick={() => navigate('/stats')}
            aria-label={t('统计', 'Stats')}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer"
          >
            <BarChart3 size={16} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setSettingsDrawerOpen(true)}
            aria-label="Settings"
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer"
          >
            <Settings size={16} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Diary entries */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      ) : loadError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <AlertCircle className="h-10 w-10 text-color-text-danger" />
          <p className="font-sans text-sm text-text-secondary max-w-md text-center">{loadError}</p>
          <button
            onClick={() => loadRange(dayStartMs, dayEndMs)}
            className="inline-flex items-center justify-center rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
          >
            {t('重试', 'Retry')}
          </button>
        </div>
      ) : dayEvents.length > 0 ? (
        <div className="py-9 px-4 md:px-12 max-w-[680px]">
          {dayEvents.map((event, i) => {
            const cat = categories.find((c) => c.id === event.categoryId)
            const prevCat = i > 0 ? categories.find((c) => c.id === dayEvents[i - 1].categoryId) : null
            const showDivider = prevCat && prevCat.id !== event.categoryId

            const startsBeforeDay = event.startTime < dayStartMs
            const endsAfterDay = event.endTime > dayEndMs
            const displayStart = startsBeforeDay ? dayStartMs : event.startTime

            return (
              <article key={event.id}>
                {showDivider && (
                  <div className="h-px bg-border-subtle my-1 ml-[72px]" />
                )}
                <DiaryEntry
                  event={event}
                  catColor={cat ? `var(--event-${cat.id}-fill)` : 'var(--text-tertiary)'}
                  startsBeforeDay={startsBeforeDay}
                  endsAfterDay={endsAfterDay}
                  displayStart={displayStart}
                />
              </article>
            )
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-serif text-sm text-text-tertiary italic">
            {t('这一天没有记录', 'No events logged this day')}
          </p>
        </div>
      )}
    </main>
  )
}

function DiaryEntry({
  event, catColor, startsBeforeDay, endsAfterDay, displayStart,
}: {
  event: CalendarEvent
  catColor: string
  startsBeforeDay: boolean
  endsAfterDay: boolean
  displayStart: number
}) {
  const timeLabel = fmtTimeHM(displayStart)
  const isCrossDay = startsBeforeDay || endsAfterDay

  return (
    <div className="flex gap-0 mb-1 items-start">
      {/* Time */}
      <div className="w-12 flex-shrink-0 pt-0.5">
        <span className={cn('font-mono text-body-xs', isCrossDay ? 'text-text-secondary' : 'text-text-tertiary')}>{timeLabel}</span>
        {startsBeforeDay && (
          <div className="font-mono text-xs-alt text-text-tertiary opacity-60 mt-0.5">
            ▲ {fmtTimeHM(event.startTime).split(':')[0]}h
          </div>
        )}
      </div>

      {/* Dot + line */}
      <div className="w-6 flex-shrink-0 flex flex-col items-center pt-[5px]">
        <span
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0 border-2',
            isCrossDay && 'opacity-50',
          )}
          style={{
            backgroundColor: catColor,
            borderColor: 'var(--surface-raised)',
            outline: `1px solid ${catColor}`,
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 pb-2">
        <div className="font-serif text-base text-text-primary font-normal leading-[1.4]">
          {event.title || <span className="opacity-50 italic">(Untitled)</span>}
        </div>
        {event.description && (
          <div className="font-serif text-body-sm text-text-secondary italic mt-1 leading-[1.6]">
            {event.description}
          </div>
        )}
        {endsAfterDay && (
          <div className="font-mono text-xs-alt text-text-tertiary opacity-60 mt-1">
            ▼ {fmtTimeHM(event.endTime).split(':')[0]}h
          </div>
        )}
      </div>
    </div>
  )
}
