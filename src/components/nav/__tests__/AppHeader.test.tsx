import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppHeader } from '../AppHeader'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useUIStore } from '@/stores/uiStore'
import { installBuiltinPlugins } from '@/plugins'

beforeAll(() => { installBuiltinPlugins() })

beforeEach(() => {
  localStorage.clear()
  useUIStore.setState({ sidebarExpanded: false })
})

afterEach(() => { localStorage.clear() })

function renderHeader(path: string) {
  const errors: string[] = []
  render(
    <MemoryRouter initialEntries={[path]}>
      <ErrorBoundary compact onError={(e) => errors.push(`${e.name}: ${e.message}`)}>
        <AppHeader />
      </ErrorBoundary>
    </MemoryRouter>,
  )
  return errors
}

describe('AppHeader click paths', () => {
  it.each(['/week', '/action', '/stats'])('%s: every button is safe', (path) => {
    const errors = renderHeader(path)

    // 每轮重新查询：上一次点击可能改变 DOM，持有旧节点引用会点到已失效元素
    const count = screen.getAllByRole('button').length
    for (let i = 0; i < count; i++) {
      const buttons = screen.getAllByRole('button')
      if (i >= buttons.length) break
      fireEvent.click(buttons[i])
      expect(errors, `button[${i}] at ${path}`).toEqual([])
    }
  })

  it('sidebar toggle flips state without crashing', () => {
    const errors = renderHeader('/week')
    const toggle = screen.getByLabelText(/侧栏|sidebar/i)
    fireEvent.click(toggle)
    expect(useUIStore.getState().sidebarExpanded).toBe(true)
    expect(errors).toEqual([])
  })
})
