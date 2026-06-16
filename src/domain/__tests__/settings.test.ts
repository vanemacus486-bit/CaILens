import { describe, it, expect } from 'vitest'
import type { AppTheme } from '@/domain/settings'
import { DEFAULT_SETTINGS, resolveTheme, FONT_SCALE_PX } from '@/domain/settings'

describe('DEFAULT_SETTINGS', () => {
  it('has a theme field that defaults to light', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('light')
  })

  it('has id default and language zh', () => {
    expect(DEFAULT_SETTINGS.id).toBe('default')
    expect(DEFAULT_SETTINGS.language).toBe('zh')
  })

  it('has visualStyle defaulting to graphite', () => {
    expect(DEFAULT_SETTINGS.visualStyle).toBe('graphite')
  })

  it('has fontScale defaulting to default', () => {
    expect(DEFAULT_SETTINGS.fontScale).toBe('default')
  })
})

describe('AppTheme', () => {
  it('accepts valid theme values including auto', () => {
    const valid: AppTheme[] = ['light', 'dark', 'auto']
    expect(valid).toContain('light')
    expect(valid).toContain('dark')
    expect(valid).toContain('auto')
  })
})

describe('resolveTheme', () => {
  it('returns dark when theme is dark regardless of system', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('dark', true)).toBe('dark')
  })

  it('returns light when theme is light regardless of system', () => {
    expect(resolveTheme('light', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('follows system preference when theme is auto', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
  })

  it('follows system preference when theme is undefined', () => {
    expect(resolveTheme(undefined, true)).toBe('dark')
    expect(resolveTheme(undefined, false)).toBe('light')
  })
})

describe('FONT_SCALE_PX', () => {
  it('has correct px values for all scales', () => {
    expect(FONT_SCALE_PX.sm).toBe(15)
    expect(FONT_SCALE_PX.default).toBe(16)
    expect(FONT_SCALE_PX.lg).toBe(17.5)
    expect(FONT_SCALE_PX.xl).toBe(19)
  })
})
