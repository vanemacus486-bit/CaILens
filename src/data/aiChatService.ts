/**
 * # aiChatService — AI 提供商 fetch 调用分发
 *
 * 纯 async 函数，按 provider 类型分别构造 HTTP 请求。
 * 参照 locationService.ts 的风格：无状态、单纯 async 函数。
 *
 * 桌面端通过 Tauri HTTP 插件发起请求，绕过 WebView 的 CORS 限制；
 * 浏览器端保留原生 fetch，自定义端点仍需自行允许 CORS。
 */

import { isTauri } from '@tauri-apps/api/core'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import type { AiProviderConfig } from '@/domain/settings'
import { parseModelList } from '@/domain/aiChat'
import type { ChatMessage } from '@/domain/aiChat'

/** 请求超时：10s */
const FETCH_TIMEOUT_MS = 10_000

/** 流式请求空闲超时：60s 无任何数据视为超时（长回答生成期间不算超时） */
const STREAM_IDLE_TIMEOUT_MS = 60_000

function resolveModelName(model: string | undefined, fallback: string): string {
  return model
    ?.split(',')
    .map((item) => item.trim())
    .find(Boolean) ?? fallback
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const externalSignal = init.signal
  let timedOut = false
  const abortFromExternalSignal = () => controller.abort(externalSignal?.reason)

  if (externalSignal?.aborted) {
    abortFromExternalSignal()
  } else {
    externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true })
  }

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, FETCH_TIMEOUT_MS)

  try {
    const requestFetch = isTauri() ? tauriFetch : globalThis.fetch
    return await requestFetch(url, { ...init, signal: controller.signal })
  } catch (e) {
    if (timedOut && e instanceof Error && e.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接后重试', { cause: e })
    }
    throw e
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', abortFromExternalSignal)
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
  const model = resolveModelName(config.model, 'gpt-4o')

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
  const model = resolveModelName(config.model, 'claude-sonnet-4-20250514')

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
  const model = resolveModelName(config.model, 'gemini-2.0-flash')

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

// ── 流式输出（SSE） ──────────────────────────────────────

/** 解析单条 SSE 事件，返回 true 表示到达结束标记 */
type SseEventParser = (json: unknown) => boolean

/**
 * 读取 SSE 响应流，逐事件交给 parseEvent 提取文本增量。
 * 空闲超时（STREAM_IDLE_TIMEOUT_MS）期间无任何数据则中止并抛超时错误。
 */
async function consumeSseStream(
  res: Response,
  parseEvent: SseEventParser,
  idle: ReturnType<typeof createIdleGuard>,
): Promise<void> {
  if (!res.body) {
    throw new Error('AI 服务未返回数据流，请重试')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const flushEvents = (): 'continue' | 'stop' => {
    // 兼容 \n\n 与 \r\n\r\n 两种事件分隔；混合行尾时取先出现的分隔符切分，
    // 避免 \n\n 越过 \r\n\r\n 把两个事件合并（前一事件 payload 尾随 \r 导致解析失败）
    let sepIdx = buffer.indexOf('\n\n')
    const crlfIdx = buffer.indexOf('\r\n\r\n')
    if (sepIdx === -1 || (crlfIdx !== -1 && crlfIdx < sepIdx)) sepIdx = crlfIdx
    while (sepIdx !== -1) {
      const event = buffer.slice(0, sepIdx)
      const sepLen = buffer.startsWith('\r\n', sepIdx) ? 4 : 2
      buffer = buffer.slice(sepIdx + sepLen)
      if (handleSseEvent(event, parseEvent) === 'stop') return 'stop'
      sepIdx = buffer.indexOf('\n\n')
      const nextCrlf = buffer.indexOf('\r\n\r\n')
      if (sepIdx === -1 || (nextCrlf !== -1 && nextCrlf < sepIdx)) sepIdx = nextCrlf
    }
    return 'continue'
  }

  // 串行读流；每次 read 前刷新空闲计时
  while (true) {
    idle.arm()
    const { done, value } = await reader.read()
    if (done) break
    idle.clear()
    buffer += decoder.decode(value, { stream: true })
    if (flushEvents() === 'stop') break
  }
  // 流结束时处理残留缓冲（无终止事件 / 末尾事件无空行分隔时兜底）
  if (buffer.trim().length > 0) {
    handleSseEvent(buffer, parseEvent)
  }
  idle.clear()
}

function handleSseEvent(event: string, parseEvent: SseEventParser): 'continue' | 'stop' {
  for (const line of event.split('\n')) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    try {
      if (parseEvent(JSON.parse(payload))) return 'stop'
    } catch {
      // 忽略无法解析的事件（keepalive 等）
    }
  }
  return 'continue'
}

/** 空闲守卫：超过 timeoutMs 无任何活动则 abort 指定 controller */
function createIdleGuard(timeoutMs: number): {
  arm: () => void
  clear: () => void
  isTimedOut: () => boolean
  attach: (controller: AbortController) => void
  reset: () => void
} {
  let timer: ReturnType<typeof setTimeout> | null = null
  let timedOut = false
  let controller: AbortController | null = null
  return {
    arm() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timedOut = true
        controller?.abort()
      }, timeoutMs)
    },
    clear() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    },
    attach(c) { controller = c },
    isTimedOut: () => timedOut,
    reset: () => { timedOut = false },
  }
}

