import type { CalendarEvent } from '@/domain/event'

function fmtIcsDate(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function generateIcs(events: readonly CalendarEvent[]): string {
  const now = fmtIcsDate(Date.now())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CaILens//Time Tracking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const e of events) {
    const uid = e.id
    const dtstart = fmtIcsDate(e.startTime)
    const dtend = fmtIcsDate(e.endTime)
    const summary = escapeIcs(e.title || '')
    const catName = e.categoryId
    const desc = e.description ? escapeIcs(e.description) : ''
    const loc = e.location ? escapeIcs(e.location) : ''

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTART:${dtstart}`)
    lines.push(`DTEND:${dtend}`)
    lines.push(`SUMMARY:${summary}`)
    lines.push(`CATEGORIES:${catName}`)
    if (desc) lines.push(`DESCRIPTION:${desc}`)
    if (loc) lines.push(`LOCATION:${loc}`)
    lines.push(`DTSTAMP:${now}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(icsText: string, filename?: string): void {
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `cailens-export-${new Date().toISOString().slice(0, 10)}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
