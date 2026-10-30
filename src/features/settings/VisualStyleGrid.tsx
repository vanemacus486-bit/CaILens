import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { VisualStyle } from '@/domain/settings'

interface StyleDef {
  key: VisualStyle
  name: string
  nameZh: string
  badge: string
  swatches: [string, string, string]
  descZh: string
}

/**
 * 只有两套视觉风格。加第三套的代价是每个组件都要多验一遍所有 token，
 * 收益远小于把这两套做扎实——所以这里的清单刻意保持短。
 */
const STYLES: StyleDef[] = [
  {
    key: 'graphite',
    name: 'Graphite',
    nameZh: '石墨',
    badge: '默认',
    swatches: ['#F1EBE0', '#FBFAF6', '#c47a5a'],
    descZh: '暖纸底配石墨文字与陶土橙强调。日常记录、长时间阅读都在这套上。',
  },
  {
    key: 'tide',
    name: 'Tide',
    nameZh: '浸染',
    badge: '沉浸',
    swatches: ['#10645B', '#156E64', '#F2B279'],
    descZh: '整面画布沉入深青，卡片浮于其上。浅色模式也刻意保持深底。',
  },
]

export function VisualStyleGrid() {
  const visualStyle = useAppSettingsStore((s) => s.settings.visualStyle ?? 'graphite')
  const setVisualStyle = useAppSettingsStore((s) => s.setVisualStyle)

  return (
    <div className="visual-style-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
      {STYLES.map((style) => {
        const selected = visualStyle === style.key
        return (
          <button
            key={style.key}
            onClick={() => fireAndForget(setVisualStyle(style.key), 'set visual style')}
            className={cn(
              'visual-style-card relative text-left rounded-md p-4 border transition-colors duration-200 cursor-pointer',
              'bg-surface-raised',
              selected
                ? 'border-accent ring-2 ring-accent/20'
                : 'border-border-subtle hover:border-border-default',
            )}
          >
            {selected && (
              <div
                className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: style.swatches[2] }}
              >
                <Check size={11} color="white" strokeWidth={2.5} />
              </div>
            )}

            <div className="flex items-baseline gap-2 mb-2 pr-8">
              <span className="text-sm font-sans font-semibold text-text-primary leading-tight">
                {style.name}
              </span>
              <span className="text-xs font-sans text-text-secondary leading-tight">
                {style.nameZh}
              </span>
            </div>

            <div className="mb-3">
              <span className="text-xs font-sans px-2 py-0.5 rounded-xs bg-surface-sunken text-text-tertiary">
                {style.badge}
              </span>
            </div>

            <div className="flex gap-2 mb-3">
              <div
                className="h-8 rounded-sm border border-black/5 flex-1"
                style={{ backgroundColor: style.swatches[0] }}
              />
              <div
                className="h-8 rounded-sm border border-black/5 flex-1"
                style={{ backgroundColor: style.swatches[1] }}
              />
              <div
                className="h-8 rounded-sm border border-black/5"
                style={{ backgroundColor: style.swatches[2], flex: '1.5' }}
              />
            </div>

            <p className="text-xs font-sans text-text-tertiary leading-relaxed">
              {style.descZh}
            </p>
          </button>
        )
      })}
    </div>
  )
}
