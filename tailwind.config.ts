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
          light:   'var(--accent-light)',
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
        'event-accent-fill': 'var(--event-accent-fill)',
        'event-sage-fill':   'var(--event-sage-fill)',
        'event-sand-fill':   'var(--event-sand-fill)',
        'event-sky-fill':    'var(--event-sky-fill)',
        'event-rose-fill':   'var(--event-rose-fill)',
        'event-stone-fill':  'var(--event-stone-fill)',
        'color-text-success': 'var(--color-text-success)',
        'color-text-danger':  'var(--color-text-danger)',
        'color-bg-info':      'var(--color-bg-info)',
        'color-text-info':    'var(--color-text-info)',
        'color-text-positive': 'var(--color-text-positive)',
        'color-bg-positive':   'var(--color-bg-positive)',
        'color-text-negative': 'var(--color-text-negative)',
        'color-bg-negative':   'var(--color-bg-negative)',
        'color-text-warning':  'var(--color-text-warning)',
        'color-bg-warning':    'var(--color-bg-warning)',
      },
      fontFamily: {
        sans:  ['Inter', 'sans-serif'],
        serif: ['Source Serif 4', 'serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
    },
  },
} satisfies Config
