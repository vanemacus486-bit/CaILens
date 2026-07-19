import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MobileLayout } from '../MobileLayout'

vi.mock('@/stores/categoryStore', () => ({ useCategoryStore: { getState: () => ({ loadCategories: vi.fn().mockResolvedValue(undefined) }) } }))
vi.mock('@/stores/settingsStore', () => ({
  useAppSettingsStore: { getState: () => ({ loadSettings: vi.fn().mockResolvedValue(undefined) }) },
}))
vi.mock('@/stores/profileStore', () => ({ useProfileStore: { getState: () => ({ loadProfile: vi.fn().mockResolvedValue(undefined) }) } }))
vi.mock('@/stores/todoStore', () => ({ useTodoStore: { getState: () => ({ loadTodos: vi.fn().mockResolvedValue(undefined) }) } }))
vi.mock('@/stores/todoListStore', () => ({ useTodoListStore: { getState: () => ({ loadLists: vi.fn().mockResolvedValue(undefined) }) } }))
vi.mock('@/stores/projectStore', () => ({ useProjectStore: { getState: () => ({ loadAll: vi.fn().mockResolvedValue(undefined) }) } }))
vi.mock('@/stores/locationStore', () => ({ useLocationStore: { getState: () => ({ loadLocation: vi.fn().mockResolvedValue(undefined), loadDayLocations: vi.fn().mockResolvedValue(undefined) }) } }))
vi.mock('../MobileEventEditor', () => ({
  MobileEventEditor: () => null,
}))
vi.mock('../useAndroidBackButton', () => ({
  useAndroidBackButton: vi.fn(),
}))

function renderLayout(initialEntry = '/day?date=2026-07-05') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<MobileLayout />}>
          <Route path="/day" element={<div>Day page</div>} />
          <Route path="/search" element={<div>Search page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('MobileLayout', () => {
  it('renders primary Android navigation and search entry', async () => {
    renderLayout()

    expect(screen.getByText('日历')).toBeInTheDocument()
    expect(screen.getByText('规划')).toBeInTheDocument()
    expect(screen.getByText('复盘')).toBeInTheDocument()
    expect(screen.getByText('档案')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '搜索' }))
    expect(screen.getByText('Search page')).toBeInTheDocument()
  })

  it('hides the global create button on the day page', () => {
    const { container } = renderLayout('/day?date=2026-07-05')

    expect(container.querySelector('button.fixed.right-5')).toBeNull()
  })

  it('shows the global create button outside the day page', () => {
    const { container } = renderLayout('/search')

    expect(container.querySelector('button.fixed.right-5')).toBeTruthy()
  })
})
