import { describe, it, expect } from 'vitest'
import type { PluginDefinition } from '../types'
import { buildPluginCards, groupPluginCards, PLUGIN_GROUPS } from '../marketplace'

/**
 * 设置页的插件分组：核心插件 / 第三方插件。
 *
 * 这里锁的是两件容易在重构里丢掉的事：
 * 1. 分组是**结构**不是**数据投影** —— 第三方插件一个都没有时，那一组仍然存在。
 * 2. 没登记来源的卡片不会被静默丢弃 —— 宁可多出一组，也不能让插件从设置页消失。
 */

function plugin(over: Partial<PluginDefinition> = {}): PluginDefinition {
  return {
    id: 'demo',
    name: '示例插件',
    description: '一句话说明',
    version: '1.0.0',
    defaultEnabled: true,
    ...over,
  }
}

describe('buildPluginCards — origin', () => {
  it('未声明 origin 时视为 core', () => {
    expect(buildPluginCards([plugin()], {})[0].origin).toBe('core')
  })

  it('保留声明的 origin', () => {
    const cards = buildPluginCards([plugin({ origin: 'third-party' })], {})
    expect(cards[0].origin).toBe('third-party')
  })
})

describe('groupPluginCards', () => {
  it('空列表也返回全部登记分组，顺序沿用 PLUGIN_GROUPS', () => {
    const sections = groupPluginCards([])
    expect(sections.map((s) => s.meta.id)).toEqual(PLUGIN_GROUPS.map((g) => g.id))
    expect(sections.every((s) => s.cards.length === 0)).toBe(true)
  })

  it('核心插件与第三方插件各回各组', () => {
    const cards = buildPluginCards(
      [
        plugin({ id: 'core-a' }),
        plugin({ id: 'tp-a', origin: 'third-party' }),
        plugin({ id: 'core-b', origin: 'core' }),
      ],
      {},
    )
    const sections = groupPluginCards(cards)
    expect(sections.map((s) => [s.meta.id, s.cards.map((c) => c.id)])).toEqual([
      ['core', ['core-a', 'core-b']],
      ['third-party', ['tp-a']],
    ])
  })

  it('空组的 meta 仍带 label 与 emptyHint，供 UI 渲染说明', () => {
    const cards = buildPluginCards([plugin()], {})
    const thirdParty = groupPluginCards(cards).find((s) => s.meta.id === 'third-party')
    expect(thirdParty?.cards).toEqual([])
    expect(thirdParty?.meta.label).toBe('第三方插件')
    expect(thirdParty?.meta.emptyHint.length).toBeGreaterThan(0)
  })

  it('组内顺序沿用传入顺序，不重排', () => {
    const cards = buildPluginCards(
      [plugin({ id: 'z' }), plugin({ id: 'a' }), plugin({ id: 'm' })],
      {},
    )
    const core = groupPluginCards(cards).find((s) => s.meta.id === 'core')
    expect(core?.cards.map((c) => c.id)).toEqual(['z', 'a', 'm'])
  })

  it('未登记来源追加到末尾，不静默丢弃卡片', () => {
    const cards = buildPluginCards(
      [plugin({ id: 'known' }), plugin({ id: 'weird', origin: 'side-load' as never })],
      {},
    )
    const sections = groupPluginCards(cards)
    expect(sections.map((s) => s.meta.id)).toEqual(['core', 'third-party', 'side-load'])
    expect(sections[2].cards.map((c) => c.id)).toEqual(['weird'])
  })
})
