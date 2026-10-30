import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickCaptureInbox } from '../QuickCaptureInbox'

// ── Seam: QuickCaptureInbox 的输入框 keydown ─────────────────
// 只测用户能观察到的行为：回车是否真的把待办存了下去。
// 不碰内部 state、不 mock zustand 的 selector 细节之外的东西。

const h = vi.hoisted(() => ({
  ui: { open: true, setOpen: vi.fn() },
  todo: { quickCapture: vi.fn(() => Promise.resolve()) },
}))

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (sel: (s: unknown) => unknown) =>
    sel({
      quickCaptureInboxOpen: h.ui.open,
      setQuickCaptureInboxOpen: h.ui.setOpen,
    }),
}))

vi.mock('@/stores/todoStore', () => ({
  useTodoStore: (sel: (s: unknown) => unknown) => sel({ quickCapture: h.todo.quickCapture }),
}))

vi.mock('@/lib/fireAndForget', () => ({ fireAndForget: (p: Promise<unknown>) => { void p } }))

function typeInto(text: string) {
  const input = screen.getByPlaceholderText('待办…')
  fireEvent.change(input, { target: { value: text } })
  return input
}

describe('QuickCaptureInbox — 输入法组合', () => {
  beforeEach(() => {
    h.ui.open = true
    h.ui.setOpen.mockClear()
    h.todo.quickCapture.mockClear()
  })

  it('拼音选词时按下的回车不保存半截拼音', () => {
    render(<QuickCaptureInbox />)
    const input = typeInto('xiedaima')

    // 模拟输入法组合中的回车：isComposing = true
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

    expect(h.todo.quickCapture).not.toHaveBeenCalled()
    expect(h.ui.setOpen).not.toHaveBeenCalled()
  })

  it('组合结束后的回车正常保存', () => {
    render(<QuickCaptureInbox />)
    const input = typeInto('写代码')

    fireEvent.keyDown(input, { key: 'Enter', isComposing: false })

    expect(h.todo.quickCapture).toHaveBeenCalledWith('写代码')
  })
})
