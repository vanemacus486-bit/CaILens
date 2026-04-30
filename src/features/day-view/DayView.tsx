import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { formatWeekday as fmtWday } from '@/domain/time'
import { addDays } from 'date-fns'
import type { CalendarEvent } from '@/domain/event'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
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

  const events         = useEventStore((s) => s.events)
  const loadRange      = useEventStore((s) => s.loadRange)
  const loadCategories = useCategoryStore((s) => s.loadCategories)
  const categories     = useCategoryStore((s) => s.categories)
  const loadSettings   = useAppSettingsStore((s) => s.loadSettings)
  const language       = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  useEffect(() => {
    void loadCategories()
    void loadSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dayEnd = addDays(dayStart, 1)

  useEffect(() => {
    void loadRange(dayStart.getTime(), dayEnd.getTime())
  }, [dayStart, dayEnd, loadRange])

  const dayEvents = useMemo(() => {
    return events
      .filter((e) => e.startTime < dayEnd.getTime() && e.endTime > dayStart.getTime())
      .sort((a, b) => a.startTime - b.startTime)
  }, [events, dayStart, dayEnd])

  const weekNum = getISOWeek(dayStart)

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="px-12 py-6 border-b border-border-subtle flex justify-between items-end flex-shrink-0">
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
              {fmtFullDate(dayStart, language)}{language === 'zh' ? ' · ' : ' · '}{t(`第 ${weekNum} 周`, `Week ${weekNum}`)}
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setDayStart(getPrevDay(dayStart))}
            className="font-sans text-xs text-text-secondary bg-transparent border border-border-subtle rounded-md px-3 py-[5px] cursor-pointer hover:bg-surface-sunken transition-colors duration-200"
          >
            ‹ {fmtWday(getPrevDay(dayStart), 'short')}
          </button>
          <button
            onClick={() => setDayStart(getNextDay(dayStart))}
            className="font-sans text-xs text-text-secondary bg-transparent border border-border-subtle rounded-md px-3 py-[5px] cursor-pointer hover:bg-surface-sunken transition-colors duration-200"
          >
            {fmtWday(getNextDay(dayStart), 'short')} ›
          </button>
        </div>
      </div>

      {/* Diary entries */}
      {dayEvents.length > 0 ? (
        <div className="py-9 px-12 max-w-[680px]">
          {dayEvents.map((event, i) => {
            const cat = categories.find((c) => c.id === event.categoryId)
            const prevCat = i > 0 ? categories.find((c) => c.id === dayEvents[i - 1].categoryId) : null
            const showDivider = prevCat && prevCat.id !== event.categoryId

            return (
              <div key={event.id}>
                {showDivider && (
                  <div className="h-px bg-border-subtle my-1 ml-12" />
                )}
                <DiaryEntry
                  event={event}
                  catColor={cat ? `var(--event-${cat.id}-fill)` : 'var(--text-tertiary)'}
                  catBg={cat ? `var(--event-${cat.id}-bg)` : 'transparent'}
                />
              </div>
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
    </div>
  )
}

function DiaryEntry({ event, catColor, catBg }: { event: CalendarEvent; catColor: string; catBg: string }) {
  const timeLabel = fmtTimeHM(event.startTime)

  return (
    <div className="flex gap-0 mb-1 items-start">
      {/* Time */}
      <div className="w-12 flex-shrink-0 pt-0.5">
        <span className="font-mono text-[11px] text-text-tertiary">{timeLabel}</span>
      </div>

      {/* Dot + line */}
      <div className="w-6 flex-shrink-0 flex flex-col items-center pt-[5px]">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 border-2"
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
          <div className="font-serif text-[13px] text-text-secondary italic mt-1 leading-[1.6]">
            {event.description}
          </div>
        )}
      </div>
    </div>
  )
}
