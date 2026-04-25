import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          base:   'var(--surface-base)',
          raised: 'var(--surface-raised)',
          sunken: 'var(--surface-sunken)',
        },
        border: {
          subtle:  'var(--border-subtle)',
          default: 'var(--border-default)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   'var(--accent-hover)',
        },
        'event-accent-bg':   'var(--event-accent-bg)',
        'event-accent-text': 'var(--event-accent-text)',
        'event-sage-bg':     'var(--event-sage-bg)',
        'event-sage-text':   'var(--event-sage-text)',
        'event-sand-bg':     'var(--event-sand-bg)',
        'event-sand-text':   'var(--event-sand-text)',
        'event-sky-bg':      'var(--event-sky-bg)',
        'event-sky-text':    'var(--event-sky-text)',
        'event-rose-bg':     'var(--event-rose-bg)',
        'event-rose-text':   'var(--event-rose-text)',
        'event-stone-bg':    'var(--event-stone-bg)',
        'event-stone-text':  'var(--event-stone-text)',
      },
      fontFamily: {
        sans:  ['Inter', 'sans-serif'],
        serif: ['Source Serif 4', 'serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
    },
  },
} satisfies Config
