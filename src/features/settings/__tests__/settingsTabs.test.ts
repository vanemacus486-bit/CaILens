import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS_TAB } from '@/stores/uiStore'
import { SETTINGS_TABS, SETTINGS_TAB_GROUPS, resolveNavTab } from '../settingsTabs'

/**
 * 导航结构的一致性断言。
 *
 * 两个容易悄悄漂移的点：
 * 1. 「打开设置从第一个选项卡开始」——默认页签必须就是侧栏第一项。
 *    默认值在 uiStore，顺序在 settingsTabs，两处分开存放就会有人只改一边。
 * 2. 隐藏子页必须都能映射到某个可见项，否则打开设置后侧栏一片空白。
 */

describe('settingsTabs — 顺序与默认页签', () => {
  it('默认页签就是侧栏第一项', () => {
    expect(SETTINGS_TABS[0]?.key).toBe(DEFAULT_SETTINGS_TAB)
  })

  it('页签 key 不重复', () => {
    const keys = SETTINGS_TABS.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('每个页签的 group 都有对应的分组定义', () => {
    const groupIds = new Set(SETTINGS_TAB_GROUPS.map((g) => g.id))
    for (const tab of SETTINGS_TABS) expect(groupIds.has(tab.group)).toBe(true)
  })
})

describe('resolveNavTab — 隐藏子页映射', () => {
  it('可见页签映射到自身', () => {
    for (const tab of SETTINGS_TABS) expect(resolveNavTab(tab.key)).toBe(tab.key)
  })

  it('隐藏子页都落到侧栏里存在的页签上', () => {
    const visible = new Set(SETTINGS_TABS.map((t) => t.key))
    const hidden = ['account', 'data', 'storage', 'support', 'plugins'] as const
    for (const key of hidden) expect(visible.has(resolveNavTab(key))).toBe(true)
  })
})
