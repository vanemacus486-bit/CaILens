import { useRef, useState } from 'react'
import { MapPin, Trash2, Pencil } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { CalendarEvent } from '@/domain/event'

interface EventDetailCardProps {
  event:    CalendarEvent
  anchorEl: HTMLElement
  onEdit:   () => void
  onDelete: () => void
  onClose:  () => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const SLEEP_QUALITY_LABELS = ['', '较差', '不好', '一般', '良好', '很好'] as const

type Quality = 1 | 2 | 3 | 4 | 5

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

// ── 睡眠插图：趴睡小猫（内联 SVG·软线稿，表情随质量变） ──────────
function SleepCat({ quality }: { quality?: Quality }) {
  const mood = quality == null ? 'neutral' : quality >= 4 ? 'good' : quality <= 2 ? 'bad' : 'neutral'
  const stroke   = 'var(--cat-sleep)'
  const bodyFill = 'color-mix(in srgb, var(--cat-sleep) 14%, var(--surface-raised))'
  const tailFill = 'color-mix(in srgb, var(--cat-sleep) 22%, var(--surface-raised))'
  const earInner = 'color-mix(in srgb, var(--accent) 30%, var(--surface-raised))'
  const nose     = 'color-mix(in srgb, var(--accent) 52%, var(--cat-sleep))'

  // 闭眼：睡得好→上扬微笑眼，其它→平和下垂眼
  const eye = (cx: number) =>
    mood === 'good' ? `M${cx - 3.5} 64 q3.5 -3 7 0` : `M${cx - 3.5} 64 q3.5 3 7 0`

  return (
    <svg width="206" height="91" viewBox="14 32 172 76" fill="none" aria-hidden="true">
      <g className="animate-sleep-breathe" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {/* 尾巴：搭在身前、尖儿上翘 */}
        <path d="M170 80 C 183 88, 178 101, 152 101 C 128 101, 104 101, 92 97 C 87 95, 86 92, 90 89 C 96 93, 112 95, 134 95 C 156 96, 172 94, 170 80 Z" fill={tailFill} strokeWidth={1.6} />

        {/* 前伸的两只前爪（错开做深度）+ 趾缝 */}
        <path d="M32 89 C 27 86, 32 83, 39 84 C 50 85, 60 86, 66 86 C 72 87, 72 90, 66 90 C 52 91, 40 91, 34 90 C 32 90, 31 90, 32 89 Z" fill={bodyFill} strokeWidth={1.6} />
        <path d="M38 85 l0 5 M44 86 l0 4 M50 86 l0 4" strokeWidth={1.1} opacity={0.5} />
        <path d="M22 95 C 17 92, 22 89, 29 90 C 42 91, 54 92, 60 92 C 66 93, 66 96, 60 96 C 44 97, 30 97, 24 96 C 22 96, 21 96, 22 95 Z" fill={bodyFill} strokeWidth={1.6} />
        <path d="M28 91 l0 5 M34 92 l0 4 M40 92 l0 4" strokeWidth={1.1} opacity={0.5} />

        {/* 耳朵 + 内耳 */}
        <path d="M52 53 C 48 41, 52 39, 61 50 C 58 52, 55 53, 52 53 Z" fill={bodyFill} />
        <path d="M63 51 C 68 40, 72 42, 73 53 C 70 53, 66 52, 63 51 Z" fill={bodyFill} />
        <path d="M54 50 C 52 43, 54 42, 59 49 Z" fill={earInner} stroke="none" />
        <path d="M65 49 C 67 43, 69 44, 70 50 Z" fill={earInner} stroke="none" />

        {/* 身体：纤长趴睡（头与身为一条连续轮廓） */}
        <path d="M50 80 C 46 70, 48 60, 56 56 C 60 53, 63 53, 66 54 C 74 54, 80 56, 84 58 C 104 50, 128 50, 150 58 C 162 60, 172 64, 174 74 C 175 84, 174 90, 166 94 C 140 96, 110 96, 80 94 C 66 94, 58 92, 54 88 C 50 85, 49 82, 50 80 Z" fill={bodyFill} strokeWidth={1.9} />
        {/* 后腿胯线（体积感） */}
        <path d="M148 64 C 162 68, 166 82, 156 92" fill="none" strokeWidth={1.3} opacity={0.35} />

        {/* 脸颊腮红 */}
        <ellipse cx="51" cy="70.5" rx="3" ry="1.8" fill="var(--accent)" stroke="none" opacity={0.16} />
        <ellipse cx="69" cy="70.5" rx="3" ry="1.8" fill="var(--accent)" stroke="none" opacity={0.16} />

        {/* 皱眉（睡不好） */}
        {mood === 'bad' && <path d="M50 60 l6 2.5" strokeWidth={1.5} />}
        {mood === 'bad' && <path d="M70 60 l-6 2.5" strokeWidth={1.5} />}

        {/* 闭着的眼 */}
        <path d={eye(54)} fill="none" />
        <path d={eye(66)} fill="none" />

        {/* 鼻 + ω 嘴 */}
        <path d="M57.5 69 L62.5 69 L60 72.5 Z" fill={nose} stroke="none" />
        <path d="M60 72.5 q-2.6 2.2 -5 0.3" fill="none" strokeWidth={1.4} />
        <path d="M60 72.5 q2.6 2.2 5 0.3" fill="none" strokeWidth={1.4} />

        {/* 胡须 */}
        <g strokeWidth={1} opacity={0.4}>
          <path d="M50 68 l-9 -1.5 M50 71 l-9 1.5" />
          <path d="M70 68 l9 -1.5 M70 71 l9 1.5" />
        </g>

        {/* 睡得香的小亮点 */}
        {mood === 'good' && (
          <path d="M158 46 l1.6 4.2 4.2 1.6 -4.2 1.6 -1.6 4.2 -1.6 -4.2 -4.2 -1.6 4.2 -1.6 Z" fill={stroke} stroke="none" opacity={0.7} />
        )}
      </g>
    </svg>
  )
}

// ── 睡眠插图带：色温渐隐底 + 漂浮 Zzz + 猫 ──────────────
function SleepScene({ quality }: { quality?: Quality }) {
  return (
    <div
      className="relative flex items-end justify-center overflow-hidden"
      style={{ height: 100, background: 'linear-gradient(180deg, color-mix(in srgb, var(--cat-sleep-bg) 78%, transparent), transparent)' }}
    >
      <span className="absolute animate-sleep-zzz select-none" style={{ left: '32%', top: 28, fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--cat-sleep)', opacity: 0.8, animationDelay: '0s' }}>z</span>
      <span className="absolute animate-sleep-zzz select-none" style={{ left: '39%', top: 15, fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--cat-sleep)', opacity: 0.8, animationDelay: '0.9s' }}>z</span>
      <span className="absolute animate-sleep-zzz select-none" style={{ left: '46%', top: 3, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--cat-sleep)', opacity: 0.8, animationDelay: '1.8s' }}>Z</span>
      <div className="pb-1">
        <SleepCat quality={quality} />
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
          {sleep && <SleepScene quality={sleep.quality} />}

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
