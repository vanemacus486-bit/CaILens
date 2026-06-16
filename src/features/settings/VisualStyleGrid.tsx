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

const STYLES: StyleDef[] = [
  {
    key: 'graphite',
    name: 'Graphite',
    nameZh: '石墨',
    badge: '利落',
    swatches: ['#F1EBE0', '#FBFAF6', '#c47a5a'],
    descZh: '纸面白配石墨文字与橙色强调，利落、克制，贴近编辑器工作台。',
  },
  {
    key: 'aurora',
    name: 'Aurora',
    nameZh: '柔雾极光',
    badge: '温润',
    swatches: ['#EFEDF7', '#FBFAFE', '#7C6FE0'],
    descZh: '柔紫底色融合极光蓝绿，半透明面板与弹性圆角，更轻盈、有呼吸感。',
  },
  {
    key: 'slate',
    name: 'Slate',
    nameZh: '精炼',
    badge: '原生',
    swatches: ['#ECEEF1', '#FBFCFD', '#3B6EF5'],
    descZh: '冷灰工作台配品牌蓝，发丝边框清晰，适合高密度扫描与专业操作。',
  },
  {
    key: 'carbon',
    name: 'Carbon',
    nameZh: '深邃',
    badge: '高级',
    swatches: ['#ECEAE4', '#F8F7F4', '#1F9E8E'],
    descZh: '暖炭黑与米灰表面配青绿强调，质感更厚、对比更足，适合长时间专注。',
  },
  {
    key: 'nocturne',
    name: 'Nocturne',
    nameZh: '柔和',
    badge: '呼吸',
    swatches: ['#EFEEF6', '#FCFBFE', '#6B6FE8'],
    descZh: '柔紫夜色与云白表面配大圆角留白，阅读更安静，节奏更舒缓。',
  },
  {
    key: 'amber',
    name: 'Amber',
    nameZh: '琥珀',
    badge: '暖阳',
    swatches: ['#F3ECE0', '#FCF9F3', '#E0892F'],
    descZh: '暖橙强调色，明亮亲和（含深色变体）。',
  },
]

export function VisualStyleGrid() {
  const visualStyle = useAppSettingsStore((s) => s.settings.visualStyle ?? 'graphite')
  const setVisualStyle = useAppSettingsStore((s) => s.setVisualStyle)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {STYLES.map((style) => {
        const selected = visualStyle === style.key
        return (
          <button
            key={style.key}
            onClick={() => fireAndForget(setVisualStyle(style.key), 'set visual style')}
            className={cn(
              'relative text-left rounded-xl p-3.5 border transition-all duration-200 cursor-pointer',
              'bg-surface-raised',
              selected
                ? 'border-accent ring-2 ring-accent/20'
                : 'border-border-subtle hover:border-border-default',
            )}
          >
            {selected && (
              <div
                className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: style.swatches[2] }}
              >
                <Check size={11} color="white" strokeWidth={2.5} />
              </div>
            )}

            <div className="flex items-baseline gap-1.5 mb-1.5 pr-7">
              <span className="text-sm font-sans font-semibold text-text-primary leading-tight">
                {style.name}
              </span>
              <span className="text-xs font-sans text-text-secondary leading-tight">
                {style.nameZh}
              </span>
            </div>

            <div className="mb-3">
              <span className="text-[11px] font-sans px-1.5 py-0.5 rounded bg-surface-sunken text-text-tertiary">
                {style.badge}
              </span>
            </div>

            <div className="flex gap-1.5 mb-3">
              <div
                className="h-8 rounded-md border border-black/5 flex-1"
                style={{ backgroundColor: style.swatches[0] }}
              />
              <div
                className="h-8 rounded-md border border-black/5 flex-1"
                style={{ backgroundColor: style.swatches[1] }}
              />
              <div
                className="h-8 rounded-md border border-black/5"
                style={{ backgroundColor: style.swatches[2], flex: '1.5' }}
              />
            </div>

            <p className="text-[11px] font-sans text-text-tertiary leading-relaxed line-clamp-3">
              {style.descZh}
            </p>
          </button>
        )
      })}
    </div>
  )
}
