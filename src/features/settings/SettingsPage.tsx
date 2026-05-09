import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'

export function SettingsPage() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="h-full flex flex-col bg-surface-base text-text-primary">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle flex-shrink-0">
        <Link
          to="/"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors duration-200"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Link>
        <h1 className="font-serif text-lg text-text-primary">
          {t('设置', 'Settings')}
        </h1>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 py-6 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
