import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  registerPlugin,
  registerPlugins,
  getPlugin,
  listPlugins,
  activePlugins,
  collectRoutes,
  collectNavItems,
  collectDomains,
  findDomainPlugin,
  _resetRegistry,
} from '../registry'
import type { PluginDefinition } from '../types'

function makePlugin(over: Partial<PluginDefinition> = {}): PluginDefinition {
  return {
    id: 'demo',
    name: 'Demo',
    description: 'demo plugin',
    version: '1.0.0',
    defaultEnabled: true,
    ...over,
  }
}

describe('plugin registry', () => {
  beforeEach(() => {
    _resetRegistry()
    vi.restoreAllMocks()
  })

  it('registers and retrieves a plugin by id', () => {
    registerPlugin(makePlugin())
    expect(getPlugin('demo')?.name).toBe('Demo')
  })

  it('returns undefined for an unknown id', () => {
    expect(getPlugin('nope')).toBeUndefined()
  })

  it('warns and overwrites on duplicate id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    registerPlugin(makePlugin())
    registerPlugin(makePlugin({ name: 'Second' }))
    expect(getPlugin('demo')?.name).toBe('Second')
    expect(warn).toHaveBeenCalledOnce()
  })

  it('registerPlugins installs every definition', () => {
    registerPlugins([makePlugin({ id: 'a' }), makePlugin({ id: 'b' })])
    expect(listPlugins().map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('listPlugins is sorted by id regardless of insertion order', () => {
    registerPlugins([makePlugin({ id: 'z' }), makePlugin({ id: 'a' }), makePlugin({ id: 'm' })])
    expect(listPlugins().map((p) => p.id)).toEqual(['a', 'm', 'z'])
  })

  describe('activePlugins', () => {
    it('falls back to defaultEnabled when no override exists', () => {
      registerPlugins([
        makePlugin({ id: 'on', defaultEnabled: true }),
        makePlugin({ id: 'off', defaultEnabled: false }),
      ])
      expect(activePlugins().map((p) => p.id)).toEqual(['on'])
    })

    it('an explicit override wins over defaultEnabled', () => {
      registerPlugins([
        makePlugin({ id: 'on', defaultEnabled: true }),
        makePlugin({ id: 'off', defaultEnabled: false }),
      ])
      const active = activePlugins({ on: false, off: true })
      expect(active.map((p) => p.id)).toEqual(['off'])
    })

    it('an unknown override key does not invent a plugin', () => {
      registerPlugin(makePlugin({ id: 'real' }))
      expect(activePlugins({ ghost: true }).map((p) => p.id)).toEqual(['real'])
    })
  })

  describe('collectRoutes', () => {
    it('skips plugins with no routes', () => {
      registerPlugin(makePlugin({ id: 'plain' }))
      expect(collectRoutes()).toEqual([])
    })

    it('skips disabled plugins even if they declare routes', () => {
      registerPlugin(
        makePlugin({
          id: 'off',
          defaultEnabled: false,
          routes: [{ path: '/x', component: async () => ({ default: () => null }) }],
        }),
      )
      expect(collectRoutes()).toEqual([])
    })

    it('returns routes of enabled plugins only', () => {
      registerPlugin(
        makePlugin({
          id: 'on',
          routes: [{ path: '/x', component: async () => ({ default: () => null }) }],
        }),
      )
      const collected = collectRoutes()
      expect(collected).toHaveLength(1)
      expect(collected[0].id).toBe('on')
      expect(collected[0].routes[0].path).toBe('/x')
    })
  })

  describe('collectNavItems', () => {
    it('sorts nav items by order within a plugin', () => {
      registerPlugin(
        makePlugin({
          id: 'nav',
          navItems: [
            { label: 'B', to: '/b', icon: 'X', order: 20 },
            { label: 'A', to: '/a', icon: 'Y', order: 10 },
          ],
        }),
      )
      const nav = collectNavItems()
      expect(nav[0].items.map((i) => i.label)).toEqual(['A', 'B'])
    })

    it('drops disabled plugins from navigation', () => {
      registerPlugin(
        makePlugin({
          id: 'off',
          defaultEnabled: false,
          navItems: [{ label: 'A', to: '/a', icon: 'X', order: 1 }],
        }),
      )
      expect(collectNavItems()).toEqual([])
    })
  })

  describe('collectDomains', () => {
    const domain = (id: string, shortcutOrder: number) => ({
      id,
      label: id,
      icon: 'Puzzle',
      path: `/${id}`,
      to: `/${id}`,
      shortcutOrder,
    })

    it('only returns plugins that claim a domain', () => {
      registerPlugins([
        makePlugin({ id: 'a', domain: domain('a', 2) }),
        makePlugin({ id: 'plain' }),
      ])
      expect(collectDomains().map((d) => d.pluginId)).toEqual(['a'])
    })

    it('sorts by shortcutOrder, not registration order', () => {
      registerPlugins([
        makePlugin({ id: 'late', domain: domain('late', 3) }),
        makePlugin({ id: 'early', domain: domain('early', 2) }),
      ])
      expect(collectDomains().map((d) => d.domain.shortcutOrder)).toEqual([2, 3])
    })

    it('drops disabled plugins from domains', () => {
      registerPlugin(makePlugin({ id: 'off', defaultEnabled: false, domain: domain('off', 2) }))
      expect(collectDomains()).toEqual([])
    })

    it('keeps the headerStepKind as declared by the plugin', () => {
      // 主体只按语义分派，不猜语义：第三态必须原样透传给顶栏
      registerPlugin(
        makePlugin({
          id: 'cycle',
          domain: { ...domain('cycle', 2), headerStepKind: 'filter-cycle' },
        }),
      )
      expect(collectDomains()[0].domain.headerStepKind).toBe('filter-cycle')
    })

    it('lets the first plugin win when two claim the same domain id', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // listPlugins 按 id 排序，所以 'a' 先注册进 claimed
      registerPlugins([
        makePlugin({ id: 'b', domain: domain('shared', 2) }),
        makePlugin({ id: 'a', domain: domain('shared', 2) }),
      ])
      const claimed = collectDomains()
      expect(claimed).toHaveLength(1)
      expect(claimed[0].pluginId).toBe('a')
      expect(warn).toHaveBeenCalled()
    })
  })

  describe('findDomainPlugin', () => {
    const domain = (id: string, path: string) => ({
      id,
      label: id,
      icon: 'Puzzle',
      path,
      to: path,
      shortcutOrder: 2,
    })

    it('matches the domain root and its sub-paths', () => {
      registerPlugin(makePlugin({ id: 'a', domain: domain('a', '/action') }))
      expect(findDomainPlugin('/action')?.pluginId).toBe('a')
      expect(findDomainPlugin('/action/archive')?.pluginId).toBe('a')
    })

    it('does not match a sibling path sharing a prefix', () => {
      registerPlugin(makePlugin({ id: 'a', domain: domain('a', '/action') }))
      expect(findDomainPlugin('/actions')).toBeUndefined()
    })

    it('picks the longest matching prefix', () => {
      registerPlugins([
        makePlugin({ id: 'short', domain: domain('short', '/a') }),
        makePlugin({ id: 'long', domain: domain('long', '/a/b') }),
      ])
      expect(findDomainPlugin('/a/b/c')?.pluginId).toBe('long')
      expect(findDomainPlugin('/a/x')?.pluginId).toBe('short')
    })
  })
})
