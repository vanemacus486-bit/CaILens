import type { CalendarEvent, EventColor } from '@/domain/event'

/**
 * Live-preview data sent from EventEditCard to WeekView while the user
 * edits times/colour. WeekView merges this into the events list so the
 * event block moves in real-time without touching the database.
 */
export interface DraftPreview {
  startTime: number
  endTime:   number
  color:     EventColor
}

export type CardState =
  | { mode: 'none' }
  | { mode: 'detail'; event: CalendarEvent; anchorEl: HTMLElement }
  | { mode: 'edit';   event: CalendarEvent; anchorEl: HTMLElement; isNewlyCreated: boolean }
