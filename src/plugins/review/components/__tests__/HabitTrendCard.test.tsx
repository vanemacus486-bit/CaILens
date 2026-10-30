import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

import { HabitTrendCard } from '../HabitTrendCard'

describe('HabitTrendCard', () => {
  it('renders without crashing with default store state', () => {
    // HabitTrendCard reads from useAppSettingsStore and useEventStore;
    // default initial state is empty — should render gracefully.
    const { container } = render(<HabitTrendCard />)
    expect(container).toBeTruthy()
  })
})
