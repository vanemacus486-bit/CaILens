import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGlobalShortcut } from '../useGlobalShortcut'

describe('useGlobalShortcut', () => {
  it('fires handler when the key is pressed', () => {
    const handler = vi.fn()
    renderHook(() => useGlobalShortcut('n', handler))

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not fire when focus is inside an input element', () => {
    const handler = vi.fn()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    renderHook(() => useGlobalShortcut('n', handler))

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }))
    expect(handler).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('does not fire when enabled is false', () => {
    const handler = vi.fn()
    renderHook(() => useGlobalShortcut('n', handler, { enabled: false }))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }))
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not fire for key combinations with modifier keys', () => {
    const handler = vi.fn()
    renderHook(() => useGlobalShortcut('n', handler))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', metaKey: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', altKey: true }))
    expect(handler).not.toHaveBeenCalled()
  })
})
