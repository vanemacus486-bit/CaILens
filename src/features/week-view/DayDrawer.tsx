/**
 * # DayDrawer — 右侧"这一天发生了什么"通用面板
 *
 * 每个点亮的板块是一张独立卡片（自带 图标+标题+✕ 的标题栏、各自内部滚动），
 * 卡片间留缝；点亮数量决定布局——1 个独占、2 个上下、3 个宽屏双列 / 窄屏单列。
 * 卡片区是单一 flex 结构：方向随宽窄切换，flow 组和 AI 坞是固定 keyed 子节点，
 * 开关切换只增删兄弟节点——AI 对话等板块本地状态不会因布局变化被重挂载清空。
 * 开关按钮在抽屉右上角，打开默认只亮当日概览。
 *
 * key 监听 selectedDateMs，天变化时强制重挂载（各板块本地状态、AI 消息等全部重置）。
 */

import { useCallback, useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { DrawerModeSwitcher, MODES, MODE_LABEL_KEYS, type DrawerMode } from './drawer/DrawerModeSwitcher'
import { DrawerWeatherContent } from './drawer/DrawerWeatherContent'
import { DrawerDayTimeline } from './drawer/DrawerDayTimeline'
import { DrawerHistoryArchive } from './drawer/DrawerHistoryArchive'
import { DrawerAIChat } from './drawer/DrawerAIChat'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useT } from '@/i18n/useT'

interface DayDrawerProps {
  /** 选中日期的 UTC 毫秒时间戳 */
  selectedDateMs: number
  onClose: () => void
}

// ── PanelCard ──────────────────────────────────────────

function PanelCard({
  mode,
  onClosePanel,
  children,
}: {
  mode: DrawerMode
  onClosePanel: () => void
  children: React.ReactNode
}) {
  const t = useT()
  const item = MODES.find((m) => m.mode === mode)
  const Icon = item?.icon
  return (
    <div
      data-testid={`panel-${mode}`}
      className="h-full bg-surface-raised border border-border-subtle rounded-2xl shadow-lg overflow-hidden flex flex-col min-h-0"
    >
      {/* 标题栏：icon + 标题 + ✕ */}
      <div className="flex items-center gap-1.5 px-4 py-2 flex-shrink-0">
        {Icon && <Icon size={12} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />}
        <span className="text-[11px] font-sans font-medium text-text-tertiary tracking-wide truncate flex-1">
          {t(MODE_LABEL_KEYS[mode])}
        </span>
        <button
          onClick={onClosePanel}
          className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none flex-shrink-0"
          aria-label={`${t('dayDrawer.closePanel')} - ${t(MODE_LABEL_KEYS[mode])}`}
        >
          <X size={12} strokeWidth={1.75} />
        </button>
      </div>
      {/* 内容体：AI 自己管滚动，其他板块 overflow-y-auto */}
      <div className={mode === 'ai' ? 'flex-1 min-h-0' : 'flex-1 min-h-0 overflow-y-auto'}>
        {children}
      </div>
    </div>
  )
}

// ── DayDrawer ──────────────────────────────────────────

export function DayDrawer({ selectedDateMs, onClose }: DayDrawerProps) {
  const [activeModes, setActiveModes] = useState<DrawerMode[]>(['weather-archive'])
  const language = useAppSettingsStore((s) => s.settings.language)
  const wide = useMediaQuery('(min-width: 1500px)')

  const selectedDate = useMemo(() => new Date(selectedDateMs), [selectedDateMs])

  const dateLabel = useMemo(() => {
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
    const weekdayEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const month = selectedDate.getMonth() + 1
    const day = selectedDate.getDate()
    const dow =
      language === 'zh'
        ? `周${weekdayNames[selectedDate.getDay()]}`
        : weekdayEn[selectedDate.getDay()]
    return language === 'zh' ? `${month}月${day}日 ${dow}` : `${month}/${day} ${dow}`
  }, [selectedDate, language])

  // ── 板块开关：点亮/熄灭。点亮时固定顺序排列；熄灭最后一个 → 关抽屉 ──
  const handleToggleMode = useCallback(
    (mode: DrawerMode) => {
      const isCurrentlyActive = activeModes.includes(mode)
      if (isCurrentlyActive && activeModes.length === 1) {
        onClose()
        return
      }
      setActiveModes((prev) => {
        if (prev.includes(mode)) {
          return prev.filter((m) => m !== mode)
        }
        const next = new Set(prev)
        next.add(mode)
        return MODES.map((item) => item.mode).filter((m) => next.has(m))
      })
    },
    [activeModes, onClose],
  )

  const n = activeModes.length
  const flowModes = activeModes.filter((m) => m !== 'ai')
  const aiActive = activeModes.includes('ai')

  // 区域宽度由布局决定
  const isWideThree = n === 3 && wide
  const containerWidth = isWideThree ? 'w-[612px]' : 'w-[320px]'

  return (
    <div
      className={`relative flex-shrink-0 my-3 mr-3 animate-slide-in-from-right transition-[width] duration-300 ${containerWidth}`}
    >
      <div className="h-full flex flex-col">
        {/* ── 顶栏：日期标签 + 开关按钮 + 全局 ✕ ── */}
        <div className="flex items-center justify-between px-1 pb-3 flex-shrink-0">
          <span className="text-sm font-sans font-medium text-text-primary tracking-tight">
            {dateLabel}
          </span>
          <DrawerModeSwitcher activeModes={activeModes} onToggleMode={handleToggleMode} />
        </div>

        {/* ── 卡片区：单一结构，方向随宽窄切换；flow 组 / AI 坞是固定 keyed 子节点，开关切换不重挂载 ── */}
        <div className={`flex-1 min-h-0 flex gap-3 ${isWideThree ? 'flex-row' : 'flex-col'}`}>
          {flowModes.length > 0 && (
            <div
              key="flow-group"
              className={`flex flex-col gap-3 min-h-0 min-w-0 ${
                !isWideThree && flowModes.length === 2 ? 'flex-[2]' : 'flex-1'
              }`}
            >
              {flowModes.map((m) => (
                <div key={`panel-${m}-${selectedDateMs}`} className="flex-1 min-h-0">
                  <PanelCard mode={m} onClosePanel={() => handleToggleMode(m)}>
                    <RenderPanelContent mode={m} selectedDateMs={selectedDateMs} />
                  </PanelCard>
                </div>
              ))}
            </div>
          )}

          {aiActive && (
            <div key={`panel-ai-${selectedDateMs}`} className="flex-1 min-h-0 min-w-0">
              <PanelCard mode="ai" onClosePanel={() => handleToggleMode('ai')}>
                <RenderPanelContent mode="ai" selectedDateMs={selectedDateMs} />
              </PanelCard>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .animate-slide-in-from-right {
          animation: slideInFromRight 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
      `}</style>
    </div>
  )
}

// ── RenderPanelContent ─────────────────────────────────

function RenderPanelContent({ mode, selectedDateMs }: { mode: DrawerMode; selectedDateMs: number }) {
  if (mode === 'weather-archive') {
    return (
      <>
        <DrawerWeatherContent selectedDateMs={selectedDateMs} />
        <div className="border-t border-border-subtle mx-5 my-2" />
        <DrawerHistoryArchive selectedDateMs={selectedDateMs} />
      </>
    )
  }
  if (mode === 'timeline') {
    return <DrawerDayTimeline selectedDateMs={selectedDateMs} />
  }
  if (mode === 'ai') {
    return <DrawerAIChat selectedDateMs={selectedDateMs} />
  }
  return null
}
