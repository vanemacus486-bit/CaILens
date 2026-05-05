import type { EventColor } from '@/domain/event'

export interface EventColorClasses {
  bg:     string
  text:   string
  border: string
  fill:   string
}

export const EVENT_COLOR_CLASSES: Record<EventColor, EventColorClasses> = {
  accent: { bg: 'bg-event-accent-bg', text: 'text-event-accent-text', border: 'border-event-accent-text', fill: 'bg-event-accent-fill' },
  sage:   { bg: 'bg-event-sage-bg',   text: 'text-event-sage-text',   border: 'border-event-sage-text',   fill: 'bg-event-sage-fill'   },
  sand:   { bg: 'bg-event-sand-bg',   text: 'text-event-sand-text',   border: 'border-event-sand-text',   fill: 'bg-event-sand-fill'   },
  sky:    { bg: 'bg-event-sky-bg',    text: 'text-event-sky-text',    border: 'border-event-sky-text',    fill: 'bg-event-sky-fill'    },
  rose:   { bg: 'bg-event-rose-bg',   text: 'text-event-rose-text',   border: 'border-event-rose-text',   fill: 'bg-event-rose-fill'   },
  stone:  { bg: 'bg-event-stone-bg',  text: 'text-event-stone-text',  border: 'border-event-stone-text',  fill: 'bg-event-stone-fill'  },
}
