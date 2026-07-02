import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

import { ChronicleTimeline } from '../ChronicleTimeline'

describe('ChronicleTimeline', () => {
  it('renders without crashing with empty chronicle store', () => {
    // ChronicleTimeline reads from useChronicleStore; default initial state is empty
    const { container } = render(<ChronicleTimeline mode="month" />)
    expect(container).toBeTruthy()
  })
})
