import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Tauri window API + platform gate are mocked so the component can be exercised
// in jsdom (which is neither a Tauri desktop nor a native mobile shell).
const h = vi.hoisted(() => {
  const win = {
    minimize: vi.fn(() => Promise.resolve()),
    toggleMaximize: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    isMaximized: vi.fn(() => Promise.resolve(false)),
    onResized: vi.fn(() => Promise.resolve(() => {})),
  }
  return { win, state: { desktop: true } }
})

vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => h.win }))
vi.mock('@/lib/platform', () => ({
  isTauriDesktop: () => h.state.desktop,
  isNativeMobile: () => false,
}))

import { WindowControls } from '../WindowControls'

describe('WindowControls', () => {
  beforeEach(() => {
    h.state.desktop = true
    vi.clearAllMocks()
  })

  it('renders nothing outside a Tauri desktop window (web / mobile)', () => {
    h.state.desktop = false
    const { container } = render(<WindowControls />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByLabelText('关闭')).toBeNull()
  })

  it('renders 最小化 / 最大化 / 关闭 wired to the Tauri window API', () => {
    render(<WindowControls />)

    const min = screen.getByLabelText('最小化')
    const max = screen.getByLabelText('最大化')
    const close = screen.getByLabelText('关闭')
    expect(min).toBeTruthy()
    expect(max).toBeTruthy()
    expect(close).toBeTruthy()

    fireEvent.click(min)
    fireEvent.click(max)
    fireEvent.click(close)

    expect(h.win.minimize).toHaveBeenCalledTimes(1)
    expect(h.win.toggleMaximize).toHaveBeenCalledTimes(1)
    expect(h.win.close).toHaveBeenCalledTimes(1)
  })

  it('swaps to the 还原 (restore) affordance when the window is maximized', async () => {
    h.win.isMaximized.mockReturnValueOnce(Promise.resolve(true))
    render(<WindowControls />)
    expect(await screen.findByLabelText('还原')).toBeTruthy()
  })
})
