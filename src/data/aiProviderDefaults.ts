import type { AiProvider } from '@/domain/aiChat'

export interface ProviderDefaults {
  endpoint: string
  models: string[]
  defaultModel: string
}

export const PROVIDER_DEFAULTS: Record<AiProvider, ProviderDefaults> = {
  deepseek: {
    endpoint: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
  },
  openai: {
    endpoint: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    defaultModel: 'gpt-4o-mini',
  },
  claude: {
    endpoint: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250514'],
    defaultModel: 'claude-sonnet-4-20250514',
  },
  custom: {
    endpoint: '',
    models: [],
    defaultModel: '',
  },
}
