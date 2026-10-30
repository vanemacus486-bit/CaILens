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
        'grid-line':          'var(--grid-line)',
        'grid-line-date-sep': 'var(--grid-line-date-sep)',
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
          quaternary: 'var(--text-quaternary)',
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
        'color-bg-danger':    'var(--color-bg-danger)',
        'color-bg-info':      'var(--color-bg-info)',
        'color-text-info':    'var(--color-text-info)',
        'color-text-positive': 'var(--color-text-positive)',
        'color-bg-positive':   'var(--color-bg-positive)',
        'color-text-negative': 'var(--color-text-negative)',
        'color-bg-negative':   'var(--color-bg-negative)',
        'color-text-warning':  'var(--color-text-warning)',
        'color-bg-warning':    'var(--color-bg-warning)',
        'time-line':           'var(--time-line)',
        'chart-grid':          'var(--chart-grid)',
        'chart-budget-line':   'var(--chart-budget-line)',
      },
      boxShadow: {
        'pill':    'var(--shadow-pill)',
        'tooltip': 'var(--shadow-tooltip)',
        'dialog':  'var(--shadow-dialog)',
      },
      // 字号阶梯：只有这 8 档，任何组件不得再写 text-[13px] 这类任意值。
      // tight 是唯一例外档，限时间轴刻度 / 事件块内时间等极密集场景。
      fontSize: {
        '2xs':   ['var(--text-2xs)', { lineHeight: '14px' }],
        'tight': ['var(--text-tight)', { lineHeight: '15px' }],
        'xs':    ['var(--text-xs)', { lineHeight: '16px' }],
        'sm':    ['var(--text-sm)', { lineHeight: '20px' }],
        'base':  ['var(--text-base)', { lineHeight: '24px' }],
        'lg':    ['var(--text-lg)', { lineHeight: '28px' }],
        'xl':    ['var(--text-xl)', { lineHeight: '32px' }],
        '2xl':   ['var(--text-2xl)', { lineHeight: '40px' }],
        // 兼容旧名（逐步淘汰）
        'xs-alt':   'var(--text-2xs)',
        'body-xs':  'var(--text-tight)',
        'body-sm':  'var(--text-sm)',
        'settings': 'var(--text-base)',
      },
      // 圆角：这里刻意 **不** 重映射 Tailwind 默认阶梯。
      // 原因：全项目有 127 处 rounded-lg，重映射会让它们从 8px 悄悄变成 16px，
      // 属于静默改视觉。语义档位放在 --radius-* 变量里，新代码用
      // rounded-[var(--radius-md)] 这类写法显式引用，旧代码逐文件迁移。
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
      },
      letterSpacing: {
        'label': 'var(--tracking-label)',
        'caps':  'var(--tracking-caps)',
      },
      fontFamily: {
        sans:  ['var(--font-ui)', 'Inter', 'sans-serif'],
        serif: ['var(--font-display)', 'Source Serif 4', 'serif'],
        mono:  ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        'noto-serif': ['Noto Serif SC', 'serif'],
      },
    },
  },
} satisfies Config
