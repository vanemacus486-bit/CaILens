/**
 * # hygieneActivity 测试
 *
 * 覆盖：inferHygieneActivity（默认 + 自定义）、findHygieneActivity、hygieneColorVar、调色板自洽
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_HYGIENE_ACTIVITIES,
  HYGIENE_PALETTE,
  inferHygieneActivity,
  findHygieneActivity,
  hygieneColorVar,
  type HygieneActivityDef,
} from '../hygieneActivity'

describe('inferHygieneActivity', () => {
  it('matches default keywords to activity ids', () => {
    expect(inferHygieneActivity('洗澡', DEFAULT_HYGIENE_ACTIVITIES)).toBe('shower')
    expect(inferHygieneActivity('洗头', DEFAULT_HYGIENE_ACTIVITIES)).toBe('hair_wash')
    expect(inferHygieneActivity('晨间刷牙', DEFAULT_HYGIENE_ACTIVITIES)).toBe('brush_teeth')
    expect(inferHygieneActivity('Shower', DEFAULT_HYGIENE_ACTIVITIES)).toBe('shower')
  })

  it('returns null for non-matching / empty titles', () => {
    expect(inferHygieneActivity('写代码', DEFAULT_HYGIENE_ACTIVITIES)).toBeNull()
    expect(inferHygieneActivity('   ', DEFAULT_HYGIENE_ACTIVITIES)).toBeNull()
  })

  it('honors user-defined custom activities and keywords', () => {
    const custom: HygieneActivityDef[] = [
      { id: 'med',   name: '吃维生素', icon: '💊', color: 'sky',  keywords: ['维生素', 'vitamin'] },
      { id: 'floss', name: '用牙线',   icon: '🦷', color: 'sage', keywords: ['牙线', 'floss'] },
    ]
    expect(inferHygieneActivity('晚上吃维生素D', custom)).toBe('med')
    expect(inferHygieneActivity('floss before bed', custom)).toBe('floss')
    // 默认关键词在自定义列表里不再生效
    expect(inferHygieneActivity('洗澡', custom)).toBeNull()
  })
})

describe('findHygieneActivity / hygieneColorVar', () => {
  it('finds activity by id', () => {
    expect(findHygieneActivity(DEFAULT_HYGIENE_ACTIVITIES, 'skincare')?.name).toBe('护肤')
    expect(findHygieneActivity(DEFAULT_HYGIENE_ACTIVITIES, 'nope')).toBeUndefined()
  })

  it('resolves palette keys to css vars and falls back for unknown keys', () => {
    expect(hygieneColorVar('shower')).toBe('var(--tag-hygiene-shower)')
    expect(hygieneColorVar('sky')).toBe('var(--event-sky-fill)')
    expect(hygieneColorVar('unknown-key')).toBe('var(--event-sand-fill)')
  })

  it('every default activity uses a valid palette key', () => {
    const keys = new Set(HYGIENE_PALETTE.map((c) => c.key))
    for (const a of DEFAULT_HYGIENE_ACTIVITIES) {
      expect(keys.has(a.color)).toBe(true)
    }
  })
})
