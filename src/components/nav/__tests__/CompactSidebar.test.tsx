import { beforeEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CompactSidebar } from '../CompactSidebar'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { installBuiltinPlugins } from '@/plugins'

beforeEach(() => {
  installBuiltinPlugins()
  localStorage.clear()
})

/**
 * 回归：dayMarks 为 undefined 时，选择器若返回新 []，zustand 会认定状态持续变化，
 * 触发 "Maximum update depth exceeded"。这张卡是顶栏 ☰ 的悬停内容。
 */
describe('CompactSidebar', () => {
  it('renders with dayMarks undefined', () => {
    const errors: string[] = []
    const before = useAppSettingsStore.getState().settings
    useAppSettingsStore.setState({ settings: { ...before, dayMarks: undefined } })

    render(
      <MemoryRouter initialEntries={['/week']}>
        <ErrorBoundary compact onError={(e) => errors.push(`${e.name}: ${e.message}`)}>
          <CompactSidebar />
        </ErrorBoundary>
      </MemoryRouter>,
    )

    useAppSettingsStore.setState({ settings: before })
    expect(errors).toEqual([])
  })
})
