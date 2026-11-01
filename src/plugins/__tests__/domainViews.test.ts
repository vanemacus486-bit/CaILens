import { describe, it, expect, beforeEach, vi } from 'vitest'
import { registerPlugins, collectDomainViews, _resetRegistry } from '../registry'
import type { PluginDefinition, PluginDomain, PluginDomainView } from '../types'

function domain(id: string): PluginDomain {
  return {
    id,
    label: id,
    icon: 'Puzzle',
    path: `/${id}`,
    to: `/${id}`,
    shortcutOrder: 3,
  }
}

const noop = () => Promise.resolve({ default: () => null })

function view(domainId: string, id: string, order: number): PluginDomainView {
  return { domainId, id, label: id, icon: 'Puzzle', order, component: noop }
}

function makePlugin(over: Partial<PluginDefinition>): PluginDefinition {
  return {
    id: over.id ?? 'demo',
    name: over.name ?? 'Demo',
    description: 'demo',
    version: '1.0.0',
    defaultEnabled: true,
    ...over,
  }
}

describe('collectDomainViews', () => {
  beforeEach(() => {
    _resetRegistry()
    vi.restoreAllMocks()
  })

  it('returns views of an enabled domain, sorted by order', () => {
    registerPlugins([
      makePlugin({ id: 'review', domain: domain('review') }),
      makePlugin({ id: 'v-b', domainViews: [view('review', 'b', 20)] }),
      makePlugin({ id: 'v-a', domainViews: [view('review', 'a', 10)] }),
    ])
    expect(collectDomainViews('review').map((v) => v.id)).toEqual(['a', 'b'])
  })

  it('drops views contributed by a disabled plugin', () => {
    registerPlugins([
      makePlugin({ id: 'review', domain: domain('review') }),
      makePlugin({ id: 'v-a', domainViews: [view('review', 'a', 10)] }),
      makePlugin({ id: 'v-b', domainViews: [view('review', 'b', 20)] }),
    ])
    expect(collectDomainViews('review', { 'v-b': false }).map((v) => v.id)).toEqual(['a'])
  })

  it('drops every view when the owning domain plugin is disabled', () => {
    registerPlugins([
      makePlugin({ id: 'review', domain: domain('review') }),
      makePlugin({ id: 'v-a', domainViews: [view('review', 'a', 10)] }),
    ])
    expect(collectDomainViews('review', { review: false })).toEqual([])
  })

  it('ignores views whose domain is not claimed by any enabled plugin', () => {
    registerPlugins([
      makePlugin({ id: 'v-a', domainViews: [view('ghost', 'a', 10)] }),
    ])
    expect(collectDomainViews('ghost')).toEqual([])
  })

  it('keeps the first occurrence and warns on duplicate view id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    registerPlugins([
      makePlugin({ id: 'review', domain: domain('review') }),
      makePlugin({ id: 'v-1', domainViews: [view('review', 'dup', 10)] }),
      makePlugin({ id: 'v-2', domainViews: [view('review', 'dup', 20)] }),
    ])
    expect(collectDomainViews('review').map((v) => v.id)).toEqual(['dup'])
    expect(warn).toHaveBeenCalled()
  })

  it('reports which plugin contributed each view', () => {
    registerPlugins([
      makePlugin({ id: 'review', domain: domain('review') }),
      makePlugin({ id: 'v-a', domainViews: [view('review', 'a', 10)] }),
    ])
    expect(collectDomainViews('review')[0].pluginId).toBe('v-a')
  })
})
