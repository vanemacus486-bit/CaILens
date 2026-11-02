import { describe, it, expect } from 'vitest'
import {
  buildSettingsSearchIndex,
  fuzzyMatch,
  searchSettings,
  type SettingsSearchItem,
} from '../settingsSearch'

/**
 * 设置项搜索的纯函数测试。
 *
 * seam 是「给一段输入，返回哪些设置项」——不碰 DOM、不碰 store。
 * 索引里的插件 / 分类 / 快捷键都从事实源动态生成，这里用可控替身喂进去。
 */

const INDEX = buildSettingsSearchIndex({
  plugins: [
    {
      id: 'review',
      name: '复盘',
      description: '长期记录与回顾',
      version: '1.0.0',
      defaultEnabled: true,
    },
    {
      id: 'ext',
      name: '外部插件',
      description: '由第三方提供',
      version: '1.0.0',
      defaultEnabled: true,
      origin: 'third-party',
    },
  ],
  categories: [{ id: 'accent', name: '主要矛盾' }],
})

function anchors(query: string): string[] {
  return searchSettings(query, INDEX).map((item) => item.anchor)
}

describe('fuzzyMatch', () => {
  it('空查询视为匹配', () => {
    expect(fuzzyMatch('', 'anything')).toBe(true)
  })

  it('英文子串与松散子序列都能命中', () => {
    expect(fuzzyMatch('language', 'Language')).toBe(true)
    expect(fuzzyMatch('lng', 'Language')).toBe(true)
  })

  it('完全无关的输入不命中', () => {
    expect(fuzzyMatch('zzzz', 'Language')).toBe(false)
  })
})

describe('searchSettings — 中英文与跨页', () => {
  it('中文命中语言设置，并跨「关于」与「界面」两页给出结果', () => {
    const hits = anchors('语言')
    expect(hits).toContain('about-language')
    expect(hits).toContain('interface-language')
  })

  it('英文命中同一批设置项', () => {
    const hits = anchors('language')
    expect(hits).toContain('about-language')
    expect(hits).toContain('interface-language')
  })

  it('模糊输入也能命中', () => {
    expect(anchors('lng')).toContain('about-language')
  })

  it('标题前缀匹配排在关键词命中之前', () => {
    const hits = searchSettings('主题', INDEX)
    expect(hits[0]?.anchor).toBe('appearance-theme')
  })

  it('空查询返回空数组（导航应继续显示页签列表）', () => {
    expect(searchSettings('   ', INDEX)).toEqual([])
  })

  it('无结果时返回空数组', () => {
    expect(searchSettings('zzzz不存在的东西', INDEX)).toEqual([])
  })
})

describe('searchSettings — 动态来源', () => {
  it('核心插件按 origin 归到核心插件页', () => {
    const hits = searchSettings('复盘', INDEX)
    expect(hits).toContainEqual(
      expect.objectContaining({ anchor: 'plugin-review', tab: 'core-plugins' }),
    )
  })

  it('第三方插件归到第三方插件页', () => {
    const hits = searchSettings('外部', INDEX)
    expect(hits).toContainEqual(
      expect.objectContaining({ anchor: 'plugin-ext', tab: 'third-party' }),
    )
  })

  it('快捷键项来自 SHORTCUT_REGISTRY', () => {
    const hits = searchSettings('打开设置', INDEX)
    expect(hits).toContainEqual(
      expect.objectContaining({ anchor: 'shortcut-openSettings', tab: 'shortcuts' }),
    )
  })

  it('分类项指向核心插件页的分类行', () => {
    const hits = searchSettings('主要矛盾', INDEX)
    expect(hits).toContainEqual(
      expect.objectContaining({ anchor: 'category-accent', tab: 'core-plugins' }),
    )
  })
})

describe('searchSettings — 去重与上限', () => {
  const dup: SettingsSearchItem[] = [
    { tab: 'about', anchor: 'about-language', labelZh: '语言', labelEn: 'Language', keywords: [] },
    { tab: 'about', anchor: 'about-language', labelZh: '语言', labelEn: 'Language', keywords: [] },
  ]

  it('同一 tab + anchor 只出现一次', () => {
    expect(searchSettings('语言', dup)).toHaveLength(1)
  })

  it('最多返回 20 条', () => {
    const many: SettingsSearchItem[] = Array.from({ length: 25 }, (_, i) => ({
      tab: 'about',
      anchor: `item-${i}`,
      labelZh: '测试项',
      labelEn: 'Test item',
      keywords: [],
    }))
    expect(searchSettings('测试', many)).toHaveLength(20)
  })
})
