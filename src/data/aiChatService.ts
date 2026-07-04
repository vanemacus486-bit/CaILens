/**
 * # aiChatService — AI 提供商 fetch 调用分发
 *
 * 纯 async 函数，按 provider 类型分别构造 HTTP 请求。
 * 参照 locationService.ts 的风格：无状态、单纯 async 函数。
 *
 * 注意：Anthropic 需要 `anthropic-dangerous-direct-browser-access: true` 头
 * 以允许浏览器/WebView 直连。OpenAI/Google 的公开接口一般允许浏览器直连。
 * 自定义端点是否允许 CORS 由用户自己的服务器决定。
 */

import type { AiProviderConfig } from '@/domain/settings'
import { parseModelList } from '@/domain/aiChat'
import type { ChatMessage } from '@/domain/aiChat'

/** 请求超时：10s */
const FETCH_TIMEOUT_MS = 10_000

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接后重试', { cause: e })
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// ── 可读错误消息 ──────────────────────────────────────────

/** 将 HTTP 状态码转为人类可读的错误消息 */
function humanReadableError(status: number, providerLabel: string, body: string): string {
  const snippet = body.slice(0, 200).replace(/\n/g, ' ').trim()
  switch (status) {
    case 401: return `${providerLabel}：API 密钥无效（401），请检查密钥是否正确`
    case 403: return `${providerLabel}：无权限访问（403），密钥可能被禁用或未开通该模型`
    case 404: return `${providerLabel}：端点地址不存在（404），请检查 Base URL 是否正确`
    case 429: return `${providerLabel}：请求频率超限（429），请稍后再试`
    default:
      if (status >= 500) return `${providerLabel}：服务器错误（${status}）${snippet ? `— ${snippet}` : ''}，请稍后重试`
      return `${providerLabel}：请求失败（${status}）${snippet ? `— ${snippet}` : ''}`
  }
}

// ── OpenAI / 自定义兼容 ───────────────────────────────────

async function callOpenAI(
  config: AiProviderConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const model = config.model || 'gpt-4o'

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  }

  const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(humanReadableError(res.status, 'OpenAI', text))
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ── Anthropic ─────────────────────────────────────────────

async function callAnthropic(
  config: AiProviderConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = (config.baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '')
  const model = config.model || 'claude-sonnet-4-20250514'

  const body = {
    model,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
    max_tokens: 4096,
  }

  const res = await fetchWithTimeout(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(humanReadableError(res.status, 'Anthropic', text))
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ── Google Gemini ─────────────────────────────────────────

async function callGoogle(
  config: AiProviderConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '')
  const model = config.model || 'gemini-2.0-flash'

  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${config.apiKey}`

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  }

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(humanReadableError(res.status, 'Gemini', text))
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ── 统一入口 ─────────────────────────────────────────────

export type AiChatStreamCallback = (text: string) => void

/**
 * 按 provider 类型调用对应的 AI API。
 *
 * @param config    AI 提供商配置
 * @param systemPrompt 系统提示（含日程上下文）
 * @param messages  历史消息列表
 * @param signal    可选 AbortSignal
 * @returns 助手的回复文本
 */
export async function callAiChat(
  config: AiProviderConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  switch (config.provider) {
    case 'openai':
    case 'custom':
      return callOpenAI(config, systemPrompt, messages, signal)
    case 'anthropic':
      return callAnthropic(config, systemPrompt, messages, signal)
    case 'google':
      return callGoogle(config, systemPrompt, messages, signal)
    default:
      throw new Error(`不支持的 AI 提供商: ${config.provider}`)
  }
}

// ── /models 端点构造（连接测试 + 模型拉取共用） ────────────

/** 构造各 provider 的 `/models` GET 请求（用于连接测试与模型拉取）。 */
function modelsEndpoint(config: AiProviderConfig): { url: string; init: RequestInit } | null {
  switch (config.provider) {
    case 'openai':
    case 'custom': {
      const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
      return { url: `${baseUrl}/models`, init: { headers: { 'Authorization': `Bearer ${config.apiKey}` } } }
    }
    case 'anthropic': {
      const baseUrl = (config.baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '')
      return {
        url: `${baseUrl}/v1/models`,
        init: {
          headers: {
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
        },
      }
    }
    case 'google': {
      const baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '')
      return { url: `${baseUrl}/v1beta/models?key=${config.apiKey}`, init: { method: 'GET' } }
    }
    default:
      return null
  }
}

/** fetch 抛出的异常 → 友好中文消息 */
function networkErrorMessage(e: unknown, label: string): string {
  return e instanceof TypeError
    ? `${label}：网络错误 — 无法连接到服务器，请检查 Base URL 或网络设置`
    : e instanceof Error
      ? `${label}：${e.message}`
      : `${label}：未知错误`
}

// ── 模型列表拉取 ──────────────────────────────────────────

export interface ModelListResult {
  ok: boolean
  models: string[]
  message?: string
}

/**
 * 拉取指定提供商 `/models` 端点的可用模型列表。
 * 供设置页「从端点拉取模型」下拉使用，确保填入的模型名真实存在。
 */
export async function fetchAvailableModels(config: AiProviderConfig): Promise<ModelListResult> {
  const label = config.label || config.provider
  const ep = modelsEndpoint(config)
  if (!ep) return { ok: false, models: [], message: `不支持的提供商: ${config.provider}` }

  try {
    const res = await fetchWithTimeout(ep.url, ep.init)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, models: [], message: humanReadableError(res.status, label, text) }
    }
    const data = await res.json()
    return { ok: true, models: parseModelList(config.provider, data) }
  } catch (e) {
    return { ok: false, models: [], message: networkErrorMessage(e, label) }
  }
}

// ── 连接测试 ──────────────────────────────────────────────

export interface ConnectionTestResult {
  ok: boolean
  message: string
}

/**
 * 对指定提供商发起轻量级连接测试。
 * 调用各商家的 `/models` 端点，验证 API Key + Base URL 是否可用。
 */
export async function testAiConnection(config: AiProviderConfig): Promise<ConnectionTestResult> {
  const label = config.label || config.provider
  const ep = modelsEndpoint(config)
  if (!ep) return { ok: false, message: `不支持的提供商: ${config.provider}` }

  try {
    const res = await fetchWithTimeout(ep.url, ep.init)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, message: humanReadableError(res.status, label, text) }
    }
    return { ok: true, message: `${label}：连接成功 ✓` }
  } catch (e) {
    return { ok: false, message: networkErrorMessage(e, label) }
  }
}
