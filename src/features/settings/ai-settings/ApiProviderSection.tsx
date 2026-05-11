import { useState } from 'react'
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { AiChatRepository } from '@/data/aiChatRepository'
import { PROVIDER_DEFAULTS } from '@/data/aiProviderDefaults'
import type { AiProvider } from '@/domain/aiChat'

const PROVIDER_OPTIONS: { value: AiProvider; zh: string; en: string }[] = [
  { value: 'deepseek', zh: 'DeepSeek', en: 'DeepSeek' },
  { value: 'openai', zh: 'OpenAI', en: 'OpenAI' },
  { value: 'claude', zh: 'Claude', en: 'Claude' },
  { value: 'custom', zh: '自定义', en: 'Custom' },
]

export function ApiProviderSection() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const setAiProvider = useAppSettingsStore((s) => s.setAiProvider)
  const setAiApiKey = useAppSettingsStore((s) => s.setAiApiKey)
  const setAiEndpoint = useAppSettingsStore((s) => s.setAiEndpoint)
  const setAiMaxTokens = useAppSettingsStore((s) => s.setAiMaxTokens)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const [showKey, setShowKey] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const apiKey = settings.aiApiKey ?? ''
  const provider = settings.aiProvider ?? 'deepseek'
  const endpoint = settings.aiEndpoint ?? ''
  const model = settings.aiModel ?? PROVIDER_DEFAULTS[provider]?.defaultModel ?? ''
  const maxTokens = settings.aiMaxTokens ?? 2000

  const isCustom = provider === 'custom'
  const models = PROVIDER_DEFAULTS[provider]?.models ?? []

  const hasKey = apiKey.length > 0

  const maskedKey = hasKey
    ? apiKey.slice(0, 3) + '****' + apiKey.slice(-4)
    : ''

  const displayKeyValue = showKey ? apiKey : (hasKey ? maskedKey : '')

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    const repo = new AiChatRepository()
    const result = await repo.testConnection(provider, apiKey, endpoint || undefined, model)
    setTestResult({
      ok: result.ok,
      message: result.ok ? t('连接成功', 'Connection successful') : (result.error ?? t('连接失败', 'Connection failed')),
    })
    setTesting(false)
  }

  function handleProviderChange(val: AiProvider) {
    const defaults = PROVIDER_DEFAULTS[val]
    fireAndForget(setAiProvider(val), 'set ai provider')
    if (defaults?.defaultModel) {
      fireAndForget(useAppSettingsStore.getState().setAiModel(defaults.defaultModel as any), 'set model on provider change')
    }
  }

  return (
    <fieldset className="flex flex-col gap-4 border-none p-0">
      <label className="text-xs text-text-tertiary font-sans">
        {t('API 提供商', 'API Provider')}
      </label>

      {/* Provider dropdown */}
      <div className="flex gap-1 bg-surface-sunken rounded-lg p-0.5 w-fit flex-wrap">
        {PROVIDER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleProviderChange(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
              provider === opt.value
                ? 'bg-surface-base text-text-primary shadow-pill'
                : 'text-text-secondary hover:text-text-primary bg-transparent',
            )}
          >
            {opt.value === 'deepseek' || opt.value === 'openai' || opt.value === 'claude' || opt.value === 'custom'
              ? t(opt.zh, opt.en)
              : opt.value}
          </button>
        ))}
      </div>

      {/* API Key */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-tertiary font-sans">
          {t('API Key', 'API Key')}
        </label>
        <div className="relative w-full max-w-[400px]">
          <input
            type={showKey ? 'text' : 'password'}
            placeholder={t('输入 API Key', 'Enter API Key')}
            value={displayKeyValue}
            onChange={(e) => {
              fireAndForget(setAiApiKey(e.target.value), 'set ai key')
              setTestResult(null)
            }}
            className={cn(
              'w-full h-9 px-3 pr-9 rounded-lg text-sm font-mono',
              'bg-surface-sunken border border-border-subtle',
              'text-text-primary placeholder:text-text-tertiary',
              'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              'transition-colors duration-200',
            )}
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              'w-6 h-6 flex items-center justify-center rounded',
              'text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer',
            )}
            aria-label={showKey ? t('隐藏', 'Hide') : t('显示', 'Show')}
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {hasKey && !showKey && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <CheckCircle size={12} className="text-color-text-success" />
            <span className="text-body-xs text-color-text-success font-sans">
              {t('已配置', 'Configured')}
            </span>
          </div>
        )}
      </div>

      {/* Endpoint URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-tertiary font-sans">
          {t('API 端点 URL', 'API Endpoint URL')}
          {!isCustom && (
            <span className="ml-1 text-text-tertiary">
              ({t('可选覆盖', 'optional override')})
            </span>
          )}
        </label>
        <input
          type="text"
          placeholder={isCustom ? t('输入 API 端点 URL', 'Enter API endpoint URL') : PROVIDER_DEFAULTS[provider]?.endpoint ?? ''}
          value={endpoint}
          onChange={(e) => fireAndForget(setAiEndpoint(e.target.value), 'set ai endpoint')}
          className={cn(
            'w-full max-w-[400px] h-9 px-3 rounded-lg text-sm font-mono',
            'bg-surface-sunken border border-border-subtle',
            'text-text-primary placeholder:text-text-tertiary',
            'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            'transition-colors duration-200',
          )}
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {/* Model selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-tertiary font-sans">
          {t('模型', 'Model')}
        </label>
        {isCustom ? (
          <input
            type="text"
            placeholder={t('输入模型名称', 'Enter model name')}
            value={model}
            onChange={(e) => fireAndForget(useAppSettingsStore.getState().setAiModel(e.target.value as any), 'set ai model')}
            className={cn(
              'w-full max-w-[400px] h-9 px-3 rounded-lg text-sm font-mono',
              'bg-surface-sunken border border-border-subtle',
              'text-text-primary placeholder:text-text-tertiary',
              'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              'transition-colors duration-200',
            )}
            spellCheck={false}
            autoComplete="off"
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {models.map((m) => {
              const active = model === m
              return (
                <button
                  key={m}
                  onClick={() => fireAndForget(useAppSettingsStore.getState().setAiModel(m as any), 'set ai model')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border',
                    active
                      ? 'border-border-default bg-surface-sunken text-text-primary'
                      : 'border-border-subtle bg-surface-base text-text-secondary hover:bg-surface-sunken hover:text-text-primary',
                  )}
                >
                  {m}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={!hasKey || testing}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
            hasKey && !testing
              ? 'bg-surface-sunken text-text-primary hover:bg-surface-raised'
              : 'bg-surface-sunken text-text-tertiary cursor-not-allowed',
          )}
        >
          {testing ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin" />
              {t('测试中...', 'Testing...')}
            </span>
          ) : (
            t('测试连接', 'Test Connection')
          )}
        </button>
        {testResult && (
          <div className={cn(
            'flex items-center gap-1.5 text-sm font-sans',
            testResult.ok ? 'text-color-text-success' : 'text-color-text-danger',
          )}>
            {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Token limit */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-tertiary font-sans">
          {t('Token 限制', 'Token Limit')}
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
    </fieldset>
  )
}
