import { describe, it, expect } from 'vitest'
import type { PluginDefinition } from '../types'
import { buildPluginCards } from '../marketplace'

/**
 * 子视图插件（`domainViews`）在设置页里的呈现。
 *
 * 复盘域拆成五个插件后，它们既没有自己的 `routes`，也没有 `navItems` ——
 * 只靠 `domainViews` 往复盘域里加格子。如果卡片只数 routes/navItems，
 * 五个插件会全部显示「0 个页面 · 0 个入口」，看起来像没注册上。
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

const view = (id: string) => ({
  domainId: 'review',
  id,
  label: id,
  icon: 'Puzzle',
  order: 10,
  component: () => Promise.resolve({ default: () => null }),
})

describe('buildPluginCards — 子视图计数', () => {
  it('没有 domainViews 时 viewCount 为 0', () => {
    expect(buildPluginCards([plugin()], {})[0].viewCount).toBe(0)
  })

  it('统计 domainViews 的条数', () => {
    const cards = buildPluginCards([plugin({ domainViews: [view('a'), view('b')] })], {})
    expect(cards[0].viewCount).toBe(2)
  })

  it('routes 与 domainViews 各自独立计数，不互相顶替', () => {
    const cards = buildPluginCards(
      [
        plugin({
          id: 'shell',
          routes: [{ path: '/x', component: () => Promise.resolve({ default: () => null }) }],
        }),
        plugin({ id: 'view-only', domainViews: [view('v')] }),
      ],
      {},
    )
    expect(cards.map((c) => [c.id, c.routeCount, c.viewCount])).toEqual([
      ['shell', 1, 0],
      ['view-only', 0, 1],
    ])
  })
})
