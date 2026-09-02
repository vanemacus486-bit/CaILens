import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  tauri: false,
  tauriFetch: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => mocks.tauri,
}))

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: mocks.tauriFetch,
}))

import { testAiConnection, streamAiChat } from '../aiChatService'
import type { AiProviderConfig } from '@/domain/settings'

const config: AiProviderConfig = {
  provider: 'openai',
  label: 'OpenAI',
  apiKey: 'sk-test',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
}

describe('aiChatService transport', () => {
  beforeEach(() => {
    mocks.tauri = false
    mocks.tauriFetch.mockReset()
    vi.unstubAllGlobals()
  })

  it('uses browser fetch outside Tauri', async () => {
    const browserFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }))
    vi.stubGlobal('fetch', browserFetch)

    const result = await testAiConnection(config)

    expect(result.ok).toBe(true)
    expect(browserFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer sk-test' },
        signal: expect.any(AbortSignal),
      }),
    )
    expect(mocks.tauriFetch).not.toHaveBeenCalled()
  })

  it('uses the native HTTP plugin inside Tauri', async () => {
    mocks.tauri = true
    mocks.tauriFetch.mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }))
    const browserFetch = vi.fn()
    vi.stubGlobal('fetch', browserFetch)

    const result = await testAiConnection(config)

    expect(result.ok).toBe(true)
    expect(mocks.tauriFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer sk-test' },
        signal: expect.any(AbortSignal),
      }),
    )
    expect(browserFetch).not.toHaveBeenCalled()
  })
})

describe('streamAiChat SSE parsing', () => {
  beforeEach(() => {
    mocks.tauri = false
    mocks.tauriFetch.mockReset()
    vi.unstubAllGlobals()
  })

  function sseResponse(chunks: string[]): Response {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c))
        controller.close()
      },
    })
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  }

  it('streams OpenAI deltas across chunk boundaries', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(sseResponse([
      'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"好"}}]}\n\ndata: [DONE]\n\n',
    ])))
    vi.stubGlobal('fetch', fetchMock)
    const deltas: string[] = []
    await streamAiChat(config, 'sys', [{ role: 'user', content: 'hi' }], (d) => deltas.push(d))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(deltas.join('')).toBe('你好')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('handles Anthropic content_block_delta events', async () => {
    const anthropicConfig = { ...config, provider: 'anthropic' as const, baseUrl: 'https://api.anthropic.com' }
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"text":"Claude"}}\n\n',
      'data: {"type":"message_stop"}\n\n',
    ]))
    vi.stubGlobal('fetch', fetchMock)
    const deltas: string[] = []
    await streamAiChat(anthropicConfig, 'sys', [], (d) => deltas.push(d))
    expect(deltas.join('')).toBe('Claude')
  })

  it('handles Google streamGenerateContent parts', async () => {
    const googleConfig = { ...config, provider: 'google' as const, baseUrl: 'https://generativelanguage.googleapis.com' }
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([
      'data: {"candidates":[{"content":{"parts":[{"text":"Gem"},{"text":"ini"}]}}]}\n\n',
    ]))
    vi.stubGlobal('fetch', fetchMock)
    const deltas: string[] = []
    await streamAiChat(googleConfig, 'sys', [], (d) => deltas.push(d))
    expect(deltas.join('')).toBe('Gemini')
  })

  it('rejects non-ok responses with friendly error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'bad' }), { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(streamAiChat(config, 'sys', [], () => {})).rejects.toThrow('API 密钥无效')
  })

  it('supports user cancellation via AbortSignal', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const onAbort = () => reject(new DOMException('aborted', 'AbortError'))
        init.signal?.addEventListener('abort', onAbort, { once: true })
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const promise = streamAiChat(config, 'sys', [], () => {}, controller.signal)
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})
