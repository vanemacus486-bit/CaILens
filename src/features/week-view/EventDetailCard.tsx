import { useEffect, useRef, useState } from 'react'
import { MapPin, Trash2, Pencil } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { CalendarEvent } from '@/domain/event'
import { computeEventEcho } from '@/domain/eventEcho'
import type { EventEcho } from '@/domain/eventEcho'
import { getWeekStart, getDayEnd } from '@/domain/time'
import { useEventStore } from '@/stores/eventStore'
import sleepingCatImage from '@/assets/illustrations/sleeping-cat.webp'

interface EventDetailCardProps {
  event:    CalendarEvent
  anchorEl: HTMLElement
  onEdit:   () => void
  onDelete: () => void
  onClose:  () => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const SLEEP_QUALITY_LABELS = ['', '较差', '不好', '一般', '良好', '很好'] as const

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtDateLine(startTs: number, endTs: number): string {
  const s = new Date(startTs)
  const e = new Date(endTs)
  const datePart = `${s.getMonth() + 1}月${s.getDate()}日 星期${WEEKDAYS[s.getDay()]}`
  const sameDay = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate()
  if (sameDay) {
    return `${datePart} · ${fmtTime(startTs)} – ${fmtTime(endTs)}`
  }
  return `${datePart} ${fmtTime(startTs)} – ${e.getMonth() + 1}月${e.getDate()}日 ${fmtTime(endTs)}`
}

function fmtShortDuration(ms: number): string {
  const hours = ms / 3_600_000
  if (hours >= 1) return hours.toFixed(1) + 'h'
  return Math.round(ms / 60_000) + 'm'
}

// ── 睡眠插图带：色温渐隐底 + 漂浮 Zzz + 猫 ──────────────
function SleepScene() {
  return (
    <div
      className="relative flex items-end justify-center overflow-hidden"
      style={{ height: 100, background: 'linear-gradient(180deg, color-mix(in srgb, var(--cat-sleep-bg) 78%, transparent), transparent)' }}
    >
      <span className="absolute animate-sleep-zzz select-none" style={{ left: '32%', top: 28, fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--cat-sleep)', opacity: 0.8, animationDelay: '0s' }}>z</span>
      <span className="absolute animate-sleep-zzz select-none" style={{ left: '39%', top: 15, fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--cat-sleep)', opacity: 0.8, animationDelay: '0.9s' }}>z</span>
      <span className="absolute animate-sleep-zzz select-none" style={{ left: '46%', top: 3, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--cat-sleep)', opacity: 0.8, animationDelay: '1.8s' }}>Z</span>
      <div className="pb-1">
        <img
          src={sleepingCatImage}
          alt=""
          width={206}
          height={91}
          draggable={false}
          className="animate-sleep-breathe h-[91px] w-[206px] object-contain opacity-90 dark:opacity-75 dark:brightness-75"
        />
      </div>
    </div>
  )
}

// ── 五分质量：月牙 pip ─────────────────────────────────
function MoonPip({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M10.6 2 a6 6 0 1 0 4 10.6 A7.2 7.2 0 0 1 10.6 2 Z"
        fill={filled ? 'var(--cat-sleep)' : 'transparent'}
        stroke="var(--cat-sleep)"
        strokeWidth={filled ? 0 : 1.4}
        opacity={filled ? 0.95 : 0.4}
      />
    </svg>
  )
}

function SleepChip({ children }: { children: string }) {
  return (
    <span
      className="px-1.5 py-px rounded text-[10px]"
      style={{ backgroundColor: 'var(--cat-sleep-bg)', color: 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}
    >
      {children}
    </span>
  )
}

export function EventDetailCard({ event, anchorEl, onEdit, onDelete, onClose }: EventDetailCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [echo, setEcho] = useState<EventEcho | null>(null)
  const [echoReady, setEchoReady] = useState(false)

  const queryRange = useEventStore((s) => s.queryRange)

  useEffect(() => {
    const title = event.title.trim()
    if (!title) {
      setEcho(null)
      setEchoReady(false)
      return
    }

    let cancelled = false
    setEchoReady(false)

    const doFetch = async () => {
      const d = new Date(event.startTime)
      const weekStartMs = getWeekStart(d, 1).getTime()
      const monthStartMs = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      const dayEndMs = getDayEnd(d)

      const queryStart = Math.min(monthStartMs, event.startTime - 90 * 86_400_000)
      const queryEnd = dayEndMs

      try {
        const events = await queryRange(queryStart, queryEnd)
        if (cancelled) return

        const result = computeEventEcho(event, events, weekStartMs, monthStartMs)
        setEcho(result)
        setEchoReady(true)
      } catch {
        // silent — stats are decorative
        if (!cancelled) setEchoReady(false)
      }
    }

    doFetch()
    return () => { cancelled = true }
  }, [event.id, event.startTime, event.title, queryRange])

  const virtualRef = useRef<HTMLElement>(null!)
  virtualRef.current = anchorEl

  const isEmpty = !event.title.trim()

  const td = event.typedData
  const sleep = td && td.type === 'sleep' ? td : null

  return (
    <>
      <Popover open>
        <PopoverAnchor virtualRef={virtualRef} />

        <PopoverContent
          side="right"
          className="w-64 p-0 max-md:!w-[calc(100vw-1rem)] max-md:max-w-64 overflow-hidden"
          style={{
            // 卡片材质：磨砂玻璃 — 半透明底（跟随主题）+ 背后模糊 + 白边高光 + 浮层投影
            backgroundColor: 'color-mix(in srgb, var(--surface-raised) 72%, transparent)',
            backdropFilter: 'blur(16px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
            borderColor: 'rgba(255,255,255,0.4)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), var(--shadow-card-float)',
          }}
          onPointerDownOutside={onClose}
          onEscapeKeyDown={onClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* 睡眠事件：顶部猫咪插图带 */}
          {sleep && <SleepScene />}

          <div className="p-4 flex flex-col gap-2.5">
            {/* Title row: color dot + title + icon actions */}
            <div className="flex items-start gap-2.5">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0 mt-[3px]"
                style={{ backgroundColor: `var(--event-${event.color}-fill)` }}
              />
              <p className={`flex-1 text-[16px] font-serif leading-snug min-w-0 ${isEmpty ? 'text-text-tertiary italic' : 'text-text-primary font-medium'}`}>
                {isEmpty ? '(无标题)' : event.title}
              </p>
              <div className="flex items-center gap-0.5 flex-shrink-0 -mt-0.5 -mr-1">
                <button
                  onClick={onEdit}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-black/[0.06] dark:hover:bg-white/10 transition-colors"
                  title="编辑"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-color-text-danger hover:bg-black/[0.06] dark:hover:bg-white/10 transition-colors"
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Date / time */}
            <p className="text-[12px] text-text-secondary font-sans leading-relaxed pl-[22px]">
              {fmtDateLine(event.startTime, event.endTime)}
            </p>

            {/* Echo stats */}
            {echoReady && echo && (() => {
              const { weekCount, monthTotalMs, daysSinceLast } = echo
              const isFirst = weekCount === 1 && daysSinceLast === null

              const line = isFirst
                ? '90 天内首次记录'
                : [
                    `本周第 ${weekCount} 次`,
                    `本月 ${fmtShortDuration(monthTotalMs)}`,
                    daysSinceLast === 0 ? '今天还有一次' : daysSinceLast != null ? `距上次 ${daysSinceLast} 天` : null,
                  ].filter(Boolean).join(' · ')

              return (
                <p className="text-[11px] text-text-tertiary font-sans leading-relaxed pl-[22px] animate-fadeIn">
                  {line}
                </p>
              )
            })()}

            {/* Sleep quality (5-moon scale) */}
            {sleep && (
              <div className="flex items-center gap-2 pl-[22px]">
                <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}>睡眠质量</span>
                <div className="flex items-center gap-[3px]">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <MoonPip key={i} filled={sleep.quality != null && i <= sleep.quality} />
                  ))}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: sleep.quality ? 'var(--ink)' : 'var(--ink-3)', fontFamily: 'var(--font-ui)' }}>
                  {sleep.quality ? SLEEP_QUALITY_LABELS[sleep.quality] : '未评级'}
                </span>
              </div>
            )}

            {/* Sleep tags: nap / insomnia / nightmare / awakening */}
            {sleep && (sleep.sleepType !== 'main' || sleep.hasNightmare || sleep.hasAwakening) && (
              <div className="flex flex-wrap gap-1 pl-[22px]">
                {sleep.sleepType === 'nap' && <SleepChip>小睡</SleepChip>}
                {sleep.sleepType === 'insomnia' && <SleepChip>失眠</SleepChip>}
                {sleep.hasNightmare && <SleepChip>噩梦</SleepChip>}
                {sleep.hasAwakening && <SleepChip>夜醒</SleepChip>}
              </div>
            )}

            {/* Description */}
            {event.description && (
              <p className="text-[13px] text-text-secondary line-clamp-3 font-sans leading-relaxed pl-[22px]">
                {event.description}
              </p>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-1.5 text-xs text-text-secondary pl-[22px]">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-text-tertiary" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除事件？</AlertDialogTitle>
            <AlertDialogDescription>
              {isEmpty
                ? '此事件将被永久删除。'
                : `"${event.title}" 将被永久删除。`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-color-text-danger text-white"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
