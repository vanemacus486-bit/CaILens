import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { EventBlock, colSpan } from '../EventBlock'
import type { PositionedEvent } from '@/domain/layout'
import type { CalendarEvent } from '@/domain/event'
import { MAX_OVERLAP_COLUMNS } from '@/features/week-view/constants'

// ── ResizeObserver mock (jsdom does not provide one) ──────────

let mockBlockHeight = 30
let mockBlockWidth = 80

beforeEach(() => {
  mockBlockHeight = 30
  mockBlockWidth = 80
  globalThis.ResizeObserver = class implements ResizeObserver {
    private callback: ResizeObserverCallback

    constructor(cb: ResizeObserverCallback) {
      this.callback = cb
    }

    observe(target: Element): void {
      // Fire synchronously so setBlockH is called before assertions
      const entry = {
        contentBoxSize: [{ blockSize: mockBlockHeight, inlineSize: mockBlockWidth }],
        contentRect: { height: mockBlockHeight, width: mockBlockWidth } as DOMRectReadOnly,
        target,
        borderBoxSize: [],
        devicePixelContentBoxSize: [],
      } as unknown as ResizeObserverEntry
      this.callback([entry], this)
    }
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
})

afterEach(() => {
  delete (globalThis as Record<string, unknown>).ResizeObserver
})

// ── Helpers ─────────────────────────────────────────────────

function makeEvent(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: '测试事件',
    startTime: new Date(2026, 3, 20, 9, 0).getTime(),
    endTime:   new Date(2026, 3, 20, 9, 15).getTime(),
    color: 'accent',
    categoryId: 'accent',
    createdAt: 0,
    updatedAt: 0,
    ...over,
  }
}

function makePositioned(over: Partial<PositionedEvent> = {}): PositionedEvent {
  return {
    event: makeEvent(),
    rowStart: 37,
    rowEnd: 38,
    columnIndex: 0,
    totalColumns: 1,
    startsBeforeDay: false,
    endsAfterDay: false,
    ...over,
  }
}

const noop = vi.fn()
const gridRef = { current: document.createElement('div') } as React.RefObject<HTMLElement | null>

function renderBlock(positioned: PositionedEvent, overrides: Partial<Parameters<typeof EventBlock>[0]> = {}) {
  return render(
    <EventBlock
      positioned={positioned}
      columnDate={new Date(2026, 3, 20)}
      onClick={noop}
      onColorChange={noop}
      onEdit={noop}
      onDuplicate={noop}
      onDelete={noop}
      onDragMove={noop}
      onDragToEdge={noop}
      onDragStart={noop}
      onResize={noop}
      weekDays={[]}
      gridRef={gridRef}
      {...overrides}
    />,
  )
}

// ── Tests ────────────────────────────────────────────────────

describe('colSpan', () => {
  it('returns full width for single-column layout', () => {
    const result = colSpan(0, 1)
    expect(result.gridColumnStart).toBe(1)
    expect(result.gridColumnEnd).toBe(MAX_OVERLAP_COLUMNS + 1)
  })

  it('splits columns evenly for 2-column layout', () => {
    const result = colSpan(0, 2)
    expect(result.gridColumnStart).toBe(1)
    expect(result.gridColumnEnd).toBe(4)  // ceil(6/2)=3 col per event → end at 4
  })
})

describe('EventBlock — short events', () => {
  it('renders title for a 15-minute event', () => {
    const positioned = makePositioned()
    renderBlock(positioned)
    expect(screen.getByText('测试事件')).toBeTruthy()
  })

  it('style includes min-height of 22px', () => {
    const positioned = makePositioned()
    const { container } = renderBlock(positioned)
    const block = container.querySelector('[data-event-id="e1"]') as HTMLElement | null
    expect(block).not.toBeNull()
    expect(block!.style.minHeight).toBe('22px')
  })

  it('shows time row when measured height ≥ 40px', async () => {
    mockBlockHeight = 45
    mockBlockWidth = 160
    const positioned = makePositioned()
    renderBlock(positioned)
    // Await the re-render triggered by ResizeObserver.
    await waitFor(() => {
      expect(screen.getByText(/09:00.*09:15/)).toBeTruthy()
    })
  })

  it('uses start time only in a very narrow full block', async () => {
    mockBlockHeight = 45
    mockBlockWidth = 72
    renderBlock(makePositioned())
    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeTruthy()
    })
    expect(screen.queryByText(/09:00.*09:15/)).toBeNull()
  })

  it('renders title-only for very short (unmeasured) blocks', () => {
    mockBlockHeight = 0
    const positioned = makePositioned({
      event: makeEvent({ title: '短事件' }),
    })
    renderBlock(positioned)
    expect(screen.getByText('短事件')).toBeTruthy()
  })

  it('prioritizes the title over time in a narrow compact block', async () => {
    mockBlockHeight = 32
    mockBlockWidth = 96
    renderBlock(makePositioned())
    await waitFor(() => {
      expect(screen.queryByText(/09:00.*09:15/)).toBeNull()
    })
  })

  it('shows compact time when the block is wide enough', async () => {
    mockBlockHeight = 32
    mockBlockWidth = 160
    renderBlock(makePositioned())
    await waitFor(() => {
      expect(screen.getByText(/09:00.*09:15/)).toBeTruthy()
    })
  })
})

describe('EventBlock — dense weeks', () => {
  it('keeps the visual block proportional while exposing a dense hit target', () => {
    const { container } = renderBlock(makePositioned(), { densityMode: 'dense' })
    const block = container.querySelector('[data-event-id="e1"]') as HTMLElement
    expect(block.dataset.density).toBe('dense')
    expect(block.style.minHeight).toBe('2px')
  })

  it('attenuates sleep events and preserves keyboard activation', () => {
    const onClick = vi.fn()
    const positioned = makePositioned({
      event: makeEvent({
        color: 'stone',
        categoryId: 'stone',
        typedData: {
          type: 'sleep',
          sleepType: 'main',
          bedtime: new Date(2026, 3, 20, 0, 0).getTime(),
          wakeTime: new Date(2026, 3, 20, 8, 0).getTime(),
        },
      }),
    })
    const { container } = renderBlock(positioned, { densityMode: 'dense', onClick })
    const block = container.querySelector('[data-event-id="e1"]') as HTMLElement
    expect(block.dataset.sleep).toBe('true')
    expect(block.style.backgroundColor).toContain('64%')
    block.focus()
    block.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onClick).toHaveBeenCalledWith(positioned.event, block)
  })
})
