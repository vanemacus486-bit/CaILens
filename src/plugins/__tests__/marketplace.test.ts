import { describe, it, expect } from 'vitest'
import type { PluginDefinition } from '../types'
import { buildPluginCards } from '../marketplace'

/**
 * 插件市场的纯逻辑层。
 *
 * 这里只测「插件定义 + 用户开关记录」如何变成一个可展示的卡片列表，
 * 不碰 React、不碰 store——UI 层的失败不应该让这些断言变红。
 *
 * 开关语义沿用主体约定：`overrides[id] ?? defaultEnabled`。
 * 关键区别是 `isOverridden`：用户有没有显式设置过。
 * 没有它，设置页就无法区分「默认开启」和「用户主动开启」。
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

describe('buildPluginCards', () => {
  it('空列表 → 空卡片', () => {
    expect(buildPluginCards([], {})).toEqual([])
  })

  it('没有 override 时回落到 defaultEnabled', () => {
    const cards = buildPluginCards(
      [
        plugin({ id: 'on', defaultEnabled: true }),
        plugin({ id: 'off', defaultEnabled: false }),
      ],
      {},
    )
    expect(cards.map((c) => [c.id, c.enabled, c.isOverridden])).toEqual([
      ['on', true, false],
      ['off', false, false],
    ])
  })

  it('override 覆盖 defaultEnabled，并标记 isOverridden', () => {
    const cards = buildPluginCards(
      [
        plugin({ id: 'a', defaultEnabled: true }),
        plugin({ id: 'b', defaultEnabled: false }),
      ],
      { a: false, b: true },
    )
    expect(cards.map((c) => [c.id, c.enabled, c.isOverridden])).toEqual([
      ['a', false, true],
      ['b', true, true],
    ])
  })

  it('override 与默认值相同也算用户显式设置过', () => {
    const cards = buildPluginCards([plugin({ defaultEnabled: true })], { demo: true })
    expect(cards[0].isOverridden).toBe(true)
  })

  it('统计路由数与导航数，缺省为 0', () => {
    const withRoutes = plugin({
      id: 'with',
      routes: [
        { path: '/a', component: async () => ({ default: () => null }) },
        { path: '/b', component: async () => ({ default: () => null }) },
      ],
      navItems: [{ label: 'A', to: '/a', icon: 'Puzzle', order: 10 }],
    })
    const bare = plugin({ id: 'bare' })
    const cards = buildPluginCards([withRoutes, bare], {})
    expect(cards.map((c) => [c.id, c.routeCount, c.navCount])).toEqual([
      ['with', 2, 1],
      ['bare', 0, 0],
    ])
  })

  it('tables 缺省时给出空数组而不是 undefined', () => {
    const cards = buildPluginCards([plugin()], {})
    expect(cards[0].tables).toEqual([])
  })

  it('保留声明的表名', () => {
    const cards = buildPluginCards([plugin({ tables: ['chronicles', 'chronicleEntries'] })], {})
    expect(cards[0].tables).toEqual(['chronicles', 'chronicleEntries'])
  })

  it('未知 id 的 override 不影响卡片', () => {
    const cards = buildPluginCards([plugin({ id: 'real' })], { ghost: false })
    expect(cards).toHaveLength(1)
    expect(cards[0].id).toBe('real')
  })
})
