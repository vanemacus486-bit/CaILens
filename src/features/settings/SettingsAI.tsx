/**
 * # SettingsAI — 设置：AI 提供商配置
 *
 * 允许用户启用/禁用 AI 功能，并管理多个 AI 提供商（OpenAI / Anthropic / Google / 自定义）的
 * API Key、端点 Base URL 和模型名。
 * 支持「测试连接」按钮验证配置是否可用，以及「快速添加」预设。
 */

import { useCallback, useMemo } from 'react'
import { Plus, Trash2, Eye, EyeOff, Info, Loader2, CheckCircle2, XCircle, Zap, Download } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { AiProvider, AiProviderConfig, AiSettings } from '@/domain/settings'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { testAiConnection, fetchAvailableModels, type ConnectionTestResult } from '@/data/aiChatService'
import { useState } from 'react'

/* ── 常量 ── */

const PROVIDER_OPTIONS: { value: AiProvider; labelZh: string; labelEn: string; defaultModel: string }[] = [
  { value: 'openai',    labelZh: 'OpenAI',      labelEn: 'OpenAI',      defaultModel: 'gpt-4o' },
  { value: 'anthropic', labelZh: 'Anthropic',   labelEn: 'Anthropic',   defaultModel: 'claude-sonnet-4-20250514' },
  { value: 'google',    labelZh: 'Google Gemini', labelEn: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
  { value: 'custom',    labelZh: '自定义',       labelEn: 'Custom',      defaultModel: '' },
]

const PROVIDER_DEFAULTS: Record<AiProvider, string> = {
  openai:    'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google:    'https://generativelanguage.googleapis.com',
  custom:    '',
}

const QUICK_ADD_PRESETS: { provider: AiProvider; label: string; baseUrl: string; model: string }[] = [
  { provider: 'custom', label: 'Agnes（OpenAI 兼容）', baseUrl: 'https://apihub.agnes-ai.com/v1',  model: '' },
  { provider: 'openai',    label: 'OpenAI',                   baseUrl: 'https://api.openai.com/v1',    model: 'gpt-4o' },
  { provider: 'anthropic', label: 'Anthropic Claude',         baseUrl: 'https://api.anthropic.com',    model: 'claude-sonnet-4-20250514' },
  { provider: 'google',    label: 'Google Gemini',            baseUrl: 'https://generativelanguage.googleapis.com', model: 'gemini-2.0-flash' },
]

/* ── Toggle Switch 组件 ── */

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors duration-200',
        checked ? 'bg-accent' : 'bg-border-default',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </label>
  )
}

/* ── 密码显隐输入 ── */

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
        className="w-full pr-8 pl-3 py-1.5 text-xs font-sans text-text-primary bg-surface-base border border-border-subtle rounded-lg placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150 font-mono"
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

/* ── 测试连接按钮 ── */

