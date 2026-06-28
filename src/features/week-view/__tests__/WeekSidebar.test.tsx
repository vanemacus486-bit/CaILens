import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WeekSidebar } from '../WeekSidebar'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import { startOfLocalDay } from '@/domain/habitPlan'

// WeekSidebar 现在自驱动（从 URL/Store 读取参数），需要 Router + mock 环境
vi.mock('@/hooks/useMediaQuery', () => ({
  useIsMobile: () => false,
}))

// ResizeObserver not available in jsdom – polyfill for SlideSegmented
globalThis.ResizeObserver = class {
  observe() { }
  unobserve() { }
  disconnect() { }
} as unknown as typeof ResizeObserver

// matchMedia not available in jsdom – polyfill for SlideSegmented
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

function renderSidebar(initialEntries = ['/week?week=2026-06-15']) {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <WeekSidebar />
    </MemoryRouter>,
  )
}

describe('WeekSidebar', () => {
  beforeEach(() => {
    // 重置 store 到干净状态（含语言）
    useAppSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, language: 'zh' } })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the mini-calendar for the active week month', () => {
    renderSidebar()
    expect(screen.getByText('2026年6月')).toBeTruthy()
    // day cells are rendered as clickable buttons
    expect(screen.getByRole('button', { name: '15' })).toBeTruthy()
  })

  it('browses months independently via the nav arrows', () => {
    renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: '上个月' }))
    expect(screen.getByText('2026年5月')).toBeTruthy()
  })

  describe('day marks', () => {
    const june20 = new Date(2026, 5, 20) // Sat 2026-06-20, visible in June grid
    const june20Ms = startOfLocalDay(june20.getTime())

    it('shows HandDrawnMarkRing on a marked day', () => {
      useAppSettingsStore.setState({
        settings: {
          ...DEFAULT_SETTINGS,
          language: 'zh',
          dayMarks: [
            {
              id: 'test-1',
              date: june20Ms,
              label: 'DDL',
              color: null,
              createdAt: june20Ms,
              updatedAt: june20Ms,
            },
          ],
        },
      })
      renderSidebar()
      // 20 号应该有一个 mark-ring svg
      const rings = screen.getAllByTestId('mark-ring')
      expect(rings.length).toBeGreaterThanOrEqual(1)
    })

    it('shows reminder list below calendar for today + future marks', () => {
      vi.spyOn(Date, 'now').mockReturnValue(
        new Date(2026, 5, 15).getTime(), // mock "now" as June 15
      )

      useAppSettingsStore.setState({
        settings: {
          ...DEFAULT_SETTINGS,
          language: 'zh',
          dayMarks: [
            {
              id: 'test-1',
              date: june20Ms,
              label: 'DDL',
              color: null,
              createdAt: june20Ms,
              updatedAt: june20Ms,
            },
          ],
        },
      })
      renderSidebar()
      // 提醒列表应显示 "DDL"
      expect(screen.getByText('DDL')).toBeTruthy()
      // 标题 "提醒" 应出现
      expect(screen.getByText('提醒')).toBeTruthy()
    })

    it('shows context menu with "标记此日…" on right-click unmarked day', () => {
      renderSidebar()
      // 右键 15 号（未标记）
      const dayBtn = screen.getByRole('button', { name: '15' })
      fireEvent.contextMenu(dayBtn)
      // 菜单项应包含「标记此日…」
      expect(screen.getByText('标记此日…')).toBeTruthy()
    })

    it('shows "编辑标记…" on right-click a marked day', () => {
      vi.spyOn(Date, 'now').mockReturnValue(
        new Date(2026, 5, 15).getTime(),
      )

      useAppSettingsStore.setState({
        settings: {
          ...DEFAULT_SETTINGS,
          language: 'zh',
          dayMarks: [
            {
              id: 'test-1',
              date: june20Ms,
              label: 'DDL',
              color: null,
              createdAt: june20Ms,
              updatedAt: june20Ms,
            },
          ],
        },
      })
      renderSidebar()
      const dayBtn = screen.getByRole('button', { name: '20' })
      fireEvent.contextMenu(dayBtn)
      expect(screen.getByText('编辑标记…')).toBeTruthy()
    })
  })
})
