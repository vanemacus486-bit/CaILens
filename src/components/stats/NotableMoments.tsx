import type { Bucket } from '@/hooks/useStatsAggregation'
import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'

interface NotableMomentsProps {
  current: Bucket
  rangeEvents: readonly CalendarEvent[]
  streak: number
  categories: Category[]
  language: 'zh' | 'en'
}

interface Moment {
  type: 'record' | 'streak' | 'first' | 'insight'
  text: string
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16">
      <polygon points="8,1 10.2,6.2 16,6.8 11.5,11 13,16 8,13 3,16 4.5,11 0,6.8 5.8,6.2" fill="#c96442" />
    </svg>
  )
}

function StreakIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16">
      <path d="M8 2 L8 14 M4 6 L8 2 L12 6" stroke="#5a8a5e" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FirstIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.5" stroke="#7a7060" strokeWidth="1.8" fill="none" />
      <text x="8" y="12" textAnchor="middle" fontSize="8" fill="#7a7060" fontFamily="Georgia,serif" fontWeight="600">1</text>
    </svg>
  )
}

function InsightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16">
      <circle cx="8" cy="7" r="4.5" stroke="#9A8AB0" strokeWidth="1.8" fill="none" />
      <line x1="8" y1="12.5" x2="8" y2="15" stroke="#9A8AB0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const MOMENT_META = {
  record:  { bg: '#F0E8D8', icon: <StarIcon /> },
  streak:  { bg: '#EAF0E8', icon: <StreakIcon /> },
  first:   { bg: '#E8EEF5', icon: <FirstIcon /> },
  insight: { bg: '#EDE8F0', icon: <InsightIcon /> },
}

export function NotableMoments({ current, rangeEvents, streak, categories, language }: NotableMomentsProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  // Find notable moments from data
  const moments: Moment[] = []

  // Streak
  if (streak > 0) {
    moments.push({
      type: 'streak',
      text: t(
        `${streak} 天连续记录 — 个人纪录`,
        `${streak}-day consecutive tracking streak — a personal record`,
      ),
    })
  }

  // Longest event (exclude rest/sleep category)
  let longest: CalendarEvent | null = null
  let longestDur = 0
  for (const e of rangeEvents) {
    if (e.categoryId === 'rose') continue
    const dur = e.endTime - e.startTime
    if (dur > longestDur) { longestDur = dur; longest = e }
  }
  if (longest && longestDur >= 2 * 60 * 60_000) {
    const hrs = (longestDur / 3_600_000).toFixed(1)
    moments.push({
      type: 'record',
      text: t(
        `最长连续记录段：${hrs} 小时 — ${longest.title || '(无标题)'}`,
        `Longest unbroken session: ${hrs}h — ${longest.title || '(Untitled)'}`,
      ),
    })
  }

  // Top category insight
  let topCat = 'accent'
  let topHrs = 0
  for (const [id, hrs] of Object.entries(current.byCategory)) {
    if (hrs > topHrs) { topHrs = hrs; topCat = id }
  }
  if (topHrs > 0) {
    const name = categories.find(c => c.id === topCat)?.name[language] ?? topCat
    moments.push({
      type: 'insight',
      text: t(
        `${name} 是本期投入最多的分类，共 ${topHrs.toFixed(1)}h`,
        `${name} was the top category this period at ${topHrs.toFixed(1)}h`,
      ),
    })
  }

  // Total hours milestone
  if (current.total >= 40) {
    moments.push({
      type: 'insight',
      text: t(
        `本周净有效时间超过 40h — 高效的一周`,
        `Net effective time exceeded 40h this period — a highly productive stretch`,
      ),
    })
  }

  if (moments.length === 0) {
    return (
      <div className="bg-surface-raised border border-border-subtle px-6 py-8 text-center">
        <p className="text-xs text-text-tertiary italic">
          {t('继续记录，精彩时刻将在这里出现', 'Keep tracking — notable moments will appear here')}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {moments.map((m, i) => {
        const meta = MOMENT_META[m.type]
        return (
          <div key={i} className="bg-surface-raised border border-border-subtle px-5 py-[18px] flex gap-3.5 items-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
              {meta.icon}
            </div>
            <p className="text-[13px] text-text-primary leading-[1.55]">{m.text}</p>
          </div>
        )
      })}
    </div>
  )
}
