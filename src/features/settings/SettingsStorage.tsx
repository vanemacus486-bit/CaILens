import { useAppSettingsStore } from '@/stores/settingsStore'
import { StorageFolderSelector } from './StorageFolderSelector'

export function SettingsStorage() {
  const language = useAppSettingsStore((s) => s.settings.language)
    const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-[22px] font-medium text-text-primary">
        {'存储'}
      </h1>
      <StorageFolderSelector language={language} />
    </div>
  )
}
