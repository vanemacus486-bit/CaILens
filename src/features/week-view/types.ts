import type { CalendarEvent } from '@/domain/event'

export type CardState =
  | { mode: 'none' }
  | { mode: 'detail'; event: CalendarEvent; anchorEl: HTMLElement }
