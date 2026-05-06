import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppSettingsStore } from '@/stores/settingsStore'

interface QuickLogTriggerProps {
  onClick: () => void
}

export function QuickLogTrigger({ onClick }: QuickLogTriggerProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const label = language === 'zh' ? '快速记录 (n)' : 'Quick log (n)'

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-md transition-colors duration-200',
        'text-text-secondary hover:text-text-primary hover:bg-surface-sunken cursor-pointer',
      )}
    >
      <Plus size={14} strokeWidth={1.75} />
    </button>
  )
}
