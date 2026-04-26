import type { CategoryId } from './category'

export type EventColor = 'accent' | 'sage' | 'sand' | 'sky' | 'rose' | 'stone'

export const EVENT_COLORS: readonly EventColor[] = [
  'accent', 'sage', 'sand', 'sky', 'rose', 'stone',
] as const

export const EVENT_COLOR_LABELS: Record<EventColor, string> = {
  accent: 'Orange',
  sage:   'Sage',
  sand:   'Sand',
  sky:    'Sky',
  rose:   'Rose',
  stone:  'Stone',
}

export interface CalendarEvent {
  id: string
  title: string
  startTime: number   // UTC ms
  endTime: number     // UTC ms
  color: EventColor
  categoryId: CategoryId  // 新增
  description?: string
  location?: string
  createdAt: number   // UTC ms
  updatedAt: number   // UTC ms
}

export type CreateEventInput = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateEventInput = Pick<CalendarEvent, 'id'> &
  Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>
