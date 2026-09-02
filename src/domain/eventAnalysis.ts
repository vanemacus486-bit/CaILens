import type { CalendarEvent } from './event'

export interface EventGroupSummary {
  key: string
  displayTitle: string
  count: number
  totalMinutes: number
  latestAt: number
  color: CalendarEvent['color']
  categoryId: CalendarEvent['categoryId']
}

export interface EventDistributionBucket {
  label: string
  count: number
  totalMinutes: number
}

export interface EventAnalysis {
  key: string
  displayTitle: string
  count: number
  totalMinutes: number
  medianMinutes: number
  firstAt: number
  latestAt: number
  color: CalendarEvent['color']
  categoryId: CalendarEvent['categoryId']
  records: CalendarEvent[]
  hourly: EventDistributionBucket[]
  weekdays: EventDistributionBucket[]
  durations: EventDistributionBucket[]
}

export interface SleepAssociation {
  status: 'ready' | 'insufficient'
  restedDays: number
  shortSleepDays: number
  restedOccurrenceRate?: number
  shortSleepOccurrenceRate?: number
  deltaPercentagePoints?: number
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function normalizeEventTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function groupEventsByTitle(events: CalendarEvent[]): EventGroupSummary[] {
  const groups = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    if (event.deletedAt) continue
    const key = normalizeEventTitle(event.title)
    if (!key) continue
    const group = groups.get(key)
    if (group) group.push(event)
    else groups.set(key, [event])
  }

  return Array.from(groups.entries())
    .map(([key, records]) => {
      const latest = records.reduce((best, record) => record.startTime > best.startTime ? record : best)
      return {
        key,
        displayTitle: chooseDisplayTitle(records),
        count: records.length,
        totalMinutes: sumMinutes(records),
        latestAt: latest.startTime,
        color: latest.color,
        categoryId: latest.categoryId,
      }
    })
    .sort((a, b) => b.totalMinutes - a.totalMinutes || b.latestAt - a.latestAt)
}

export function analyzeEvent(events: CalendarEvent[], key: string): EventAnalysis | null {
  const normalizedKey = normalizeEventTitle(key)
  const records = events
    .filter((event) => !event.deletedAt && normalizeEventTitle(event.title) === normalizedKey)
    .sort((a, b) => a.startTime - b.startTime)
  if (records.length === 0) return null

  const latest = records[records.length - 1]
  const durations = records.map(durationMinutes).sort((a, b) => a - b)
  return {
    key: normalizedKey,
    displayTitle: chooseDisplayTitle(records),
    count: records.length,
    totalMinutes: durations.reduce((sum, duration) => sum + duration, 0),
    medianMinutes: median(durations),
    firstAt: records[0].startTime,
    latestAt: latest.startTime,
    color: latest.color,
    categoryId: latest.categoryId,
    records: [...records].reverse(),
    hourly: buildHourlyDistribution(records),
    weekdays: buildWeekdayDistribution(records),
    durations: buildDurationDistribution(records),
  }
}

export function computeSleepAssociation(
  events: CalendarEvent[],
  eventKey: string,
  minimumDaysPerGroup = 5,
): SleepAssociation {
  const normalizedKey = normalizeEventTitle(eventKey)
  const targetDates = new Set(
    events
      .filter((event) => normalizeEventTitle(event.title) === normalizedKey)
      .map((event) => localDateKey(event.startTime)),
  )

  const sleepByWakeDate = new Map<string, number>()
  for (const event of events) {
    if (event.typedData?.type !== 'sleep' || event.typedData.sleepType !== 'main') continue
    const key = localDateKey(event.endTime)
    sleepByWakeDate.set(key, (sleepByWakeDate.get(key) ?? 0) + durationMinutes(event))
  }

  let restedDays = 0
  let restedOccurrences = 0
  let shortSleepDays = 0
  let shortSleepOccurrences = 0
  for (const [date, minutes] of sleepByWakeDate) {
    const occurred = targetDates.has(date)
    if (minutes >= 7 * 60) {
      restedDays += 1
      if (occurred) restedOccurrences += 1
    } else {
      shortSleepDays += 1
      if (occurred) shortSleepOccurrences += 1
    }
  }

  if (restedDays < minimumDaysPerGroup || shortSleepDays < minimumDaysPerGroup) {
    return { status: 'insufficient', restedDays, shortSleepDays }
  }

  const restedOccurrenceRate = restedOccurrences / restedDays
  const shortSleepOccurrenceRate = shortSleepOccurrences / shortSleepDays
  return {
    status: 'ready',
    restedDays,
    shortSleepDays,
    restedOccurrenceRate,
    shortSleepOccurrenceRate,
    deltaPercentagePoints: Math.round((restedOccurrenceRate - shortSleepOccurrenceRate) * 100),
  }
}

function chooseDisplayTitle(records: CalendarEvent[]): string {
  const variants = new Map<string, { count: number; latestAt: number }>()
  for (const record of records) {
    const title = record.title.trim().replace(/\s+/g, ' ')
    const current = variants.get(title)
    variants.set(title, {
      count: (current?.count ?? 0) + 1,
      latestAt: Math.max(current?.latestAt ?? 0, record.startTime),
    })
  }
  return Array.from(variants.entries())
    .sort((a, b) => b[1].count - a[1].count || b[1].latestAt - a[1].latestAt)[0][0]
}

function buildHourlyDistribution(records: CalendarEvent[]): EventDistributionBucket[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const matching = records.filter((record) => new Date(record.startTime).getHours() === hour)
    return { label: `${String(hour).padStart(2, '0')}:00`, count: matching.length, totalMinutes: sumMinutes(matching) }
  })
}

function buildWeekdayDistribution(records: CalendarEvent[]): EventDistributionBucket[] {
  return WEEKDAY_LABELS.map((label, weekday) => {
    const matching = records.filter((record) => new Date(record.startTime).getDay() === weekday)
    return { label, count: matching.length, totalMinutes: sumMinutes(matching) }
  })
}

function buildDurationDistribution(records: CalendarEvent[]): EventDistributionBucket[] {
  const buckets = [
    { label: '<30m', min: 0, max: 30 },
    { label: '30–60m', min: 30, max: 60 },
    { label: '1–2h', min: 60, max: 120 },
    { label: '≥2h', min: 120, max: Number.POSITIVE_INFINITY },
  ]
  return buckets.map((bucket) => {
    const matching = records.filter((record) => {
      const duration = durationMinutes(record)
      return duration >= bucket.min && duration < bucket.max
    })
    return { label: bucket.label, count: matching.length, totalMinutes: sumMinutes(matching) }
  })
}

function durationMinutes(event: CalendarEvent): number {
  return Math.max(0, Math.round((event.endTime - event.startTime) / 60_000))
}

function sumMinutes(events: CalendarEvent[]): number {
  return events.reduce((sum, event) => sum + durationMinutes(event), 0)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const middle = Math.floor(values.length / 2)
  return values.length % 2 === 0
    ? Math.round((values[middle - 1] + values[middle]) / 2)
    : values[middle]
}

function localDateKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
