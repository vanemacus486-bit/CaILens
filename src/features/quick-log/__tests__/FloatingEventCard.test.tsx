import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FloatingEventCard } from '../FloatingEventCard'
import type { CalendarEvent } from '@/domain/event'

// ── Helpers ─────────────────────────────────────────────

function makeAnchor(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function makeEvent(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: '写代码',
    startTime: new Date(2026, 5, 22, 9, 0).getTime(),
    endTime: new Date(2026, 5, 22, 9, 30).getTime(),
    color: 'accent',
    categoryId: 'accent',
    createdAt: 0,
    updatedAt: 0,
    ...over,
  }
}

function renderCard(over: Partial<Parameters<typeof FloatingEventCard>[0]> = {}) {
  const onClose = vi.fn()
  const onSave = vi.fn<Parameters<typeof FloatingEventCard>[0]['onSave']>().mockResolvedValue('new-id')
  const onUpdate = vi.fn().mockResolvedValue(undefined)
  const onDelete = vi.fn().mockResolvedValue(undefined)
  const onContinue = vi.fn()
  const start = new Date(2026, 5, 22, 10, 0).getTime()
  const end = new Date(2026, 5, 22, 10, 30).getTime()
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
      {...over}
    />,
  )
  return { onClose, onSave, onUpdate, onDelete, onContinue, start, end }
}

// ── Tests ───────────────────────────────────────────────

describe('FloatingEventCard', () => {
  beforeEach(() => {
    try { localStorage.clear() } catch { /* jsdom always has it */ }
  })

  it('新建模式真的画出：输入框 + 6 个分类点 + 记录/继续按钮', () => {
    renderCard()
    expect(screen.getByPlaceholderText('这段时间在做什么？')).toBeTruthy()
    // 6 个分类点，title 形如「… · ⌥1」～「… · ⌥6」
    expect(screen.getAllByTitle(/⌥[1-6]/)).toHaveLength(6)
    // 默认分类 accent(⌥1) 高亮
    expect(screen.getByTitle(/⌥1/).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /继续/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: '记录' })).toBeTruthy()
  })

  it('点击分类点切换高亮：aria-pressed 跟随', () => {
    renderCard()
    const dot2 = screen.getByTitle(/⌥2/)
    fireEvent.click(dot2)
    expect(dot2.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTitle(/⌥1/).getAttribute('aria-pressed')).toBe('false')
  })

  it('点「继续」：保存后 onContinue 接力——开始=上条结束、时长沿用', async () => {
    const { onSave, onContinue, end } = renderCard()
    fireEvent.click(screen.getByRole('button', { name: /继续/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1))
    const [nextStart, nextEnd, color] = onContinue.mock.calls[0]
    expect(nextStart).toBe(end)                    // 接力：下一条开始 = 上一条结束
    expect(nextEnd - nextStart).toBe(30 * 60_000)  // 时长沿用 30 分钟
    expect(color).toBe('accent')
  })

  it('编辑模式：不出现「继续」，出现「删除」', () => {
    renderCard({ editingEvent: makeEvent() })
    expect(screen.queryByRole('button', { name: /继续/ })).toBeNull()
    expect(screen.getByRole('button', { name: '删除' })).toBeTruthy()
  })
})
