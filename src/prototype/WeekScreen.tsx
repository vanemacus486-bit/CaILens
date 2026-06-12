import { useEffect, useMemo, useRef, useState } from 'react'
import {
  startOfWeek, addDays, addWeeks, addMonths, startOfMonth, endOfMonth,
  isSameDay, isSameMonth, differenceInCalendarDays, getISOWeek,
} from 'date-fns'
import { MapPin, X } from 'lucide-react'
import {
  EVENTS, CAT_BG, CAT_VAR, CAT_LABEL, fmtMin, durLabel,
  type MockEvent, type Cat,
} from './mock'

const HOUR = 46
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export type CalMode = 'week' | 'day' | 'month'

const today = new Date()

function weekDates(offset: number): Date[] {
  const base = startOfWeek(addWeeks(today, offset), { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(base, i))
}

export function getNavLabel(mode: CalMode, offset: number): { range: string; wk: string } {
  if (mode === 'day') {
    const d = addDays(today, offset)
    return { range: `${WEEKDAYS[(d.getDay() + 6) % 7]} ${d.getMonth() + 1}-${d.getDate()}`, wk: `第 ${getISOWeek(d)} 周` }
  }
  if (mode === 'month') {
    const m = addMonths(today, offset)
    return { range: `${m.getFullYear()} 年 ${m.getMonth() + 1} 月`, wk: '' }
  }
  const days = weekDates(offset)
  const a = days[0], b = days[6]
  return {
    range: `${a.getMonth() + 1}-${a.getDate()} – ${b.getMonth() + 1}-${b.getDate()}`,
    wk: `第 ${getISOWeek(a)} 周`,
  }
}

/** weekday index (0=Mon) → events，按重叠分簇并分配列。 */
interface Placed { ev: MockEvent; left: number; width: number }
function layoutDay(dayIdx: number): Placed[] {
  const evts = EVENTS.filter((e) => e.day === dayIdx).sort((a, b) => a.start - b.start || b.end - a.end)
  const out: Placed[] = []
  let cluster: MockEvent[] = []
  let clusterEnd = -1

  const flush = () => {
    if (cluster.length === 0) return
    const colEnds: number[] = []
    const cols = cluster.map((ev) => {
      let c = colEnds.findIndex((end) => end <= ev.start)
      if (c === -1) { c = colEnds.length; colEnds.push(ev.end) } else colEnds[c] = ev.end
      return c
    })
    const total = colEnds.length
    cluster.forEach((ev, i) => {
      out.push({ ev, left: (cols[i] / total) * 100, width: (1 / total) * 100 })
    })
    cluster = []
    clusterEnd = -1
  }

  for (const ev of evts) {
    if (cluster.length > 0 && ev.start >= clusterEnd) flush()
    cluster.push(ev)
    clusterEnd = Math.max(clusterEnd, ev.end)
  }
  flush()
  return out
}

interface Selected { ev: MockEvent; x: number; y: number }

export function WeekScreen({ mode, offset, onPickDay }: {
  mode: CalMode
  offset: number
  onPickDay: (date: Date) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Selected | null>(null)

  useEffect(() => {
    if (scrollRef.current && mode !== 'month') {
      scrollRef.current.scrollTop = 6.5 * HOUR - 30
    }
  }, [mode])

  useEffect(() => {
    if (!selected) return
    const close = () => setSelected(null)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [selected])

  const nowMin = today.getHours() * 60 + today.getMinutes()

  if (mode === 'month') {
    return <MonthGrid offset={offset} onPickDay={onPickDay} />
  }

  const days = mode === 'day' ? [addDays(today, offset)] : weekDates(offset)
  const dayIdxOf = (d: Date) => (d.getDay() + 6) % 7

  return (
    <div className="cal" onClick={() => selected && setSelected(null)}>
      {/* 表头 */}
      <div className="cal-head">
        <div className="corner" />
        {days.map((d) => {
          const isToday = isSameDay(d, today)
          return (
            <div key={d.toISOString()} className={`dcol${isToday ? ' today' : ''}`}>
              <div className="wd">{WEEKDAYS[dayIdxOf(d)]}</div>
              <div className="dt">{String(d.getDate()).padStart(2, '0')}</div>
            </div>
          )
        })}
      </div>

      {/* 网格 */}
      <div className="cal-scroll" ref={scrollRef}>
        <div className="cal-grid" style={{ height: 24 * HOUR }}>
          <div className="cal-rail" style={{ height: 24 * HOUR }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className={`hr${[0, 6, 12, 18].includes(h) ? ' anchor' : ''}`}
                style={{ top: h * HOUR }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {days.map((d) => {
            const idx = dayIdxOf(d)
            const isToday = isSameDay(d, today)
            const placed = layoutDay(idx)
            return (
              <div key={d.toISOString()} className={`cal-col${isToday ? ' today' : ''}`} style={{ height: 24 * HOUR }}>
                {isToday && (
                  <div className="now" style={{ top: (nowMin / 60) * HOUR }}>
                    <div className="knob" />
                  </div>
                )}
                {placed.map(({ ev, left, width }) => {
                  const top = (ev.start / 60) * HOUR
                  const height = Math.max(((ev.end - ev.start) / 60) * HOUR - 2, 16)
                  const isSel = selected?.ev.id === ev.id
                  return (
                    <div
                      key={ev.id}
                      className={`ev${isSel ? ' selected' : ''}`}
                      style={{
                        top, height, left: `${left}%`, width: `calc(${width}% - 3px)`,
                        ['--ev-bg' as string]: CAT_BG[ev.cat],
                        ['--ev-fill' as string]: CAT_VAR[ev.cat],
                        ['--ev-text' as string]: CAT_VAR[ev.cat],
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected({ ev, x: e.clientX, y: e.clientY })
                      }}
                    >
                      <div className="ev-t">{ev.title}</div>
                      {height > 32 && (
                        <div className="ev-time">{fmtMin(ev.start)}–{fmtMin(ev.end)}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {selected && <EventPopover sel={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function EventPopover({ sel, onClose }: { sel: Selected; onClose: () => void }) {
  const { ev } = sel
  const W = 264
  const left = Math.min(sel.x + 12, window.innerWidth - W - 16)
  const top = Math.min(sel.y + 8, window.innerHeight - 220)
  return (
    <div
      className="card float pop"
      style={{ position: 'fixed', left, top, width: W, zIndex: 50, padding: 16 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div className="serif" style={{ fontSize: 'var(--t-head)', fontWeight: 600, lineHeight: 1.3 }}>{ev.title}</div>
        <button className="icon-btn" onClick={onClose} style={{ width: 24, height: 24, margin: -4 }}><X size={14} /></button>
      </div>
      <div className="num" style={{ fontSize: 'var(--t-label)', color: 'var(--ink-2)', marginTop: 8 }}>
        {fmtMin(ev.start)} – {fmtMin(ev.end)}
        <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>· {durLabel(ev.end - ev.start)}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="chip">
          <span className="cat-dot" style={{ background: CAT_VAR[ev.cat] }} />
          {CAT_LABEL[ev.cat]}
        </span>
        {ev.location && (
          <span className="chip"><MapPin size={11} /> {ev.location}</span>
        )}
      </div>
      {ev.note && (
        <div className="serif" style={{ fontSize: 'var(--t-label)', color: 'var(--ink-2)', marginTop: 12, lineHeight: 1.5 }}>{ev.note}</div>
      )}
    </div>
  )
}

function MonthGrid({ offset, onPickDay }: { offset: number; onPickDay: (d: Date) => void }) {
  const month = addMonths(today, offset)
  const cells = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const last = endOfMonth(month)
    const total = Math.ceil((differenceInCalendarDays(last, first) + 1) / 7) * 7
    return Array.from({ length: total }, (_, i) => addDays(first, i))
  }, [month])

  const catsForDay = (d: Date): Cat[] => {
    const idx = (d.getDay() + 6) % 7
    const set = new Set<Cat>()
    for (const e of EVENTS) if (e.day === idx) set.add(e.cat)
    return Array.from(set).slice(0, 5)
  }

  return (
    <div className="page">
    <div className="page-inner wide" style={{ paddingTop: 24 }}>
      <div className="month">
        {WEEKDAYS.map((w) => <div key={w} className="wd">{w}</div>)}
        {cells.map((d) => {
          const dim = !isSameMonth(d, month)
          const isToday = isSameDay(d, today)
          return (
            <div
              key={d.toISOString()}
              className={`cell${dim ? ' dim' : ''}${isToday ? ' today' : ''}`}
              onClick={() => onPickDay(d)}
            >
              <span className="dnum">{d.getDate()}</span>
              {!dim && (
                <div className="dots">
                  {catsForDay(d).map((c) => (
                    <span key={c} className="cat-dot" style={{ background: CAT_VAR[c] }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
    </div>
  )
}
