import { describe, it, expect } from 'vitest'
import type { PluginDefinition } from '../types'
import { buildPluginCards, filterPluginCards, countPlugins } from '../marketplace'

/**
 * 插件市场的筛选层。
 *
 * 设置页需要一个「只看已启用 / 只看已停用」的过滤器和一个计数条，
 * 这两件事都不该写在 React 组件里——写进去就只能靠人眼验证。
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

const FIXTURES: PluginDefinition[] = [
  plugin({ id: 'on-a', name: '补记模式', description: '表格式批量补录', defaultEnabled: true }),
  plugin({ id: 'off-b', name: '编年史', description: '长期记录', defaultEnabled: false }),
  plugin({ id: 'on-c', name: '灵感箱', description: '收集想法', defaultEnabled: true }),
]

describe('filterPluginCards', () => {
  const cards = buildPluginCards(FIXTURES, {})

  it('status=all 且无查询词时原样返回', () => {
    expect(filterPluginCards(cards, { status: 'all', query: '' })).toHaveLength(3)
  })

  it('status=enabled 只留启用的', () => {
    const out = filterPluginCards(cards, { status: 'enabled', query: '' })
    expect(out.map((c) => c.id)).toEqual(['on-a', 'on-c'])
  })

  it('status=disabled 只留停用的', () => {
    const out = filterPluginCards(cards, { status: 'disabled', query: '' })
    expect(out.map((c) => c.id)).toEqual(['off-b'])
  })

  it('查询词匹配名称', () => {
    const out = filterPluginCards(cards, { status: 'all', query: '编年' })
    expect(out.map((c) => c.id)).toEqual(['off-b'])
  })

  it('查询词匹配描述', () => {
    const out = filterPluginCards(cards, { status: 'all', query: '想法' })
    expect(out.map((c) => c.id)).toEqual(['on-c'])
  })

  it('查询词匹配 id，且大小写不敏感', () => {
    expect(filterPluginCards(cards, { status: 'all', query: 'OFF-B' }).map((c) => c.id)).toEqual(['off-b'])
  })

  it('查询词两端空白被裁掉', () => {
    expect(filterPluginCards(cards, { status: 'all', query: '  灵感  ' }).map((c) => c.id)).toEqual(['on-c'])
  })

  it('查询与状态同时生效（交集）', () => {
    const out = filterPluginCards(cards, { status: 'disabled', query: '补记' })
    expect(out).toEqual([])
  })

  it('空白查询词不产生任何过滤', () => {
    expect(filterPluginCards(cards, { status: 'all', query: '   ' })).toHaveLength(3)
  })

  it('不改动传入的数组', () => {
    const before = cards.map((c) => c.id)
    filterPluginCards(cards, { status: 'enabled', query: '' })
    expect(cards.map((c) => c.id)).toEqual(before)
  })
})

describe('countPlugins', () => {
  it('统计总数与启用数', () => {
    const cards = buildPluginCards(FIXTURES, {})
    expect(countPlugins(cards)).toEqual({ total: 3, enabled: 2, disabled: 1 })
  })

  it('override 生效后计数跟着变', () => {
    const cards = buildPluginCards(FIXTURES, { 'off-b': true })
    expect(countPlugins(cards)).toEqual({ total: 3, enabled: 3, disabled: 0 })
  })

  it('空列表 → 全 0', () => {
    expect(countPlugins([])).toEqual({ total: 0, enabled: 0, disabled: 0 })
  })
})