/** 各 provider 的 delta 提取器（闭包捕获 emit） */
function openaiSseParser(emit: (text: string) => void): SseEventParser {
  return (json) => {
    const delta = (json as { choices?: { delta?: { content?: unknown } }[] })?.choices?.[0]?.delta?.content
    if (typeof delta === 'string' && delta.length > 0) emit(delta)
    return false
  }
}

function anthropicSseParser(emit: (text: string) => void): SseEventParser {
  return (json) => {
    const data = json as { type?: string; delta?: { text?: unknown } }
    if (data.type === 'content_block_delta' && typeof data.delta?.text === 'string' && data.delta.text.length > 0) {
      emit(data.delta.text)
    }
    return false
  }
}

function googleSseParser(emit: (text: string) => void): SseEventParser {
  return (json) => {
    const parts = (json as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] })?.candidates?.[0]?.content?.parts
    if (Array.isArray(parts)) {
      for (const part of parts) {
        if (typeof part?.text === 'string' && part.text.length > 0) emit(part.text)
      }
    }
    return false
  }
}

/** 构造各 provider 的流式请求并消费 SSE，增量文本通过 onDelta 回调返回 */
async function streamFromProvider(
  config: AiProviderConfig,
  url: string,
  init: RequestInit,
  parseEvent: SseEventParser,
  signal?: AbortSignal,
): Promise<void> {
  const controller = new AbortController()
  const idle = createIdleGuard(STREAM_IDLE_TIMEOUT_MS)
  idle.attach(controller)
  const abortFromExternal = () => controller.abort(signal?.reason)

  if (signal?.aborted) {
    controller.abort(signal.reason)
  } else {
    signal?.addEventListener('abort', abortFromExternal, { once: true })
  }

  try {
    const requestFetch = isTauri() ? tauriFetch : globalThis.fetch
    idle.arm() // 覆盖 fetch 连接阶段
    const res = await requestFetch(url, { ...init, signal: controller.signal })
    idle.clear()

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const label = config.label || config.provider
      throw new Error(humanReadableError(res.status, label, text))
    }

    await consumeSseStream(res, parseEvent, idle)
  } catch (e) {
    // 兼容 DOM/非 DOM 环境的 AbortError（tauri plugin-http 可能不抛 DOMException）
    if (idle.isTimedOut() && e instanceof Error && e.name === 'AbortError') {
      throw new Error('请求超时：长时间未收到模型响应，请重试', { cause: e })
    }
    throw e
  } finally {
    idle.clear()
    idle.reset()
    signal?.removeEventListener('abort', abortFromExternal)
  }
}

/**
 * 流式调用 AI：逐 token 增量回调，适合长回复场景。
 *
 * @param config    AI 提供商配置
 * @param systemPrompt 系统提示（含日程上下文）
 * @param messages  历史消息列表
 * @param onDelta   文本增量回调（UTF-8 安全，按 SSE chunk 粒度）
 * @param signal    可选 AbortSignal（用户取消）
 */
export async function streamAiChat(
  config: AiProviderConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const emit = (text: string) => onDelta(text)

  switch (config.provider) {
    case 'openai':
    case 'custom': {
      const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
      const model = resolveModelName(config.model, 'gpt-4o')
      await streamFromProvider(
        config,
        `${baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model,
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        },
        openaiSseParser(emit),
        signal,
      )
      return
    }
    case 'anthropic': {
      const baseUrl = (config.baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '')
      const model = resolveModelName(config.model, 'claude-sonnet-4-20250514')
      await streamFromProvider(
        config,
        `${baseUrl}/v1/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model,
            stream: true,
            system: systemPrompt,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            max_tokens: 4096,
          }),
        },
        anthropicSseParser(emit),
        signal,
      )
      return
    }
    case 'google': {
      const baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '')
      const model = resolveModelName(config.model, 'gemini-2.0-flash')
      const url = `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`
      await streamFromProvider(
        config,
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: messages.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          }),
        },
        googleSseParser(emit),
        signal,
      )
      return
    }
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
