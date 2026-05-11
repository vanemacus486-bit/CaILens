import type { AiProvider } from '@/domain/aiChat'
import { PROVIDER_DEFAULTS } from './aiProviderDefaults'

export interface AiApiUsage {
  promptTokens: number
  completionTokens: number
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (fullContent: string, usage: AiApiUsage) => void
  onError: (error: AiApiError) => void
}

export class AiApiError extends Error {
  statusCode: number
  type: 'auth' | 'rate_limit' | 'network' | 'server' | 'parse'

  constructor(statusCode: number, message: string, type: AiApiError['type']) {
    super(message)
    this.name = 'AiApiError'
    this.statusCode = statusCode
    this.type = type
  }
}

function getEndpoint(provider: AiProvider, customEndpoint?: string): string {
  if (provider === 'custom' && customEndpoint) return customEndpoint
  return PROVIDER_DEFAULTS[provider]?.endpoint ?? ''
}

function buildRequestBody(
  provider: AiProvider,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number,
): { url: string; headers: Record<string, string>; body: string } {
  const endpoint = getEndpoint(provider)
  const url = provider === 'claude'
    ? `${endpoint}/messages`
    : `${endpoint}/chat/completions`

  if (provider === 'claude') {
    const systemMsg = messages.find((m) => m.role === 'system')
    const chatMessages = messages.filter((m) => m.role !== 'system')
    return {
      url,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '', // filled by caller
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMsg?.content ?? '',
        messages: chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
    }
  }

  // DeepSeek and OpenAI use the same format
  return {
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': '', // filled by caller
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
    }),
  }
}

function setAuthHeader(headers: Record<string, string>, provider: AiProvider, apiKey: string): void {
  if (provider === 'claude') {
    headers['x-api-key'] = apiKey
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
}

async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  provider: AiProvider,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''
  let usage: AiApiUsage = { promptTokens: 0, completionTokens: 0 }

  try {
    while (true) {
      if (signal?.aborted) break

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const dataStr = trimmed.slice(5).trim()
        if (dataStr === '[DONE]') continue

        try {
          const data = JSON.parse(dataStr)

          if (provider === 'claude') {
            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullContent += data.delta.text
              callbacks.onToken(data.delta.text)
            }
            if (data.type === 'message_delta' && data.usage) {
              usage = {
                promptTokens: data.usage.input_tokens ?? 0,
                completionTokens: data.usage.output_tokens ?? 0,
              }
            }
          } else {
            // DeepSeek / OpenAI format
            const delta = data.choices?.[0]?.delta
            if (delta?.content) {
              fullContent += delta.content
              callbacks.onToken(delta.content)
            }
            if (data.usage) {
              usage = {
                promptTokens: data.usage.prompt_tokens ?? 0,
                completionTokens: data.usage.completion_tokens ?? 0,
              }
            }
          }
        } catch {
          // Skip unparseable SSE lines
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) {
      callbacks.onDone(fullContent, usage)
      return
    }
    callbacks.onError(new AiApiError(0, 'Stream connection lost', 'network'))
    return
  }

  callbacks.onDone(fullContent, usage)
}

export class AiChatRepository {
  private abortController: AbortController | null = null

  async streamChat(
    provider: AiProvider,
    apiKey: string,
    endpoint: string | undefined,
    model: string,
    messages: Array<{ role: string; content: string }>,
    maxTokens: number,
    temperature: number,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    this.abortController = new AbortController()

    const { url, headers, body } = buildRequestBody(provider, model, messages, maxTokens, temperature)
    if (endpoint && provider === 'custom') {
      const customUrl = `${endpoint}/chat/completions`
      setAuthHeader(headers, 'openai', apiKey) // custom uses OpenAI-compatible auth
      let response: Response
      try {
        response = await fetch(customUrl, {
          method: 'POST',
          headers,
          body,
          signal: this.abortController.signal,
        })
      } catch {
        if (this.abortController.signal.aborted) return
        callbacks.onError(new AiApiError(0, 'Network error — check your connection and retry', 'network'))
        return
      }
      await this.handleResponse(response, provider, callbacks)
      return
    }

    setAuthHeader(headers, provider, apiKey)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: this.abortController.signal,
      })
    } catch {
      if (this.abortController.signal.aborted) return
      callbacks.onError(new AiApiError(0, 'Network error — check your connection and retry', 'network'))
      return
    }

    await this.handleResponse(response, provider, callbacks)
  }

  private async handleResponse(
    response: Response,
    provider: AiProvider,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    if (!response.ok) {
      const status = response.status
      if (status === 401) {
        callbacks.onError(new AiApiError(status, 'Authentication failed — check your API key', 'auth'))
        return
      }
      if (status === 429) {
        callbacks.onError(new AiApiError(status, 'Rate limited — wait a moment and retry', 'rate_limit'))
        return
      }
      if (status >= 500) {
        callbacks.onError(new AiApiError(status, `Server error (${status}) — retry later`, 'server'))
        return
      }
      const text = await response.text().catch(() => '')
      callbacks.onError(new AiApiError(status, `API error (${status}): ${text}`, 'server'))
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError(new AiApiError(0, 'Response body is empty', 'parse'))
      return
    }

    await parseSSEStream(reader, provider, callbacks, this.abortController?.signal)
  }

  stopStreaming(): void {
    this.abortController?.abort()
    this.abortController = null
  }

  /** Send a minimal request to verify the API key works. Returns true if valid. */
  async testConnection(
    provider: AiProvider,
    apiKey: string,
    endpoint: string | undefined,
    model: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const defaultEndpoint = getEndpoint(provider, endpoint)
    const url = provider === 'claude'
      ? `${defaultEndpoint}/messages`
      : `${defaultEndpoint}/chat/completions`

    const testBody = provider === 'claude'
      ? JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        })
      : JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        })

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (provider === 'claude') {
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    try {
      const response = await fetch(url, { method: 'POST', headers, body: testBody })
      if (response.ok || response.status === 400) return { ok: true }
      if (response.status === 401) return { ok: false, error: 'Invalid API key' }
      return { ok: false, error: `Server returned ${response.status}` }
    } catch {
      return { ok: false, error: 'Network error — check your connection and endpoint URL' }
    }
  }
}
