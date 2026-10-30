import { beforeEach, describe, expect, it } from 'vitest'
import {
  collectDomains,
  collectSidebarPanels,
  collectTopBars,
  registerPlugin,
  _resetRegistry,
} from '../registry'
import type { PluginDefinition } from '../types'

/** 用一个最小假插件验证「关闭插件后各槽位清空」的语义，不依赖真实插件的默认值。 */
const fake: PluginDefinition = {
  id: 'fake',
  name: 'Fake',
  description: '',
  version: '1.0.0',
  defaultEnabled: true,
  domain: {
    id: 'fake-domain',
    label: 'Fake',
    icon: 'Puzzle',
    path: '/fake',
    to: '/fake',
    shortcutOrder: 9,
  },
  sidebarPanel: async () => ({ default: () => null }),
  topBar: async () => ({ default: () => null }),
}

describe('插件关闭回归', () => {
  beforeEach(() => _resetRegistry())

  it('默认开启时域 / 侧栏 / 顶栏槽位都有内容', () => {
    registerPlugin(fake)
    expect(collectDomains({}).map((d) => d.domain.id)).toEqual(['fake-domain'])
    expect(collectSidebarPanels({})).toHaveLength(1)
    expect(collectTopBars({})).toHaveLength(1)
  })

  it('显式关闭后三个槽位全部为空', () => {
    registerPlugin(fake)
    const off = { fake: false }
    expect(collectDomains(off)).toEqual([])
    expect(collectSidebarPanels(off)).toEqual([])
    expect(collectTopBars(off)).toEqual([])
  })
})
