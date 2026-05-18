import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { renderDescription } from '@/domain/descriptionMd'
import { fireAndForget } from '@/lib/fireAndForget'
import { ArrowLeft, BarChart3, Loader2, AlertCircle, Settings, Sparkles, X, Pin } from 'lucide-react'
import { formatWeekday as fmtWday, isToday } from '@/domain/time'
import { computeRecordQuality } from '@/domain/quality'
import { getEventRepo } from '@/data/getRepositories'
import type { CalendarEvent } from '@/domain/event'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import { saveSession } from '@/hooks/useSessionRestore'
import type { PinnedAnalysis } from '@/domain/aiChat'
import { useDayFromURL, getPrevDay, getNextDay } from './hooks/useDayFromURL'
import { BatchPasteZone } from './BatchPasteZone'

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

  // Session state: save day + view
  useEffect(() => {
    saveSession({ dayStart: dayStartMs, view: 'day' })
  }, [dayStartMs])

  useEffect(() => {
    fireAndForget(loadRange(dayStartMs, dayEndMs), 'load day range')
  }, [dayStartMs, dayEndMs, loadRange])

  // Tab title
  useEffect(() => {
    const wn = getISOWeek(dayStart)
    const label = fmtFullDate(dayStart, language)
    document.title = language === 'zh'
      ? `CaILens · ${label} · 第 ${wn} 周`
      : `CaILens · ${label} · W${wn}`
  }, [dayStart, language])

  // ── Reverse Anchoring: opacity mute ────────────────────

  const hoveredAnchor = useUIStore((s) => s.hoveredAnchor)

  useEffect(() => {
    // Remove dimming from all events
    document.querySelectorAll('[data-event-id]').forEach((el) => {
      el.classList.remove('opacity-40')
    })

    if (!hoveredAnchor) return

    if (hoveredAnchor.type === 'category') {
      // Dim all events, then restore matching ones
      document.querySelectorAll('[data-event-id]').forEach((el) => {
        el.classList.add('opacity-40')
      })
      document.querySelectorAll(`[data-event-category="${hoveredAnchor.categoryId}"]`).forEach((el) => {
        el.classList.remove('opacity-40')
      })
    } else if (hoveredAnchor.type === 'event' && hoveredAnchor.eventTitle) {
      const events = useEventStore.getState().rangeEvents
      document.querySelectorAll('[data-event-id]').forEach((el) => {
        const eventId = el.getAttribute('data-event-id')
        const event = events.find((e) => e.id === eventId)
        if (!event || event.title !== hoveredAnchor.eventTitle) {
          el.classList.add('opacity-40')
        }
      })
    }
  }, [hoveredAnchor])

  // ── Pinned Insights ─────────────────────────────────────

  const [pinnedInsights, setPinnedInsights] = useState<PinnedAnalysis[]>([])
  const [yesterdayCoverage, setYesterdayCoverage] = useState<number | null>(null)
  const getPinsForDate = useAiChatStore((s) => s.getPinsForDate)

  useEffect(() => {
    fireAndForget(
      getPinsForDate(dayStartMs).then(setPinnedInsights),
      'load pinned insights',
    )
  }, [dayStartMs, getPinsForDate])

  // ── Yesterday catch-up reminder ────────────────────────────

  useEffect(() => {
    if (!isToday(dayStartMs)) {
      setYesterdayCoverage(null)
      return
    }
    const yesterdayStart = dayStartMs - 86_400_000
    fireAndForget(
      getEventRepo()
        .getByTimeRange(yesterdayStart, dayStartMs)
        .then((events) => {
          const q = computeRecordQuality(events, yesterdayStart, dayStartMs)
          setYesterdayCoverage(q.coverage)
        }),
      'yesterday coverage',
    )
  }, [dayStartMs])

  const handleUnpin = async (pinId: string) => {
    setPinnedInsights((prev) => prev.filter((p) => p.id !== pinId))
    try {
      const repo = (await import('@/data/getRepositories')).getConversationRepo()
      await repo.deletePin(pinId)
    } catch { /* ignore */ }
  }

  const dayEvents = useMemo(() => {
    return rangeEvents
      .filter((e) => e.startTime < dayEndMs && e.endTime > dayStartMs)
      .sort((a, b) => a.startTime - b.startTime)
  }, [rangeEvents, dayStartMs, dayEndMs])

  const weekNum = getISOWeek(dayStart)

  const handleEventClick = (event: CalendarEvent) => {
    useAiChatStore.getState().addCalendarContext([{
      id: event.id,
      type: 'event',
      eventId: event.id,
      eventTitle: event.title || undefined,
      eventDescription: event.description || undefined,
      startTime: event.startTime,
      endTime: event.endTime,
      categoryId: event.color,
    }])
    useUIStore.getState().setAiChatDrawerOpen(true)
  }

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

      {/* Yesterday catch-up reminder */}
      {yesterdayCoverage !== null && yesterdayCoverage < 0.5 && (
        <div className="px-4 md:px-12 pt-4 pb-0 max-w-[680px]">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-text-tertiary/30 flex-shrink-0" />
            <span className="font-serif text-body-sm text-text-tertiary italic">
              {t('昨日记录不足，待补录', 'Low coverage yesterday — catch-up needed')}
            </span>
          </div>
          <div className="h-px bg-border-subtle mt-3" />
        </div>
      )}

      {/* Pinned Insights */}
      {pinnedInsights.length > 0 && (
        <div className="px-4 md:px-12 pt-4 pb-2 max-w-[680px]">
          <div className="flex items-center gap-1.5 mb-2">
            <Pin size={12} className="text-text-tertiary" />
            <span className="text-[11px] font-sans font-medium text-text-tertiary tracking-wide uppercase">
              {t('固定洞察', 'Pinned Insights')}
            </span>
          </div>
          <div className="space-y-2">
            {pinnedInsights.map((pin) => (
              <div
                key={pin.id}
                className="rounded-lg border-l-[3px] border-accent bg-surface-raised border border-border-subtle border-l-accent px-3.5 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif text-sm leading-relaxed text-text-primary line-clamp-3 flex-1">
                    {pin.content.length > 200
                      ? pin.content.slice(0, 200) + '...'
                      : pin.content}
                  </p>
                  <button
                    onClick={() => handleUnpin(pin.id)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-text-tertiary hover:text-color-text-danger transition-colors cursor-pointer border-none bg-transparent"
                    title={t('取消固定', 'Unpin')}
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="mt-1.5 text-[11px] font-mono text-text-tertiary">
                  {t('固定于', 'Pinned')} {new Date(pin.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          <div className="h-px bg-border-subtle my-4" />
        </div>
      )}

      <BatchPasteZone dayStartMs={dayStartMs} />

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
              <article key={event.id} data-event-id={event.id} data-event-category={event.categoryId}>
                {showDivider && (
                  <div className="h-px bg-border-subtle my-1 ml-[72px]" />
                )}
                <DiaryEntry
                  event={event}
                  catColor={cat ? `var(--event-${cat.id}-fill)` : 'var(--text-tertiary)'}
                  startsBeforeDay={startsBeforeDay}
                  endsAfterDay={endsAfterDay}
                  displayStart={displayStart}
                  onAskAi={handleEventClick}
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
  event, catColor, startsBeforeDay, endsAfterDay, displayStart, onAskAi,
}: {
  event: CalendarEvent
  catColor: string
  startsBeforeDay: boolean
  endsAfterDay: boolean
  displayStart: number
  onAskAi: (event: CalendarEvent) => void
}) {
  const timeLabel = fmtTimeHM(displayStart)
  const isCrossDay = startsBeforeDay || endsAfterDay

  return (
    <div className="flex gap-0 mb-1 items-start group">
      {/* Left color strip */}
      <div
        className="w-[3px] flex-shrink-0 self-stretch rounded-full mr-3 mt-0.5"
        style={{ backgroundColor: catColor, opacity: isCrossDay ? 0.5 : 1 }}
      />

      {/* Content */}
      <div className="flex-1 pb-3 min-w-0">
        {/* Time label — secondary */}
        <div className="font-mono text-[10px] text-text-tertiary mb-1 tracking-wide">
          {timeLabel}
          {startsBeforeDay && (
            <span className="opacity-60 ml-1">▲ {fmtTimeHM(event.startTime).split(':')[0]}h</span>
          )}
          {endsAfterDay && (
            <span className="opacity-60 ml-1">▼ {fmtTimeHM(event.endTime).split(':')[0]}h</span>
          )}
        </div>

        {/* Title — serif heading */}
        <div className="font-serif text-[17px] text-text-primary font-semibold leading-snug">
          {event.title || <span className="opacity-50 italic font-normal">{'(Untitled)'}</span>}
        </div>

        {/* Description — serif body paragraph, markdown rendered */}
        {event.description && (
          <div
            className="font-serif text-[14px] text-text-secondary leading-relaxed mt-1.5"
            dangerouslySetInnerHTML={{ __html: renderDescription(event.description) }}
          />
        )}

        {/* Location — sans-serif footnote */}
        {event.location && (
          <div className="font-sans text-[11px] text-text-tertiary mt-1.5 tracking-wide">
            {event.location}
          </div>
        )}
      </div>

      {/* Ask AI button (visible on hover) */}
      <button
        onClick={() => onAskAi(event)}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-0.5 w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-accent hover:bg-surface-sunken cursor-pointer border-none flex-shrink-0"
        title="Ask AI"
      >
        <Sparkles size={14} />
      </button>
    </div>
  )
}
