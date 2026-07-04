import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useEventStore } from '@/stores/eventStore'
import { bucketEventsByLocalDay } from '@/domain/stats'
import { buildDayStreamRows } from '@/domain/dayStream'
import type { DayStreamRow } from '@/domain/dayStream'
import type { CalendarEvent } from '@/domain/event'

// ── Constants ─────────────────────────────────────────────────

const DAY_MS = 86_400_000
const LOAD_CHUNK_DAYS = 7
const INITIAL_DAYS = 7  // today + 6 past days

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']

// ── Helpers ───────────────────────────────────────────────────

/** Local midnight epoch ms for a date. */
function localDayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function formatMonthLabel(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

// ── Props ─────────────────────────────────────────────────────

interface MobileDayStreamProps {
  selectedDate: Date
  onEditEvent: (event: CalendarEvent) => void
  onCreateEvent: (startMs: number) => void
}

// ── Components ────────────────────────────────────────────────

/** A single event row in the stream. */
function EventRow({
  event,
  onTap,
}: {
  event: DayStreamRow
  onTap: (event: CalendarEvent) => void
}) {
  return (
    <div
      className="flex items-center gap-2 py-1.5 cursor-pointer active:opacity-60 transition-opacity min-h-[36px]"
      onClick={() => onTap(event.calendarEvent)}
    >
      {/* Color bar */}
      <div
        className="w-1 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: event.barColor }}
      />
      {/* Title */}
      <span className="text-[13px] text-text-primary truncate flex-1 min-w-0">
        {event.title || <span className="italic text-text-tertiary">无标题</span>}
      </span>
      {/* Time range + duration, or an all-day tag */}
      {event.isAllDay ? (
        <span className="font-mono text-[11px] tracking-wider text-text-tertiary whitespace-nowrap flex-shrink-0 uppercase">
          全天
        </span>
      ) : (
        <span className="font-mono text-[11px] text-text-tertiary whitespace-nowrap flex-shrink-0">
          {event.startStr}
          <span className="mx-0.5">→</span>
          {event.endStr}
          <span className="ml-1 opacity-60">{event.durationStr}</span>
        </span>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export function MobileDayStream({
  onEditEvent,
}: MobileDayStreamProps) {
  const queryRange = useEventStore((s) => s.queryRange)

  // ── Window state ──────────────────────────────────────────
  // windowStart moves backwards (earlier dates) on infinite scroll.
  // windowEnd is fixed at tomorrow's local midnight (future excluded).

  const [now] = useState(() => new Date())
  const todayStart = useMemo(() => localDayStart(now), [now])
  const windowEnd = todayStart + DAY_MS
  const initialWindowStart = useMemo(() => todayStart - (INITIAL_DAYS - 1) * DAY_MS, [todayStart])

  const [windowStart, setWindowStart] = useState(initialWindowStart)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const prevScrollHeight = useRef(0)
  const prevScrollTop = useRef(0)
  const isFirstLoad = useRef(true)

  // ── Bucket events by day ──────────────────────────────────

  const dayBuckets = useMemo(
    () => bucketEventsByLocalDay(events, windowStart, windowEnd),
    [events, windowStart, windowEnd],
  )

  // Ordered day start timestamps for the window.
  const dayCount = Math.ceil((windowEnd - windowStart) / DAY_MS)
  const dayStarts = useMemo(() => {
    const arr: number[] = new Array(dayCount)
    for (let i = 0; i < dayCount; i++) arr[i] = windowStart + i * DAY_MS
    return arr
  }, [windowStart, dayCount])

  // ── Load / reload ─────────────────────────────────────────

  const fetchRange = useCallback(
    async (start: number, end: number) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      try {
        const fetched = await queryRange(start, end)
        setEvents(fetched)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [queryRange],
  )

  // Initial load on mount.
  useEffect(() => {
    fetchRange(windowStart, windowEnd)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── IntersectionObserver: infinite scroll up ───────────────

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        if (loadingRef.current) return

        // Save scroll state before DOM changes
        const el = scrollRef.current
        if (el) {
          prevScrollHeight.current = el.scrollHeight
          prevScrollTop.current = el.scrollTop
        }

        const newStart = windowStart - LOAD_CHUNK_DAYS * DAY_MS
        setWindowStart(newStart)

        fetchRange(newStart, windowEnd)
      },
      { rootMargin: '300px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowStart, loading, queryRange, windowEnd])

  // ── Scroll preservation after prepend ─────────────────────

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    if (isFirstLoad.current) {
      // Initial load: scroll to bottom (today)
      isFirstLoad.current = false
      // Use small delay to ensure DOM is painted
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
      return
    }

    if (prevScrollHeight.current === 0) return

    // Restore position after content was prepended at the top
    const addedHeight = el.scrollHeight - prevScrollHeight.current
    el.scrollTop = prevScrollTop.current + addedHeight

    prevScrollHeight.current = 0
    prevScrollTop.current = 0
  }, [events, dayBuckets])

  // ── Rotated left-edge month/year label (tracks scroll position) ──
  // Only month-boundary days get an (invisible) sentinel — far fewer
  // elements to observe than one-per-day, and still gives us "which
  // month segment is currently at the top of the viewport".

  const [visibleMonthTs, setVisibleMonthTs] = useState(todayStart)
  const monthSentinelsRef = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const ds = Number((entry.target as HTMLElement).dataset.monthStart)
          if (!Number.isNaN(ds)) setVisibleMonthTs(ds)
        }
      },
      // Trigger when a month-boundary sentinel crosses near the top of the
      // scroll viewport (classic "scrollspy" rootMargin trick).
      { root, rootMargin: '0px 0px -92% 0px', threshold: 0 },
    )

    for (const el of monthSentinelsRef.current.values()) observer.observe(el)
    return () => observer.disconnect()
  }, [windowStart])

  // ── Render helpers ────────────────────────────────────────

  /** Determine if a day is "today". */
  function isToday(dayStart: number): boolean {
    return dayStart === todayStart
  }

  /** Determine if this day is a month boundary relative to the previous day. */
  function isMonthBoundary(dayStart: number, index: number): boolean {
    if (index === 0) {
      // First day in view — compare to the day after windowStart
      const prev = dayStart - DAY_MS
      const d = new Date(dayStart)
      const p = new Date(prev)
      return d.getMonth() !== p.getMonth()
    }
    const prev = dayStarts[index - 1]
    const d = new Date(dayStart)
    const p = new Date(prev)
    return d.getMonth() !== p.getMonth()
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pl-6"
      >
        {/* Top sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-px" />

        {/* Loading indicator at top */}
        {loading && (
          <div className="flex items-center justify-center py-3">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}

        {/* Day segments */}
        {dayStarts.map((ds, idx) => {
          if (ds >= windowEnd) return null // skip future

          const date = new Date(ds)
          const today = isToday(ds)
          const wd = WEEKDAY_ZH[date.getDay()]
          const dayNum = date.getDate()
          const bucket = dayBuckets[idx] ?? []
          const rows = buildDayStreamRows(bucket, ds)

          return (
            <div key={ds}>
              {/* Month-boundary sentinel — invisible, drives the rotated edge label */}
              {isMonthBoundary(ds, idx) && (
                <div
                  ref={(el) => {
                    if (el) monthSentinelsRef.current.set(ds, el)
                    else monthSentinelsRef.current.delete(ds)
                  }}
                  data-month-start={ds}
                  className="h-px"
                />
              )}

              {/* Day segment */}
              <div className="flex">
                {/* Left rail — sticky within segment */}
                <div className="sticky top-0 z-10 w-12 flex-shrink-0 self-start flex flex-col items-center pt-3 bg-surface-base">
                  <span className="text-[11px] text-text-tertiary leading-none">{wd}</span>
                  <span
                    className={cn(
                      'text-[20px] leading-tight mt-0.5',
                      today ? 'text-accent font-bold' : 'text-text-primary font-medium',
                    )}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* Content area */}
                <div className="flex-1 min-w-0 pb-2 pr-3">
                  {rows.length === 0 ? (
                    <p className="text-[12px] text-text-quaternary italic py-3">无记录</p>
                  ) : (
                    rows.map((row) => (
                      <EventRow key={row.id} event={row} onTap={onEditEvent} />
                    ))
                  )}
                </div>
              </div>

              {/* Day separator */}
              <div className="border-t border-border-subtle" />
            </div>
          )
        })}

        {/* Bottom spacer for safe area */}
        <div className="h-4" />
      </div>

      {/* Rotated month/year label, pinned to the left edge, tracks scroll position */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 flex justify-center pointer-events-none select-none"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="text-[10px] tracking-[0.25em] text-text-tertiary/80 font-medium uppercase">
          {formatMonthLabel(visibleMonthTs)}
        </span>
      </div>
    </div>
  )
}
