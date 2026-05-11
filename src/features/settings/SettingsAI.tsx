import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { ApiProviderSection } from './ai-settings/ApiProviderSection'
import { UserProfileSection } from './ai-settings/UserProfileSection'
import { SystemPromptSection } from './ai-settings/SystemPromptSection'
import { SkillManager } from './ai-settings/SkillManager'
import { PrivacySection } from './ai-settings/PrivacySection'
import { ModelParamsSection } from './ai-settings/ModelParamsSection'

export function SettingsAI() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const setAiEnabled = useAppSettingsStore((s) => s.setAiEnabled)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-[22px] font-medium text-text-primary">
        AI
      </h1>

      {/* Enable / disable */}
      <fieldset className="flex flex-col gap-2 border-none p-0">
        <label className="text-xs text-text-tertiary font-sans">
          {t('AI 分析', 'AI Analysis')}
        </label>
        <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
          {([
            [true, t('启用', 'Enabled')],
            [false, t('禁用', 'Disabled')],
          ] as const).map(([val, label]) => (
            <button
              key={String(val)}
              onClick={() => fireAndForget(setAiEnabled(val), 'set ai enabled')}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                settings.aiEnabled === val
                  ? 'bg-surface-base text-text-primary shadow-pill'
                  : 'text-text-secondary hover:text-text-primary bg-transparent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-body-xs text-text-tertiary font-sans">
          {t('开启后可在周视图工具栏看到"本周分析"按钮', 'Enables the "Weekly Analysis" button in the week toolbar')}
        </p>
      </fieldset>

      {/* API Provider */}
      <div className="border-t border-border-subtle pt-6">
        <ApiProviderSection />
      </div>

      {/* User Profile */}
      <div className="border-t border-border-subtle pt-6">
        <UserProfileSection />
      </div>

      {/* System Prompt */}
      <div className="border-t border-border-subtle pt-6">
        <SystemPromptSection />
      </div>

      {/* Skills */}
      <div className="border-t border-border-subtle pt-6">
        <SkillManager />
      </div>

      {/* Model Parameters */}
      <div className="border-t border-border-subtle pt-6">
        <ModelParamsSection />
      </div>

      {/* Privacy & Data */}
      <div className="border-t border-border-subtle pt-6">
        <PrivacySection />
      </div>
    </div>
  )
}
