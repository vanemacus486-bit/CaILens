import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useWeekFromURL } from '../useWeekFromURL'
import { isSameDay } from '@/domain/time'

function wrapper(initialUrl: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  }
}

// April 20 2026 is a Monday.
// April 22 2026 is a Wednesday.

describe('useWeekFromURL', () => {
  describe('URL parsing', () => {
    it('parses a valid week param and returns that Monday', () => {
      const { result } = renderHook(() => useWeekFromURL(), {
        wrapper: wrapper('/?week=2026-04-20'),
      })
      const { weekStart } = result.current
      expect(weekStart.getFullYear()).toBe(2026)
      expect(weekStart.getMonth()).toBe(3)   // April (0-indexed)
      expect(weekStart.getDate()).toBe(20)
      expect(weekStart.getHours()).toBe(0)
      expect(weekStart.getMinutes()).toBe(0)
    })

    it('normalises a non-Monday date to the preceding Monday', () => {
      // Wednesday April 22 → should resolve to Monday April 20
      const { result } = renderHook(() => useWeekFromURL(), {
        wrapper: wrapper('/?week=2026-04-22'),
      })
      expect(result.current.weekStart.getDate()).toBe(20)
      expect(result.current.weekStart.getDay()).toBe(1) // 1 = Monday
    })

    it('normalises a Sunday to the preceding Monday (weekStartsOn: 1)', () => {
      // Sunday April 19 → Monday April 13
      const { result } = renderHook(() => useWeekFromURL(), {
        wrapper: wrapper('/?week=2026-04-19'),
      })
      expect(result.current.weekStart.getDate()).toBe(13)
    })
  })

  describe('fallback behaviour', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // Fix "now" to Wednesday April 22 2026, so current week Monday = April 20.
      vi.setSystemTime(new Date(2026, 3, 22, 9, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('falls back to current week when week param is absent', () => {
      const { result } = renderHook(() => useWeekFromURL(), {
        wrapper: wrapper('/'),
      })
      // Current week Monday (with clock set to April 22) = April 20.
      expect(isSameDay(result.current.weekStart, new Date(2026, 3, 20))).toBe(true)
    })

    it('falls back to current week when week param is invalid', () => {
      const { result } = renderHook(() => useWeekFromURL(), {
        wrapper: wrapper('/?week=not-a-date'),
      })
      expect(isSameDay(result.current.weekStart, new Date(2026, 3, 20))).toBe(true)
    })

    it('falls back to current week when week param is empty string', () => {
      const { result } = renderHook(() => useWeekFromURL(), {
        wrapper: wrapper('/?week='),
      })
      expect(isSameDay(result.current.weekStart, new Date(2026, 3, 20))).toBe(true)
    })
  })
})
