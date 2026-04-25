import type { EventColor } from '@/domain/event'

export interface EventColorClasses {
  bg:     string
  text:   string
  border: string
}

export const EVENT_COLOR_CLASSES: Record<EventColor, EventColorClasses> = {
  accent: { bg: 'bg-event-accent-bg', text: 'text-event-accent-text', border: 'border-event-accent-text' },
  sage:   { bg: 'bg-event-sage-bg',   text: 'text-event-sage-text',   border: 'border-event-sage-text'   },
  sand:   { bg: 'bg-event-sand-bg',   text: 'text-event-sand-text',   border: 'border-event-sand-text'   },
  sky:    { bg: 'bg-event-sky-bg',    text: 'text-event-sky-text',    border: 'border-event-sky-text'    },
  rose:   { bg: 'bg-event-rose-bg',   text: 'text-event-rose-text',   border: 'border-event-rose-text'   },
  stone:  { bg: 'bg-event-stone-bg',  text: 'text-event-stone-text',  border: 'border-event-stone-text'  },
}
