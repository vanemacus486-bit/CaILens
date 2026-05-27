import { X, Search, Settings, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { formatISODate } from '@/domain/time'
import { cn } from '@/lib/utils'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  mobileViewMode?: 'day' | 'week'
  onMobileViewModeChange?: (mode: 'day' | 'week') => void
}

export function MobileMenu({ open, onClose, mobileViewMode, onMobileViewModeChange }: MobileMenuProps) {
  const navigate = useNavigate()
    const setSettingsDrawerOpen = useUIStore((s) => s.setSettingsDrawerOpen)
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
          <MenuItem icon={Search} label={'搜索事件'} onClick={() => { useUIStore.getState().setCommandPaletteOpen(true); onClose() }} />
          <MenuItem icon={Calendar} label={'日视图'} onClick={() => { navigate(`/day?date=${formatISODate(new Date())}`); onClose() }} />
          <MenuItem icon={Settings} label={'设置'} onClick={() => { setSettingsDrawerOpen(true); onClose() }} />

          <div className="h-px bg-border-subtle my-2 mx-4" />

          {/* View mode toggle */}
          {mobileViewMode && onMobileViewModeChange && (
            <div className="px-4 py-1">
              <p className="font-sans text-xs text-text-tertiary mb-2">{'视图模式'}</p>
              <div className="flex gap-1 bg-surface-sunken rounded-md p-0.5">
                <button
                  onClick={() => onMobileViewModeChange('day')}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-medium rounded transition-colors duration-200',
                    mobileViewMode === 'day' ? 'bg-surface-base text-text-primary shadow-sm' : 'text-text-secondary',
                  )}
                >
                  {'日'}
                </button>
                <button
                  onClick={() => onMobileViewModeChange('week')}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-medium rounded transition-colors duration-200',
                    mobileViewMode === 'week' ? 'bg-surface-base text-text-primary shadow-sm' : 'text-text-secondary',
                  )}
                >
                  {'周'}
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
