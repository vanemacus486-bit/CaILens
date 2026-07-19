/**
 * # SettingsAI — 设置：模型
 *
 * 管理模型使用偏好、系统提示词与供应商接入。
 */

import { useCallback, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Plus,
  Settings2,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { AiProvider, AiProviderConfig, AiSettings } from '@/domain/settings'
import { DEFAULT_AI_SYSTEM_PROMPT_EN, DEFAULT_AI_SYSTEM_PROMPT_ZH } from '@/domain/aiChat'
import { testAiConnection, fetchAvailableModels, type ConnectionTestResult } from '@/data/aiChatService'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'

type ModelSettingsTab = 'usage' | 'providers'

const PROVIDER_OPTIONS: { value: AiProvider; labelZh: string; labelEn: string; defaultModel: string }[] = [
  { value: 'openai', labelZh: 'OpenAI', labelEn: 'OpenAI', defaultModel: 'gpt-4o' },
  { value: 'anthropic', labelZh: 'Anthropic', labelEn: 'Anthropic', defaultModel: 'claude-sonnet-4-20250514' },
  { value: 'google', labelZh: 'Google Gemini', labelEn: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
  { value: 'custom', labelZh: '自定义', labelEn: 'Custom', defaultModel: '' },
]

const PROVIDER_DEFAULTS: Record<AiProvider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com',
  custom: '',
}

const QUICK_ADD_PRESETS: { provider: AiProvider; label: string; baseUrl: string; model: string }[] = [
  { provider: 'custom', label: 'Agnes 官方', baseUrl: 'https://apihub.agnes-ai.com/v1', model: '' },
  { provider: 'openai', label: 'OpenAI 官方', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { provider: 'anthropic', label: 'Anthropic Claude', baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
  { provider: 'google', label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com', model: 'gemini-2.0-flash' },
]

function providerName(provider: AiProvider, language: string) {
  const option = PROVIDER_OPTIONS.find((item) => item.value === provider)
  return option ? (language === 'zh' ? option.labelZh : option.labelEn) : provider
}

function enabledModelNames(provider: AiProviderConfig): string[] {
  return (provider.model ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors duration-200',
        checked ? 'bg-accent' : 'bg-border-default',
      )}
    >
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </label>
  )
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pr-8 pl-3 py-2 text-xs font-sans text-text-primary bg-surface-base border border-border-subtle rounded-lg placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150 font-mono"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent"
        tabIndex={-1}
      >
        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  )
}

function ConnectionTest({ config, language }: { config: AiProviderConfig; language: string }) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<ConnectionTestResult | null>(null)
  const tl = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const handleTest = useCallback(async () => {
    if (!config.apiKey.trim()) {
      setResult({ ok: false, message: tl('请先填写 API Key', 'Please enter an API key first') })
      return
    }
    setTesting(true)
    setResult(null)
    const r = await testAiConnection(config)
    setResult(r)
    setTesting(false)
  }, [config, tl])

  return (
    <div>
      <button
        onClick={handleTest}
        disabled={testing}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-sans transition-colors duration-150',
          testing
            ? 'bg-surface-base text-text-tertiary cursor-wait'
            : 'bg-surface-base text-text-secondary hover:text-text-primary hover:bg-surface-sunken cursor-pointer',
        )}
      >
        {testing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
        {testing ? tl('测试中...', 'Testing...') : tl('测试连接', 'Test')}
      </button>
      {result && (
        <div
          className={cn(
            'mt-2 flex items-start gap-1.5 text-xs font-sans rounded-lg px-3 py-2',
            result.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
          )}
        >
          {result.ok ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : <XCircle size={12} className="mt-0.5 shrink-0" />}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  )
}

function ModelPicker({
  config,
  onPick,
  language,
}: {
  config: AiProviderConfig
  onPick: (model: string) => void
  language: string
}) {
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const tl = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const handleFetch = useCallback(async () => {
    if (!config.apiKey.trim()) {
      setError(tl('请先填写 API Key', 'Please enter an API key first'))
      setModels(null)
      return
    }
    setLoading(true)
    setError(null)
    const r = await fetchAvailableModels(config)
    if (r.ok) {
      setModels(r.models)
      setError(r.models.length === 0 ? tl('该端点未返回模型列表，请手动填写模型名', 'Endpoint returned no models; enter the model manually') : null)
    } else {
      setModels(null)
      setError(r.message ?? tl('刷新失败', 'Failed to refresh'))
    }
    setLoading(false)
  }, [config, tl])

  return (
    <div>
      <button
        onClick={handleFetch}
        disabled={loading}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-sans transition-colors duration-150',
          loading
            ? 'bg-surface-base text-text-tertiary cursor-wait'
            : 'bg-surface-base text-text-secondary hover:text-text-primary hover:bg-surface-sunken cursor-pointer',
        )}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        {loading ? tl('刷新中...', 'Refreshing...') : tl('刷新模型', 'Refresh models')}
      </button>

      {models && models.length > 0 && (
        <select
          value={config.model ?? ''}
          onChange={(e) => onPick(e.target.value)}
          className="mt-2 w-full text-xs font-sans text-text-primary bg-surface-base border border-border-subtle rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150 cursor-pointer font-mono"
        >
          <option value="">{tl('选择模型...', 'Select a model...')}</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      )}

      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-xs font-sans rounded-lg px-3 py-2 bg-danger/10 text-danger">
          <XCircle size={12} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

function QuickAddPreset({ onAdd, language }: { onAdd: (config: AiProviderConfig) => void; language: string }) {
  const [open, setOpen] = useState(false)
  const tl = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-base px-3 py-1.5 text-xs font-sans text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer"
      >
        <Zap size={13} />
        {tl('快速添加', 'Quick add')}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[220px] rounded-lg border border-border-subtle bg-surface-raised p-1.5 shadow-lg">
            {QUICK_ADD_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  onAdd({
                    provider: preset.provider,
                    label: preset.label,
                    apiKey: '',
                    baseUrl: preset.baseUrl || undefined,
                    model: preset.model || undefined,
                  })
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-xs font-sans text-text-primary hover:bg-surface-sunken rounded-md transition-colors cursor-pointer border-none bg-transparent"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function SettingsAI() {
  const settings = useAppSettingsStore((s) => s.settings)
  const setAiSettings = useAppSettingsStore((s) => s.setAiSettings)
  const language = settings.language
  const tl = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const [activeTab, setActiveTab] = useState<ModelSettingsTab>('usage')

  const ai = useMemo<AiSettings>(() => settings.ai ?? { enabled: false, providers: [] }, [settings.ai])
  const availableProviders = useMemo(() => ai.providers.filter((provider) => provider.apiKey.trim().length > 0), [ai.providers])
  const defaultSystemPrompt = language === 'zh' ? DEFAULT_AI_SYSTEM_PROMPT_ZH : DEFAULT_AI_SYSTEM_PROMPT_EN
  const systemPrompt = ai.systemPrompt ?? ''

  const updateAi = useCallback(
    (next: AiSettings) => {
      fireAndForget(setAiSettings(next), 'save model settings')
    },
    [setAiSettings],
  )

  const setEnabled = useCallback((enabled: boolean) => updateAi({ ...ai, enabled }), [ai, updateAi])
  const setSystemPrompt = useCallback((prompt: string) => updateAi({ ...ai, systemPrompt: prompt || undefined }), [ai, updateAi])

  const addProvider = useCallback(() => {
    updateAi({
      ...ai,
      providers: [
        ...ai.providers,
        {
          provider: 'openai',
          label: '',
          apiKey: '',
          baseUrl: PROVIDER_DEFAULTS.openai,
          model: 'gpt-4o',
        },
      ],
    })
  }, [ai, updateAi])

  const addProviderFromPreset = useCallback(
    (preset: AiProviderConfig) => updateAi({ ...ai, enabled: true, providers: [...ai.providers, preset] }),
    [ai, updateAi],
  )

  const updateProvider = useCallback(
    (index: number, patch: Partial<AiProviderConfig>) => {
      updateAi({ ...ai, providers: ai.providers.map((provider, i) => (i === index ? { ...provider, ...patch } : provider)) })
    },
    [ai, updateAi],
  )

  const removeProvider = useCallback(
    (index: number) => updateAi({ ...ai, providers: ai.providers.filter((_, i) => i !== index) }),
    [ai, updateAi],
  )

  const handleProviderChange = useCallback(
    (index: number, newProvider: AiProvider) => {
      const current = ai.providers[index]
      const option = PROVIDER_OPTIONS.find((item) => item.value === newProvider)
      updateProvider(index, {
        provider: newProvider,
        baseUrl: PROVIDER_DEFAULTS[newProvider] || current.baseUrl,
        model: option?.defaultModel || current.model,
      })
    },
    [ai.providers, updateProvider],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-text-primary tracking-tight">
          {tl('模型', 'Models')}
        </h1>
        <p className="text-sm text-text-tertiary mt-2 font-sans">
          {tl('默认模型、规划模型、运行上限与接入概览。', 'Default models, planning models, runtime limits, and provider overview.')}
        </p>
      </div>

      <div className="h-px bg-border-subtle" />

      <div className="inline-flex w-fit rounded-lg border border-border-subtle bg-surface-base p-1">
        {([
          ['usage', tl('使用', 'Usage')],
          ['providers', tl('接入', 'Providers')],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-sans transition-all duration-200 cursor-pointer border-none',
              activeTab === tab
                ? 'bg-surface-raised text-accent shadow-pill'
                : 'bg-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'usage' ? (
        <div className="rounded-lg border border-border-subtle bg-surface-raised overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-sans font-semibold text-text-primary">
                {tl('使用', 'Usage')}
              </h2>
              <p className="text-xs text-text-tertiary mt-1 font-sans">
                {tl('这里的系统提示词会注入日程抽屉里的 AI 对话。', 'This system prompt is used by the AI chat in the day drawer.')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-sans text-text-tertiary">
                {tl('启用模型功能', 'Enable models')}
              </span>
              <Toggle id="model-enabled-toggle" checked={ai.enabled} onChange={setEnabled} />
            </div>
          </div>

          <div className="p-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label htmlFor="model-system-prompt" className="text-sm font-sans font-medium text-text-primary">
                  {tl('系统提示词', 'System prompt')}
                </label>
                <button
                  onClick={() => setSystemPrompt('')}
                  className="text-xs font-sans text-text-tertiary hover:text-text-primary transition-colors cursor-pointer border-none bg-transparent"
                >
                  {tl('恢复默认', 'Reset')}
                </button>
              </div>
              <textarea
                id="model-system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={defaultSystemPrompt}
                className="min-h-[260px] w-full resize-y rounded-lg border border-border-subtle bg-surface-base px-3 py-3 text-sm font-sans leading-relaxed text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150"
              />
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-base p-4">
              <h3 className="text-sm font-sans font-medium text-text-primary">
                {tl('当前概览', 'Overview')}
              </h3>
              <dl className="mt-4 space-y-3 text-xs font-sans">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-tertiary">{tl('状态', 'Status')}</dt>
                  <dd className={cn('font-medium', ai.enabled ? 'text-success' : 'text-text-tertiary')}>
                    {ai.enabled ? tl('已启用', 'Enabled') : tl('已关闭', 'Disabled')}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-tertiary">{tl('可用接入', 'Ready providers')}</dt>
                  <dd className="text-text-primary font-medium">{availableProviders.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-tertiary">{tl('提示词', 'Prompt')}</dt>
                  <dd className="text-text-primary font-medium">{systemPrompt.trim() ? tl('自定义', 'Custom') : tl('默认', 'Default')}</dd>
                </div>
              </dl>
              <div className="mt-5 flex items-start gap-2 rounded-lg bg-surface-sunken px-3 py-3">
                <Info size={13} className="mt-0.5 shrink-0 text-text-tertiary" />
                <p className="text-[11px] leading-relaxed font-sans text-text-tertiary">
                  {tl('系统提示词只保存在本地设置里。日程、待办等上下文仍会在对话时追加到提示词后。', 'The system prompt is stored locally. Schedule and task context is still appended when you chat.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border-subtle bg-surface-raised overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-sans font-semibold text-text-primary">
                {tl('供应商接入', 'Provider Access')}
              </h2>
              <p className="text-xs text-text-tertiary mt-1 font-sans">
                {tl('添加官方或自定义供应商后，才会出现在这里。会话模型列表只显示已保存的启用模型。', 'Add official or custom providers here. Chat model lists only show saved enabled models.')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <QuickAddPreset onAdd={addProviderFromPreset} language={language} />
              <button
                onClick={addProvider}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-base px-3 py-1.5 text-xs font-sans text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer"
              >
                <Plus size={13} />
                {tl('添加模型服务', 'Add service')}
              </button>
            </div>
          </div>

          {ai.providers.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-text-tertiary font-sans">
                {tl('尚未添加任何模型服务。', 'No model services configured yet.')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-5">
              {ai.providers.map((provider, index) => {
                const models = enabledModelNames(provider)
                return (
                  <div key={index} className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={provider.label}
                            onChange={(e) => updateProvider(index, { label: e.target.value })}
                            placeholder={tl('例如：DeepSeek 官方', 'e.g. DeepSeek official')}
                            className="min-w-[180px] max-w-[260px] rounded-lg border border-transparent bg-transparent px-0 py-1 text-lg font-sans font-semibold text-text-primary placeholder-text-tertiary focus:border-border-subtle focus:bg-surface-raised focus:px-2 focus:outline-none"
                          />
                          <span className="rounded-full border border-border-subtle px-2 py-0.5 text-[11px] font-sans text-text-secondary">
                            {provider.provider === 'custom' ? tl('自定义', 'Custom') : tl('官方', 'Official')}
                          </span>
                          {provider.apiKey.trim() && (
                            <span className="rounded-full border border-success/40 px-2 py-0.5 text-[11px] font-sans text-success">
                              {tl('已设密钥', 'Key set')}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-sans text-text-secondary">
                          {provider.baseUrl || PROVIDER_DEFAULTS[provider.provider] || tl('未设置端点', 'No endpoint')}
                        </p>
                        <p className="mt-3 text-xs font-mono text-text-tertiary break-all">
                          {provider.provider} · {provider.baseUrl || PROVIDER_DEFAULTS[provider.provider] || 'custom'} · {provider.apiKey.trim() ? 'API_KEY' : 'NO_KEY'}
                        </p>
                        <div className="mt-4">
                          <p className="text-xs font-sans font-medium text-text-tertiary mb-2">
                            {tl('已启用模型', 'Enabled models')}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {models.length > 0 ? (
                              models.map((model) => (
                                <span key={model} className="rounded-full bg-surface-sunken px-3 py-1.5 text-xs font-mono font-medium text-text-primary">
                                  {model}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs font-sans text-text-tertiary">
                                {tl('暂未填写模型名', 'No model set')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <ModelPicker config={provider} onPick={(model) => updateProvider(index, { model })} language={language} />
                        <ConnectionTest config={provider} language={language} />
                        <button
                          onClick={() => removeProvider(index)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-base px-3 py-1.5 text-xs font-sans text-text-secondary hover:text-danger hover:bg-surface-sunken transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                          {tl('移除接入', 'Remove')}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="block text-xs font-sans font-medium text-text-secondary mb-1">
                          {tl('供应商', 'Provider')}
                        </label>
                        <select
                          value={provider.provider}
                          onChange={(e) => handleProviderChange(index, e.target.value as AiProvider)}
                          className="w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-xs font-sans text-text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default"
                        >
                          {PROVIDER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {providerName(option.value, language)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-sans font-medium text-text-secondary mb-1">API Key</label>
                        <PasswordInput
                          value={provider.apiKey}
                          onChange={(apiKey) => updateProvider(index, { apiKey })}
                          placeholder="sk-..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-sans font-medium text-text-secondary mb-1">
                          {tl('基础 URL', 'Base URL')}
                        </label>
                        <input
                          type="text"
                          value={provider.baseUrl ?? ''}
                          onChange={(e) => updateProvider(index, { baseUrl: e.target.value || undefined })}
                          placeholder={provider.provider === 'custom' ? 'https://...' : tl('使用默认', 'Use default')}
                          className="w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-xs font-mono text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-sans font-medium text-text-secondary mb-1">
                          {tl('模型', 'Model')}
                        </label>
                        <input
                          type="text"
                          value={provider.model ?? ''}
                          onChange={(e) => updateProvider(index, { model: e.target.value || undefined })}
                          placeholder="gpt-4o"
                          className="w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-xs font-mono text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="px-5 py-3 border-t border-border-subtle flex items-start gap-2">
            <Settings2 size={13} className="text-text-tertiary mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-text-tertiary font-sans leading-relaxed">
              {tl('API 密钥仅保存在本地数据库中，不会上传至 CaILens 服务器。多个模型名可以用英文逗号分隔展示，但对话会使用第一个有效模型名。', 'API keys are stored only in your local database. Multiple model names can be comma-separated for display; chat uses the first valid model name.')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
