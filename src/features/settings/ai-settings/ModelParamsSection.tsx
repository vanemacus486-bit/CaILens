import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'

export function ModelParamsSection() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const setAiTemperature = useAppSettingsStore((s) => s.setAiTemperature)
  const setAiMaxTokens = useAppSettingsStore((s) => s.setAiMaxTokens)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const [expanded, setExpanded] = useState(false)

  const temperature = settings.aiTemperature ?? 0.7
  const maxTokens = settings.aiMaxTokens ?? 2000

  const handleTempChange = useCallback(
    (val: number) => {
      fireAndForget(setAiTemperature(val), 'set ai temperature')
    },
    [setAiTemperature],
  )

  return (
    <fieldset className="flex flex-col gap-3 border-none p-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex items-center gap-2 text-left w-full bg-transparent border-none cursor-pointer',
          'text-sm font-sans font-medium text-text-primary transition-colors duration-200',
        )}
      >
        {expanded ? <ChevronDown size={16} className="text-text-tertiary" /> : <ChevronRight size={16} className="text-text-tertiary" />}
        {t('高级：模型参数', 'Advanced: Model Parameters')}
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 pl-1">
          {/* Temperature */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-text-tertiary font-sans">
                {t('温度', 'Temperature')}
              </label>
              <span className="text-xs font-mono text-text-secondary tabular-nums">
                {temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => handleTempChange(Number(e.target.value))}
              className={cn(
                'w-full max-w-[300px] h-1.5 rounded-full appearance-none cursor-pointer',
                'bg-surface-sunken accent-accent',
                '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface-base [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer',
              )}
            />
            <div className="flex justify-between max-w-[300px]">
              <span className="text-[10px] text-text-tertiary font-sans">{t('精确', 'Precise')} (0)</span>
              <span className="text-[10px] text-text-tertiary font-sans">{t('默认', 'Default')} (0.7)</span>
              <span className="text-[10px] text-text-tertiary font-sans">{t('创意', 'Creative')} (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-tertiary font-sans">
              {t('最大 Token 数', 'Max Tokens')}
            </label>
            <input
              type="number"
              min={1}
              max={128000}
              value={maxTokens}
              onChange={(e) => fireAndForget(setAiMaxTokens(Number(e.target.value)), 'set ai max tokens')}
              className={cn(
                'w-full max-w-[200px] h-9 px-3 rounded-lg text-sm font-mono',
                'bg-surface-sunken border border-border-subtle',
                'text-text-primary placeholder:text-text-tertiary',
                'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                'transition-colors duration-200',
              )}
            />
          </div>
        </div>
      )}
    </fieldset>
  )
}
