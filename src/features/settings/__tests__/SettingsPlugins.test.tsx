import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { PluginDefinition } from '@/plugins/types'

/**
 * 插件市场 UI 的行为测试。
 *
 * seam 是「渲染出来的界面」：用户能看见什么、点开关会发生什么。
 * 不测内部 state、不测 useMemo 依赖——那些改了不该让测试变红。
 *
 * store 用可控替身：组件只读 `settings.enabledPlugins` 并调 `setPluginEnabled`，
 * 没必要为了这两件事把 Dexie 拉起来。
 */

const storeState: {
  settings: { enabledPlugins?: Record<string, boolean> }
  setPluginEnabled: (id: string, enabled: boolean) => Promise<void>
} = {
  settings: { enabledPlugins: {} },
  setPluginEnabled: () => Promise.resolve(),
}

vi.mock('@/stores/settingsStore', () => ({
  useAppSettingsStore: (selector: (s: typeof storeState) => unknown) => selector(storeState),
}))

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
  plugin({ id: 'alpha', name: '补记模式', description: '表格式批量补录', defaultEnabled: true }),
  plugin({ id: 'beta', name: '编年史', description: '长期记录与回顾', defaultEnabled: false }),
  plugin({ id: 'gamma', name: '灵感箱', description: '收集零散想法', defaultEnabled: true }),
]

let registry: typeof import('@/plugins/registry')

beforeEach(async () => {
  registry = await import('@/plugins/registry')
  registry._resetRegistry()
  registry.registerPlugins(FIXTURES)
  storeState.settings = { enabledPlugins: {} }
  storeState.setPluginEnabled = vi.fn(() => Promise.resolve())
})

afterEach(() => {
  registry._resetRegistry()
})

async function renderPage() {
  const { SettingsPlugins } = await import('../SettingsPlugins')
  return render(<SettingsPlugins />)
}

describe('SettingsPlugins — 列表与开关', () => {
  it('列出全部插件的名称与版本', async () => {
    await renderPage()
    expect(screen.getByText('补记模式')).toBeTruthy()
    expect(screen.getByText('编年史')).toBeTruthy()
    expect(screen.getByText('灵感箱')).toBeTruthy()
    expect(screen.getAllByText('v1.0.0')).toHaveLength(3)
  })

  it('启用状态反映 defaultEnabled', async () => {
    await renderPage()
    const switches = screen.getAllByRole('switch')
    expect(switches.map((el) => el.getAttribute('aria-checked'))).toEqual(['true', 'false', 'true'])
  })

  it('override 覆盖 defaultEnabled', async () => {
    storeState.settings = { enabledPlugins: { alpha: false, beta: true } }
    await renderPage()
    const switches = screen.getAllByRole('switch')
    expect(switches.map((el) => el.getAttribute('aria-checked'))).toEqual(['false', 'true', 'true'])
  })

  it('点击开关调用 setPluginEnabled，参数是插件 id 与取反后的值', async () => {
    await renderPage()
    const betaSwitch = screen.getAllByRole('switch')[1]
    fireEvent.click(betaSwitch)
    expect(storeState.setPluginEnabled).toHaveBeenCalledWith('beta', true)
  })

  it('卡片显示声明的表名', async () => {
    registry._resetRegistry()
    registry.registerPlugin(plugin({ id: 'with-tables', name: '有表插件', tables: ['chronicles'] }))
    await renderPage()
    expect(screen.getByText(/chronicles/)).toBeTruthy()
  })
})

describe('SettingsPlugins — 搜索与筛选', () => {
  it('搜索框过滤名称', async () => {
    await renderPage()
    fireEvent.change(screen.getByLabelText('搜索插件'), { target: { value: '编年' } })
    expect(screen.queryByText('补记模式')).toBeNull()
    expect(screen.getByText('编年史')).toBeTruthy()
  })

  it('搜索匹配描述', async () => {
    await renderPage()
    fireEvent.change(screen.getByLabelText('搜索插件'), { target: { value: '想法' } })
    expect(screen.getByText('灵感箱')).toBeTruthy()
    expect(screen.queryByText('编年史')).toBeNull()
  })

  it('筛选「已启用」只留启用的插件', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('radio', { name: '已启用' }))
    expect(screen.queryByText('编年史')).toBeNull()
    expect(screen.getByText('补记模式')).toBeTruthy()
    expect(screen.getByText('灵感箱')).toBeTruthy()
  })

  it('筛选「已停用」只留停用的插件', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('radio', { name: '已停用' }))
    expect(screen.getByText('编年史')).toBeTruthy()
    expect(screen.queryByText('补记模式')).toBeNull()
  })

  it('搜索无结果时给出空态提示', async () => {
    await renderPage()
    fireEvent.change(screen.getByLabelText('搜索插件'), { target: { value: '不存在的插件' } })
    expect(screen.getByText('没有匹配的插件')).toBeTruthy()
  })

  it('计数条显示总数与启用数', async () => {
    await renderPage()
    const counts = screen.getByTestId('plugin-counts')
    expect(within(counts).getByText('3')).toBeTruthy()
    expect(within(counts).getByText('2')).toBeTruthy()
  })
})

describe('SettingsPlugins — 核心 / 第三方分组', () => {
  it('两组标题都渲染，默认插件全落在核心插件组', async () => {
    await renderPage()
    const core = screen.getByTestId('plugin-group-core')
    const thirdParty = screen.getByTestId('plugin-group-third-party')

    expect(within(core).getByText('补记模式')).toBeTruthy()
    expect(within(core).getByText('编年史')).toBeTruthy()
    expect(within(core).getByText('灵感箱')).toBeTruthy()
    expect(within(thirdParty).queryByText('补记模式')).toBeNull()
  })

  it('第三方插件组为空时给出「暂未支持」说明，而不是整组消失', async () => {
    await renderPage()
    const thirdParty = screen.getByTestId('plugin-group-third-party')
    expect(within(thirdParty).getByText('第三方插件')).toBeTruthy()
    expect(within(thirdParty).getByText(/暂未支持第三方插件/)).toBeTruthy()
  })

  it('声明 origin=third-party 的插件渲染在第三方插件组下', async () => {
    registry._resetRegistry()
    registry.registerPlugins([
      plugin({ id: 'core-one', name: '核心甲' }),
      plugin({ id: 'ext-one', name: '外部乙', origin: 'third-party' }),
    ])
    await renderPage()

    const core = screen.getByTestId('plugin-group-core')
    const thirdParty = screen.getByTestId('plugin-group-third-party')
    expect(within(core).getByText('核心甲')).toBeTruthy()
    expect(within(thirdParty).getByText('外部乙')).toBeTruthy()
    expect(within(core).queryByText('外部乙')).toBeNull()
  })

  it('有筛选条件时空组提示改成「没有匹配的插件」，不再说「暂未支持」', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('radio', { name: '已停用' }))
    const thirdParty = screen.getByTestId('plugin-group-third-party')
    expect(within(thirdParty).getByText('没有匹配的插件')).toBeTruthy()
    expect(within(thirdParty).queryByText(/暂未支持第三方插件/)).toBeNull()
  })

  it('筛选后某组为空，组头保留但不再显示该组插件', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('radio', { name: '已停用' }))
    const core = screen.getByTestId('plugin-group-core')
    expect(within(core).getByText('编年史')).toBeTruthy()
    expect(within(core).queryByText('补记模式')).toBeNull()
    expect(screen.getByTestId('plugin-group-third-party')).toBeTruthy()
  })
})
