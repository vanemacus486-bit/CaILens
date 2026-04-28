/**
 * Pure-function parser for .ics files (RFC 5545).
 *
 * This module is part of the domain layer and has zero dependency on React,
 * browser APIs, or ical.js at the module level — the import is scoped to
 * the parseIcs function which is called explicitly by the UI layer.
 */

import ICAL from 'ical.js'

export interface ImportedEvent {
  title: string
  startTime: number  // UTC ms
  endTime: number    // UTC ms
  description?: string
  location?: string
}

export interface ImportResult {
  events: ImportedEvent[]
  skippedAllDay: number
  skippedRecurring: number
}

/**
 * Parses an .ics text string and returns normal events along with skip counts.
 *
 * Throws if the input is empty, not valid iCalendar format, or if ICAL.parse
 * fails — the caller should catch the error and display it to the user.
 */
export function parseIcs(icsText: string): ImportResult {
  if (!icsText || icsText.trim().length === 0) {
    throw new Error('Empty or missing calendar data')
  }

  let jcal: unknown
  try {
    jcal = ICAL.parse(icsText)
  } catch {
    throw new Error('Cannot parse this file')
  }

  const vcal = new ICAL.Component(jcal as unknown[])

  if (vcal.name !== 'vcalendar') {
    throw new Error('Not a valid iCalendar file')
  }

  const vevents = vcal.getAllSubcomponents('vevent')
  const events: ImportedEvent[] = []
  let skippedAllDay = 0
  let skippedRecurring = 0

  for (const veventComp of vevents) {
    const icalEvent = new ICAL.Event(veventComp)
    const startDate = icalEvent.startDate

    // All-day events: DTSTART with VALUE=DATE (no time component)
    if (startDate.isDate) {
      skippedAllDay++
      continue
    }

    // Recurring events: RRULE, RDATE, or RECURRENCE-ID
    if (
      veventComp.hasProperty('rrule') ||
      veventComp.hasProperty('rdate') ||
      veventComp.hasProperty('recurrence-id')
    ) {
      skippedRecurring++
      continue
    }

    const title = icalEvent.summary ?? ''
    const startTime = startDate.toJSDate().getTime()
    const description = icalEvent.description || undefined
    const location = icalEvent.location || undefined

    // If DTEND is missing, default to 1 hour after start
    // (Google Calendar exports sometimes omit DTEND).
    let endTime: number
    if (!veventComp.hasProperty('dtend')) {
      endTime = startTime + 60 * 60_000
    } else {
      endTime = icalEvent.endDate.toJSDate().getTime()
    }

    events.push({ title, startTime, endTime, description, location })
  }

  return { events, skippedAllDay, skippedRecurring }
}
