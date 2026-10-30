import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FloatingEventCard } from '../FloatingEventCard'

// ── Seam: FloatingEventCard 的保存后行为 ───────────────────
// 连续补记是这条功能的核心：存完不能关、不能留旧标题、时间要往前推。
// 只断言用户看得见的结果，不碰内部 state 名字。

function makeAnchor(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

vi.mock('@/stores/categoryStore', () => ({
  useCategoryStore: (sel: (s: unknown) => unknown) =>
    sel({
      categories: [
        { id: 'accent', name: '主要矛盾', color: 'accent', weeklyBudget: 20, folders: [] },
        { id: 'sand', name: '庶务时间', color: 'sand', weeklyBudget: 5, folders: [] },
      ],
    }),
}))

vi.mock('@/stores/settingsStore', () => ({
  useAppSettingsStore: (sel: (s: unknown) => unknown) => sel({ settings: {} }),
}))

vi.mock('@/data/getRepositories', () => ({
  getEventRepo: () => ({ search: () => Promise.resolve([]) }),
}))

vi.mock('@/hooks/useMediaQuery', () => ({ useIsMobile: () => false }))

function setup() {
  const onClose = vi.fn()
  const onSave = vi.fn().mockResolvedValue('new-id')
  const onUpdate = vi.fn().mockResolvedValue(undefined)
  const onDelete = vi.fn().mockResolvedValue(undefined)
  const onContinue = vi.fn()
  const start = new Date(2026, 5, 22, 14, 20).getTime()
  const end = new Date(2026, 5, 22, 15, 0).getTime()

  render(
    <FloatingEventCard
      open
      anchorEl={makeAnchor()}
      defaultTimes={{ start, end }}
      onClose={onClose}
      onSave={onSave}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onContinue={onContinue}
    />,
  )
  return { onClose, onSave, onContinue, start, end }
}

describe('FloatingEventCard — 连续补记', () => {
  beforeEach(() => {
    try { localStorage.clear() } catch { /* jsdom */ }
  })

  it('存完后卡片不关闭，标题清空，光标留在输入框', async () => {
    const { onClose, onSave } = setup()
    const input = screen.getByPlaceholderText('这段时间在做什么？')

    fireEvent.change(input, { target: { value: '写代码' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(input).toHaveValue(''))
    expect(document.activeElement).toBe(input)
  })

  it('存完后给出「已存」回执，带上刚存下的标题', async () => {
    setup()
    const input = screen.getByPlaceholderText('这段时间在做什么？')
    fireEvent.change(input, { target: { value: '写代码' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByText(/已存.*写代码/)).toBeTruthy()
  })

  it('存完后时间区间推进到本条结束 → 现在，而不是沿用本条时长', async () => {
    const { onContinue, end } = setup()
    const input = screen.getByPlaceholderText('这段时间在做什么？')
    fireEvent.change(input, { target: { value: '写代码' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1))
    const [nextStart, nextEnd] = onContinue.mock.calls[0]
    expect(nextStart).toBe(end)
    // 时间推进到「现在」，不是 end + 40 分钟
    expect(nextEnd).toBeGreaterThan(nextStart)
    expect(nextEnd - nextStart).toBeLessThanOrEqual(15 * 60_000)
  })
})
