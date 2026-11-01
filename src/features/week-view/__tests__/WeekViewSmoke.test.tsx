import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WeekView } from '../WeekView'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

beforeAll(() => {
  if (!('ResizeObserver' in window)) {
    class RO { observe(): void {} unobserve(): void {} disconnect(): void {} }
    Object.defineProperty(window, 'ResizeObserver', { value: RO, writable: true })
  }
})

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ErrorBoundary title="这个页面出错了"><WeekView /></ErrorBoundary>
    </MemoryRouter>,
  )
}

describe('WeekView smoke', () => {
  it('week view', () => {
    renderAt('/week')
    expect(screen.queryByText('这个页面出错了')).toBeNull()
  })

  it('month view', () => {
    renderAt('/week?view=month')
    const err = screen.queryByText('这个页面出错了')
    if (err) {
      // 把 ErrorBoundary 吞掉的真实错误打出来
      throw new Error('month view crashed: ' + (err.parentElement?.textContent ?? ''))
    }
    expect(err).toBeNull()
  })
})