function ConnectionTest({
  config,
  language,
}: {
  config: AiProviderConfig
  language: string
}) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<ConnectionTestResult | null>(null)
  const tl = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const handleTest = useCallback(async () => {
    if (!config.apiKey.trim()) {
      setResult({ ok: false, message: tl('请先填写 API Key', 'Please enter an API Key first') })
      return
    }
    setTesting(true)
    setResult(null)
    const r = await testAiConnection(config)
    setResult(r)
    setTesting(false)
  }, [config, tl])

  return (
    <div className="mt-3">
      <button
        onClick={handleTest}
        disabled={testing}
        className={cn(
          'flex items-center gap-1.5 text-xs font-sans transition-colors duration-150 cursor-pointer border-none rounded-lg px-3 py-1.5',
          testing
            ? 'bg-surface-base text-text-tertiary cursor-wait'
            : 'bg-surface-base text-text-secondary hover:text-text-primary hover:bg-surface-sunken',
        )}
      >
        {testing ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Zap size={12} />
        )}
        {testing ? tl('测试中…', 'Testing…') : tl('测试连接', 'Test Connection')}
      </button>

      {result && (
        <div
          className={cn(
            'mt-2 flex items-start gap-1.5 text-xs font-sans rounded-lg px-3 py-2',
            result.ok
              ? 'bg-success/10 text-success'
              : 'bg-danger/10 text-danger',
          )}
        >
          {result.ok ? (
            <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={12} className="mt-0.5 shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  )
}

/* ── 模型拉取下拉 ── */

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
      setError(tl('请先填写 API Key', 'Please enter an API Key first'))
      setModels(null)
      return
    }
    setLoading(true)
    setError(null)
    const r = await fetchAvailableModels(config)
    if (r.ok) {
      setModels(r.models)
      setError(
        r.models.length === 0
          ? tl('该端点未返回模型列表，请手动填写模型名', 'Endpoint returned no models; enter the model name manually')
          : null,
      )
    } else {
      setModels(null)
      setError(r.message ?? tl('拉取失败', 'Failed to fetch models'))
    }
    setLoading(false)
  }, [config, tl])

  return (
    <div className="mt-3">
      <button
        onClick={handleFetch}
        disabled={loading}
        className={cn(
          'flex items-center gap-1.5 text-xs font-sans transition-colors duration-150 cursor-pointer border-none rounded-lg px-3 py-1.5',
          loading
            ? 'bg-surface-base text-text-tertiary cursor-wait'
            : 'bg-surface-base text-text-secondary hover:text-text-primary hover:bg-surface-sunken',
        )}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        {loading ? tl('拉取中…', 'Fetching…') : tl('从端点拉取模型', 'Fetch models')}
      </button>

      {models && models.length > 0 && (
        <select
          value={config.model ?? ''}
          onChange={(e) => onPick(e.target.value)}
          className="mt-2 w-full text-xs font-sans text-text-primary bg-surface-base border border-border-subtle rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150 cursor-pointer font-mono"
        >
          <option value="">{tl('选择模型…', 'Select a model…')}</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
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

/* ── 快速添加预设按钮 ── */

function QuickAddPreset({
  onAdd,
  language,
}: {
  onAdd: (config: AiProviderConfig) => void
  language: string
}) {
  const [open, setOpen] = useState(false)
  const tl = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-sans text-accent hover:text-accent/80 transition-colors cursor-pointer border-none bg-transparent"
      >
        <Zap size={13} />
        {tl('快速添加', 'Quick Add')}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border-subtle bg-surface-raised p-1.5 shadow-lg">
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

/* ── 主组件 ── */

export function SettingsAI() {
  const settings = useAppSettingsStore((s) => s.settings)
  const setAiSettings = useAppSettingsStore((s) => s.setAiSettings)
  const language = settings.language
  const tl = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const ai = useMemo(() => settings.ai ?? { enabled: false, providers: [] }, [settings.ai])

  const updateAi = useCallback(
    (next: AiSettings) => {
      fireAndForget(setAiSettings(next), 'save ai settings')
    },
    [setAiSettings],
  )

  const setEnabled = useCallback(
    (enabled: boolean) => {
      updateAi({ ...ai, enabled })
    },
    [ai, updateAi],
  )

  const addProvider = useCallback(() => {
    const newProvider: AiProviderConfig = {
      provider: 'openai',
      label: '',
      apiKey: '',
      baseUrl: PROVIDER_DEFAULTS.openai,
      model: 'gpt-4o',
    }
    updateAi({ ...ai, providers: [...ai.providers, newProvider] })
  }, [ai, updateAi])

  const addProviderFromPreset = useCallback(
    (preset: AiProviderConfig) => {
      updateAi({ ...ai, enabled: true, providers: [...ai.providers, preset] })
    },
    [ai, updateAi],
  )

  const updateProvider = useCallback(
    (index: number, patch: Partial<AiProviderConfig>) => {
      const providers = ai.providers.map((p, i) => (i === index ? { ...p, ...patch } : p))
      updateAi({ ...ai, providers })
    },
    [ai, updateAi],
  )

  const removeProvider = useCallback(
    (index: number) => {
      const providers = ai.providers.filter((_, i) => i !== index)
      updateAi({ ...ai, providers })
    },
    [ai, updateAi],
  )

  const handleProviderChange = useCallback(
    (index: number, newProvider: AiProvider) => {
      const p = ai.providers[index]
      const defaults = PROVIDER_DEFAULTS[newProvider]
      const opt = PROVIDER_OPTIONS.find((o) => o.value === newProvider)
      updateProvider(index, {
        provider: newProvider,
        baseUrl: defaults || p.baseUrl,
        model: opt?.defaultModel || p.model,
      })
    },
    [ai, updateProvider],
  )

  return (
    <div className="flex flex-col gap-5">
      {/* 标题 */}
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          {tl('AI 配置', 'AI Settings')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          {tl(
            '配置 AI 提供商（OpenAI / Anthropic / Google 等）的 API 密钥与模型参数。你的密钥仅存储在本地设备上。',
            'Configure AI providers (OpenAI, Anthropic, Google, etc.) with API keys and model settings. Your keys are stored locally only.',
          )}
        </p>
      </div>

      {/* 启用开关 */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <span className="text-sm font-sans font-medium text-text-primary">
              {tl('启用 AI 功能', 'Enable AI Features')}
            </span>
            <p className="text-xs text-text-tertiary font-sans mt-0.5">
              {tl('关闭后将忽略所有 AI 配置', 'When disabled, all AI configurations are ignored')}
            </p>
          </div>
          <Toggle
            id="ai-enabled-toggle"
            checked={ai.enabled}
            onChange={setEnabled}
          />
        </div>
      </div>

      {/* 提供商列表 */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-sans font-medium text-text-primary">
            {tl('提供商', 'Providers')}
          </h2>
          <div className="flex items-center gap-2">
            <QuickAddPreset onAdd={addProviderFromPreset} language={language} />
            <button
              onClick={addProvider}
              className="flex items-center gap-1 text-xs font-sans text-accent hover:text-accent/80 transition-colors cursor-pointer border-none bg-transparent"
            >
              <Plus size={13} />
              {tl('添加', 'Add')}
            </button>
          </div>
        </div>

        {ai.providers.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-xs text-text-tertiary font-sans">
              {tl('尚未添加任何 AI 提供商。点击上方「添加」按钮开始配置。', 'No AI providers configured. Click "Add" to get started.')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {ai.providers.map((provider, index) => (
              <div
                key={index}
                className={cn(
                  'px-5 py-4',
                  index < ai.providers.length - 1 && 'border-b border-border-subtle',
                )}
              >
                {/* 头部：选择器 + 删除 */}
                <div className="flex items-center justify-between mb-3">
                  <select
                    value={provider.provider}
                    onChange={(e) => handleProviderChange(index, e.target.value as AiProvider)}
                    className="text-sm font-sans font-medium text-text-primary bg-surface-base border border-border-subtle rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150 cursor-pointer"
                  >
                    {PROVIDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {tl(opt.labelZh, opt.labelEn)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeProvider(index)}
                    className="text-text-tertiary hover:text-danger transition-colors cursor-pointer border-none bg-transparent p-1"
                    title={tl('删除', 'Remove')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* 标签 */}
                <div className="mb-3">
                  <label className="block text-xs font-sans font-medium text-text-secondary mb-1">
                    {tl('标签', 'Label')}
                  </label>
                  <input
                    type="text"
                    value={provider.label}
                    onChange={(e) => updateProvider(index, { label: e.target.value })}
                    placeholder={tl('如：主力模型 / 本地测试', 'e.g. Primary / Local test')}
                    className="w-full px-3 py-1.5 text-xs font-sans text-text-primary bg-surface-base border border-border-subtle rounded-lg placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150"
                  />
                </div>

                {/* API Key */}
                <div className="mb-3">
                  <label className="block text-xs font-sans font-medium text-text-secondary mb-1">
                    API Key
                  </label>
                  <PasswordInput
                    value={provider.apiKey}
                    onChange={(v) => updateProvider(index, { apiKey: v })}
                    placeholder={tl('sk-…', 'sk-…')}
                  />
                </div>

                {/* 基础 URL + 模型 并排 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-sans font-medium text-text-secondary mb-1">
                      {tl('基础 URL', 'Base URL')}
                    </label>
                    <input
                      type="text"
                      value={provider.baseUrl ?? ''}
                      onChange={(e) => updateProvider(index, { baseUrl: e.target.value || undefined })}
                      placeholder={
                        provider.provider === 'custom'
                          ? tl('https://…', 'https://…')
                          : tl('使用默认', 'Use default')
                      }
                      className="w-full px-3 py-1.5 text-xs font-sans text-text-primary bg-surface-base border border-border-subtle rounded-lg placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150 font-mono"
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
                      placeholder={tl('如 gpt-4o', 'e.g. gpt-4o')}
                      className="w-full px-3 py-1.5 text-xs font-sans text-text-primary bg-surface-base border border-border-subtle rounded-lg placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150 font-mono"
                    />
                  </div>
                </div>

                {/* 拉取模型 + 测试连接 */}
                {provider.apiKey.trim() && (
                  <>
                    <ModelPicker
                      config={provider}
                      onPick={(m) => updateProvider(index, { model: m })}
                      language={language}
                    />
                    <ConnectionTest config={provider} language={language} />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 底部提示 */}
        <div className="px-5 py-3 border-t border-border-subtle flex items-start gap-2">
          <Info size={13} className="text-text-tertiary mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-text-tertiary font-sans leading-relaxed">
            {tl(
              'API 密钥仅保存在本地数据库中，不会上传至任何服务器。配置后可在各 AI 功能中选择使用哪个提供商。',
              'API keys are stored only in your local database and never uploaded. After configuration, you can select which provider to use in each AI feature.',
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
