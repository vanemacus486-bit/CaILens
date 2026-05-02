import { useAppSettingsStore } from '@/stores/settingsStore'

export function WeekEmptyState() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <p className="font-serif text-[15px] text-text-tertiary italic leading-relaxed">
        {t('从这里开始，看见时间。', 'Start here. See your time.')}
      </p>
      <p className="font-sans text-[13px] text-text-tertiary/60">
        {t('点击空白处开始第一次记录', 'Click any empty slot to begin')}
      </p>
    </div>
  )
}
