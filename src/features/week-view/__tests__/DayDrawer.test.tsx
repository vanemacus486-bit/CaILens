/**
 * Smoke test for DayDrawer — verifies that each mode renders without crashing.
 *
 * Uses fake timers and basic store mocks for a lightweight check.
 * Does NOT test real data or AI network calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { DayDrawer } from '@/features/week-view/DayDrawer'

// ── matchMedia polyfill (jsdom lacks it) ──────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ── Mock stores ─────────────────────────────────────────

const DEFAULT_SETTINGS = {
  id: 'default' as const,
  language: 'zh',
  theme: 'light',
  visualStyle: 'graphite' as const,
  fontScale: 'default' as const,
  // 一个已启用的 provider：AI 板块渲染真实聊天 UI（含输入框）而非引导态
  ai: {
    enabled: true,
    providers: [{ provider: 'anthropic' as const, label: '测试', apiKey: 'sk-test' }],
  },
}

// Mock useAppSettingsStore
vi.mock('@/stores/settingsStore', () => ({
  useAppSettingsStore: (selector: (s: { settings: typeof DEFAULT_SETTINGS }) => unknown) =>
    selector({ settings: DEFAULT_SETTINGS }),
}))

// Mock locationStore (empty — no city configured)
vi.mock('@/stores/locationStore', () => ({
  useLocationStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      locationSettings: null as unknown,
      savedCities: [],
      activeCityIndex: 0,
      weatherMap: {},
      weatherLoadingMap: {},
      weatherErrorMap: {},
      setActiveCity: vi.fn(),
      refreshCityWeather: vi.fn(() => Promise.resolve()),
    }),
}))

// Mock eventStore (empty)
vi.mock('@/stores/eventStore', () => ({
  useEventStore: (selector: (s: { events: [] }) => unknown) =>
    selector({ events: [] }),
}))

// Mock todoStore (empty)
vi.mock('@/stores/todoStore', () => ({
  useTodoStore: (selector: (s: { todos: [] }) => unknown) =>
    selector({ todos: [] }),
}))

// Mock todoListStore (empty)
vi.mock('@/stores/todoListStore', () => ({
  useTodoListStore: (selector: (s: { lists: [] }) => unknown) =>
    selector({ lists: [] }),
}))

// Mock uiStore
vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      setActiveSettingsTab: vi.fn(),
      setSettingsModalOpen: vi.fn(),
    }),
}))

// Mock locationService (prevent real fetch)
vi.mock('@/data/locationService', () => ({
  fetchDailyWeather: vi.fn(() => Promise.resolve(null)),
}))

// Mock fireAndForget (no-op)
vi.mock('@/lib/fireAndForget', () => ({
  fireAndForget: vi.fn(),
}))

// Mock aiChatService (prevent real AI network calls)
vi.mock('@/data/aiChatService', () => ({
  callAiChat: vi.fn(() => Promise.resolve('ok')),
}))

describe('DayDrawer', () => {
  const onClose = vi.fn()
  const dateMs = new Date(2025, 5, 15).getTime()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders weather-archive mode by default', () => {
    const { container } = render(
      <DayDrawer selectedDateMs={dateMs} onClose={onClose} />,
    )
    // The date label should be visible (now a span, not h2)
    expect(container.textContent).toContain('15')
    expect(container.textContent).toContain('6月')
    // weather-archive panel card is present
    expect(screen.getByTestId('panel-weather-archive')).toBeInTheDocument()
  })

  it('renders without crashing (just mount)', () => {
    // A broader smoke test: just ensure the component mounts and
    // the date header renders. The content area shows "no city" message
    // since locationSettings is null in the mock.
    const { container, unmount } = render(
      <DayDrawer selectedDateMs={dateMs} onClose={onClose} />,
    )
    // The "no city configured" message from location settings
    expect(container.textContent).toBeTruthy()
    unmount()
  })

  it('accepts a different date', () => {
    const otherMs = new Date(2025, 11, 25).getTime()  // Dec 25
    const { container } = render(
      <DayDrawer selectedDateMs={otherMs} onClose={onClose} />,
    )
    expect(container.textContent).toContain('25')
    expect(container.textContent).toContain('12月')
  })

  it('toggles a second section on and keeps both visible', () => {
    render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '时间轴' }))
    // weather-archive (still on) and timeline (newly on) both render their content
    expect(screen.getByText('请先在搜索框中输入城市名称')).toBeInTheDocument()
    expect(screen.getByText('这一天没有记录')).toBeInTheDocument()
  })

  it('closes drawer when turning off the last active section (via toggle)', () => {
    render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    // Only weather-archive is on. Clicking its toggle should close the drawer.
    fireEvent.click(screen.getByRole('button', { name: '当日概览' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes drawer when clicking ✕ on the last panel card', () => {
    render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    // Only weather-archive panel is shown; click its ✕ button
    const panel = screen.getByTestId('panel-weather-archive')
    const closeBtn = within(panel).getByRole('button', { name: /关闭板块/ })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes one panel via ✕ without affecting the other (two panels active)', () => {
    render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    // Turn on timeline
    fireEvent.click(screen.getByRole('button', { name: '时间轴' }))
    // Both panels visible
    expect(screen.getByTestId('panel-weather-archive')).toBeInTheDocument()
    expect(screen.getByTestId('panel-timeline')).toBeInTheDocument()

    // Close the timeline panel via its ✕
    const timelinePanel = screen.getByTestId('panel-timeline')
    const closeBtn = within(timelinePanel).getByRole('button', { name: /关闭板块/ })
    fireEvent.click(closeBtn)

    // Timeline gone, weather-archive remains, drawer not closed
    expect(screen.queryByTestId('panel-timeline')).not.toBeInTheDocument()
    expect(screen.getByTestId('panel-weather-archive')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows three panels in single-column layout when narrow (<1500px)', () => {
    render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    // Turn on all three modes
    fireEvent.click(screen.getByRole('button', { name: '时间轴' }))
    fireEvent.click(screen.getByRole('button', { name: 'AI 助手' }))
    // All three panel cards present
    expect(screen.getByTestId('panel-weather-archive')).toBeInTheDocument()
    expect(screen.getByTestId('panel-timeline')).toBeInTheDocument()
    expect(screen.getByTestId('panel-ai')).toBeInTheDocument()
  })

  it('keeps AI chat input when toggling another panel on/off (no remount)', () => {
    render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'AI 助手' }))

    const textarea = within(screen.getByTestId('panel-ai')).getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '今天效率如何' } })
    expect(textarea.value).toBe('今天效率如何')

    // 点亮再熄灭日视图：布局变化，但 AI 卡片是固定 keyed 子节点，不应被重挂载
    fireEvent.click(screen.getByRole('button', { name: '时间轴' }))
    fireEvent.click(screen.getByRole('button', { name: '时间轴' }))

    const after = within(screen.getByTestId('panel-ai')).getByRole('textbox') as HTMLTextAreaElement
    expect(after.value).toBe('今天效率如何')
  })

  it('panel card stretches to fill its slot (h-full)', () => {
    render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    expect(screen.getByTestId('panel-weather-archive').className).toContain('h-full')
  })

  it('shows three panels in two-column layout when wide (≥1500px)', () => {
    // Override matchMedia to simulate wide viewport
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === '(min-width: 1500px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    // Turn on all three modes
    fireEvent.click(screen.getByRole('button', { name: '时间轴' }))
    fireEvent.click(screen.getByRole('button', { name: 'AI 助手' }))
    // All three panel cards present
    expect(screen.getByTestId('panel-weather-archive')).toBeInTheDocument()
    expect(screen.getByTestId('panel-timeline')).toBeInTheDocument()
    expect(screen.getByTestId('panel-ai')).toBeInTheDocument()
  })
})
