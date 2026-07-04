/**
 * # DrawerModeSwitcher — DayDrawer 板块开关
 *
 * 三个并排按钮：当日概览 / 时间轴 / AI 助手
 * 多选开关而非互斥 tab——点亮的板块会一起摞在下方内容区，可以同时点亮多个。
 */

import { CloudSun, Clock, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/useT'

export type DrawerMode = 'weather-archive' | 'timeline' | 'ai'

interface DrawerModeItem {
  mode: DrawerMode
  icon: typeof CloudSun
}

export const MODES: DrawerModeItem[] = [
  { mode: 'weather-archive', icon: CloudSun },
  { mode: 'timeline',       icon: Clock },
  { mode: 'ai',             icon: Bot },
]

export const MODE_LABEL_KEYS: Record<DrawerMode, string> = {
  'weather-archive': 'dayDrawer.overview',
  timeline: 'dayDrawer.timeline',
  ai:       'dayDrawer.aiAssistant',
}

interface DrawerModeSwitcherProps {
  activeModes: DrawerMode[]
  onToggleMode: (mode: DrawerMode) => void
}

export function DrawerModeSwitcher({ activeModes, onToggleMode }: DrawerModeSwitcherProps) {
  const t = useT()

  return (
    <div className="flex items-center gap-1">
      {MODES.map(({ mode: m, icon: ModeIcon }) => {
        const active = activeModes.includes(m)
        return (
          <button
            key={m}
            onClick={() => onToggleMode(m)}
            aria-pressed={active}
            title={t(MODE_LABEL_KEYS[m])}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 cursor-pointer border-none',
              active
                ? 'bg-accent/10 text-accent'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-sunken',
            )}
            aria-label={t(MODE_LABEL_KEYS[m])}
          >
            <ModeIcon size={14} strokeWidth={1.75} />
          </button>
        )
      })}
    </div>
  )
}
