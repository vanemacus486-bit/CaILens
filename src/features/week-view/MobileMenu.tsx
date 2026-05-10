import { X, Search, BarChart3, Settings, Calendar, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { useUIStore } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import { formatISODate } from '@/domain/time'
import { cn } from '@/lib/utils'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  weekStart: Date
  mobileViewMode?: 'day' | 'week'
  onMobileViewModeChange?: (mode: 'day' | 'week') => void
}

export function MobileMenu({ open, onClose, weekStart, mobileViewMode, onMobileViewModeChange }: MobileMenuProps) {
  const navigate = useNavigate()
  const language = useAppSettingsStore((s) => s.settings.language)
  const aiEnabled = useAppSettingsStore((s) => s.settings.aiEnabled)
  const aiApiKey = useAppSettingsStore((s) => s.settings.aiApiKey)
  const startConversation = useAiChatStore((s) => s.startConversation)
  const setSettingsDrawerOpen = useUIStore((s) => s.setSettingsDrawerOpen)
  const setAiChatDrawerOpen = useUIStore((s) => s.setAiChatDrawerOpen)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const handleAIAnalysis = () => {
    if (aiEnabled && aiApiKey) {
      const weekNum = getISOWeek(weekStart)
      const label = t(`第 ${weekNum} 周`, `Week ${weekNum}`)
      startConversation(weekStart.getTime(), label)
      setAiChatDrawerOpen(true)
    }
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Slide-in menu */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full z-50 w-[min(75vw,300px)] bg-surface-base border-r border-border-subtle shadow-lg',
          'flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border-subtle">
          <span className="font-serif text-[20px] font-semibold text-text-primary tracking-[-0.01em]">
            CaILens
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto py-2">
          <MenuItem icon={Search} label={t('搜索事件', 'Search events')} onClick={() => { useUIStore.getState().setCommandPaletteOpen(true); onClose() }} />
          <MenuItem icon={BarChart3} label={t('统计', 'Stats')} onClick={() => { navigate('/stats'); onClose() }} />
          <MenuItem icon={Calendar} label={t('日视图', 'Day View')} onClick={() => { navigate(`/day?date=${formatISODate(new Date())}`); onClose() }} />

          {(aiEnabled && aiApiKey) && (
            <MenuItem icon={Sparkles} label={t('AI 分析', 'AI Analysis')} onClick={handleAIAnalysis} />
          )}

          <MenuItem icon={Settings} label={t('设置', 'Settings')} onClick={() => { setSettingsDrawerOpen(true); onClose() }} />

          <div className="h-px bg-border-subtle my-2 mx-4" />

          {/* View mode toggle */}
          {mobileViewMode && onMobileViewModeChange && (
            <div className="px-4 py-1">
              <p className="font-sans text-xs text-text-tertiary mb-2">{t('视图模式', 'View Mode')}</p>
              <div className="flex gap-1 bg-surface-sunken rounded-md p-0.5">
                <button
                  onClick={() => onMobileViewModeChange('day')}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-medium rounded transition-colors duration-200',
                    mobileViewMode === 'day' ? 'bg-surface-base text-text-primary shadow-sm' : 'text-text-secondary',
                  )}
                >
                  {t('日', 'Day')}
                </button>
                <button
                  onClick={() => onMobileViewModeChange('week')}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-medium rounded transition-colors duration-200',
                    mobileViewMode === 'week' ? 'bg-surface-base text-text-primary shadow-sm' : 'text-text-secondary',
                  )}
                >
                  {t('周', 'Week')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function MenuItem({ icon: Icon, label, onClick }: { icon: React.FC<{ size?: number; strokeWidth?: number }>; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 text-left"
    >
      <Icon size={18} strokeWidth={1.75} />
      <span className="font-sans text-sm">{label}</span>
    </button>
  )
}
