import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AiRepository, AiApiError } from '../aiRepository'

describe('AiRepository', () => {
  let repo: AiRepository

  beforeEach(() => {
    repo = new AiRepository()
    vi.restoreAllMocks()
  })

  function mockFetch(status: number, body: unknown) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response)
  }

  it('returns parsed response on success', async () => {
    mockFetch(200, {
      choices: [{ message: { content: '{"observation":"x","pattern":"y","suggestion":"z"}' } }],
      model: 'deepseek-chat',
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    })

    const result = await repo.analyze(
      { apiKey: 'test-key', model: 'deepseek-chat' },
      'system',
      'user',
    )

    expect(result.content).toBe('{"observation":"x","pattern":"y","suggestion":"z"}')
    expect(result.model).toBe('deepseek-chat')
    expect(result.usage.promptTokens).toBe(100)
    expect(result.usage.completionTokens).toBe(50)
  })

  it('strips markdown fences from response', async () => {
    mockFetch(200, {
      choices: [{ message: { content: '```json\n{"observation":"x","pattern":"y","suggestion":"z"}\n```' } }],
      model: 'deepseek-chat',
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    })

    const result = await repo.analyze(
      { apiKey: 'test-key', model: 'deepseek-chat' },
      'system',
      'user',
    )

    expect(result.content).toBe('{"observation":"x","pattern":"y","suggestion":"z"}')
  })

  it('throws AiApiError on 401', async () => {
    mockFetch(401, { error: 'unauthorized' })

    await expect(
      repo.analyze({ apiKey: 'bad', model: 'deepseek-chat' }, 's', 'u'),
    ).rejects.toThrow(AiApiError)

    try {
      await repo.analyze({ apiKey: 'bad', model: 'deepseek-chat' }, 's', 'u')
    } catch (err) {
      expect(err).toBeInstanceOf(AiApiError)
      expect((err as AiApiError).type).toBe('auth')
      expect((err as AiApiError).statusCode).toBe(401)
    }
  })

  it('throws AiApiError on 429', async () => {
    mockFetch(429, { error: 'rate limited' })

    try {
      await repo.analyze({ apiKey: 'key', model: 'deepseek-chat' }, 's', 'u')
    } catch (err) {
      expect((err as AiApiError).type).toBe('rate_limit')
    }
  })

  it('throws network error on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Failed'))

    try {
      await repo.analyze({ apiKey: 'key', model: 'deepseek-chat' }, 's', 'u')
    } catch (err) {
      expect((err as AiApiError).type).toBe('network')
    }
  })

  it('handles missing usage fields gracefully', async () => {
    mockFetch(200, {
      choices: [{ message: { content: '{}' } }],
      model: 'deepseek-chat',
    })

    const result = await repo.analyze(
      { apiKey: 'key', model: 'deepseek-chat' },
      's',
      'u',
    )

    expect(result.usage.promptTokens).toBe(0)
    expect(result.usage.completionTokens).toBe(0)
  })
})
