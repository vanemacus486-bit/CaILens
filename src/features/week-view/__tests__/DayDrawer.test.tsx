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

// Mock categoryStore (default categories)
vi.mock('@/stores/categoryStore', () => ({
  useCategoryStore: (selector: (s: { categories: { id: string; name: string; color: string; weeklyBudget: number; folders: unknown[] }[] }) => unknown) =>
    selector({
      categories: [
        { id: 'accent', name: '主要矛盾', color: 'accent', weeklyBudget: 20, folders: [] },
        { id: 'sage', name: '次要矛盾', color: 'sage', weeklyBudget: 10, folders: [] },
      ],
    }),
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

// Mock aiChatStore (no persistence in smoke test)
vi.mock('@/stores/aiChatStore', () => ({
  useAiChatStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      loadDay: vi.fn(() => Promise.resolve(undefined)),
      appendMessage: vi.fn(() => Promise.resolve(undefined)),
      clearDay: vi.fn(() => Promise.resolve()),
    }),
}))

// Mock fireAndForget (no-op)
vi.mock('@/lib/fireAndForget', () => ({
  fireAndForget: vi.fn(),
}))

// Mock aiChatService (prevent real AI network calls)
vi.mock('@/data/aiChatService', () => ({
  callAiChat: vi.fn(() => Promise.resolve('ok')),
  streamAiChat: vi.fn(() => Promise.resolve()),
}))

describe('DayDrawer', () => {
  const onClose = vi.fn()
  const dateMs = new Date(2025, 5, 15).getTime()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders only the AI panel by default', () => {
    render(
      <DayDrawer selectedDateMs={dateMs} onClose={onClose} />,
    )
    expect(screen.getByTestId('panel-ai')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '当日概览' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '时间轴' })).not.toBeInTheDocument()
  })

  it('closes the drawer from the AI panel header', () => {
    render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    const panel = screen.getByTestId('panel-ai')
    const closeBtn = within(panel).getByRole('button', { name: '关闭' })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('resets AI chat state when the selected day changes', () => {
    const { rerender } = render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    const textarea = within(screen.getByTestId('panel-ai')).getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '今天效率如何' } })
    expect(textarea.value).toBe('今天效率如何')

    rerender(<DayDrawer selectedDateMs={new Date(2025, 5, 16).getTime()} onClose={onClose} />)
    const after = within(screen.getByTestId('panel-ai')).getByRole('textbox') as HTMLTextAreaElement
    expect(after.value).toBe('')
  })

  it('AI panel stretches to fill the drawer', () => {
    render(<DayDrawer selectedDateMs={dateMs} onClose={onClose} />)
    expect(screen.getByTestId('day-drawer').className).toContain('flex-shrink-0')
    expect(screen.getByTestId('day-drawer').className).not.toContain('absolute')
    expect(screen.getByTestId('panel-ai').className).toContain('flex-1')
  })
})
