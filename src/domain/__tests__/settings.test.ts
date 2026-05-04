import { describe, it, expect } from 'vitest'
import type { AppTheme } from '@/domain/settings'
import { DEFAULT_SETTINGS } from '@/domain/settings'

describe('DEFAULT_SETTINGS', () => {
  it('has a theme field that defaults to light', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('light')
  })

  it('has id default and language zh', () => {
    expect(DEFAULT_SETTINGS.id).toBe('default')
    expect(DEFAULT_SETTINGS.language).toBe('zh')
  })
})

describe('AppTheme', () => {
  it('accepts valid theme values', () => {
    const valid: AppTheme[] = ['light', 'dark']
    expect(valid.length).toBe(2)
    expect(valid).toContain('light')
    expect(valid).toContain('dark')
  })
})
