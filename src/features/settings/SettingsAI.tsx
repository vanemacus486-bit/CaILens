import { useAppSettingsStore } from '@/stores/settingsStore'

export function SettingsAI() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-[22px] font-medium text-text-primary">
        {t('AI 设置', 'AI Settings')}
      </h1>
      <p className="font-sans text-sm text-text-tertiary">
        {t('AI 功能配置', 'AI feature configuration')}
      </p>
    </div>
  )
}
