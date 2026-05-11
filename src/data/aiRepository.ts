import type { AiModel } from '@/domain/ai'

export interface AiApiConfig {
  apiKey: string
  model: AiModel
}

export interface AiApiUsage {
  promptTokens: number
  completionTokens: number
}

export interface AiApiResponse {
  content: string
  model: string
  usage: AiApiUsage
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

const BASE_URL = 'https://api.deepseek.com/v1'

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('```')) {
    const firstNewline = trimmed.indexOf('\n')
    const lastFence = trimmed.lastIndexOf('```')
    if (firstNewline !== -1 && lastFence > firstNewline) {
      return trimmed.slice(firstNewline + 1, lastFence).trim()
    }
  }
  return trimmed
}

export class AiRepository {
  async analyze(config: AiApiConfig, systemPrompt: string, userMessage: string): Promise<AiApiResponse> {
    let response: Response
    try {
      response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      })
    } catch {
      throw new AiApiError(0, 'Network error — check your connection and retry', 'network')
    }

    if (!response.ok) {
      const status = response.status
      if (status === 401) {
        throw new AiApiError(status, 'Authentication failed — check your API key', 'auth')
      }
      if (status === 429) {
        throw new AiApiError(status, 'Rate limited by DeepSeek — wait a moment and retry', 'rate_limit')
      }
      if (status >= 500) {
        throw new AiApiError(status, `DeepSeek server error (${status}) — retry later`, 'server')
      }
      const body = await response.text().catch(() => '')
      throw new AiApiError(status, `API error (${status}): ${body}`, 'server')
    }

    let data: {
      choices: Array<{ message: { content: string } }>
      model: string
      usage: { prompt_tokens: number; completion_tokens: number }
    }
    try {
      data = await response.json()
    } catch {
      throw new AiApiError(0, 'Failed to parse API response', 'parse')
    }

    const rawContent = data.choices?.[0]?.message?.content
    if (!rawContent) {
      throw new AiApiError(0, 'Empty response from API', 'parse')
    }

    const cleaned = stripMarkdownFences(rawContent)

    // Validate it parses as JSON with the expected shape
    try {
      JSON.parse(cleaned)
    } catch {
      throw new AiApiError(0, 'Response was not valid JSON', 'parse')
    }

    return {
      content: cleaned,
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      },
    }
  }
}
