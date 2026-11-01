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
    // 6 个分类点，title 形如「… · Alt+1」～「… · Alt+6」
    expect(screen.getAllByTitle(/Alt\+[1-6]/)).toHaveLength(6)
    // 默认分类 accent(Alt+1) 高亮
    expect(screen.getByTitle(/Alt\+1/).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /继续/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: '记录' })).toBeTruthy()
  })

  it('点击分类点切换高亮：aria-pressed 跟随', () => {
    renderCard()
    const dot2 = screen.getByTitle(/Alt\+2/)
    fireEvent.click(dot2)
    expect(dot2.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTitle(/Alt\+1/).getAttribute('aria-pressed')).toBe('false')
  })

  it('输入框内可直接切换到只记录食物的饮食模式', () => {
    renderCard()

    fireEvent.click(screen.getByRole('button', { name: '记录吃了什么' }))

    expect(screen.getByPlaceholderText('牛肉面、鸡蛋、青菜')).toBeTruthy()
    expect(screen.getByText('记下这一顿')).toBeTruthy()
    expect(screen.queryAllByTitle(/Alt\+[1-6]/)).toHaveLength(0)
    expect(screen.getByRole('button', { name: '记下' })).toBeTruthy()
  })

  it('“午餐 + 食物”可在普通输入框中一次保存为饮食记录', async () => {
    const { onSave } = renderCard()
    const input = screen.getByPlaceholderText('这段时间在做什么？')

    fireEvent.change(input, { target: { value: '午餐 牛肉面' } })
    fireEvent.click(screen.getByRole('button', { name: '记录' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: '牛肉面',
      color: 'sand',
      categoryId: 'sand',
      typedKey: 'meal',
      typedData: expect.objectContaining({
        type: 'meal',
        mealOrder: 'lunch',
      }),
    }))
  })

  it('点「继续」：保存后 onContinue 接力——开始=上条结束、终点取现在', async () => {
    const { onSave, onContinue, end } = renderCard()
    fireEvent.click(screen.getByRole('button', { name: /继续/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1))
    const [nextStart, nextEnd, color] = onContinue.mock.calls[0]
    expect(nextStart).toBe(end)                     // 接力：下一条开始 = 上一条结束
    expect(nextEnd).toBeGreaterThan(nextStart)      // 终点推进到「现在」，不再沿用上一条时长
    expect(color).toBe('accent')
  })

  it('编辑模式：不出现「继续」，出现「删除」', () => {
    renderCard({ editingEvent: makeEvent() })
    expect(screen.queryByRole('button', { name: /继续/ })).toBeNull()
    expect(screen.getByRole('button', { name: '删除' })).toBeTruthy()
  })

  it('编辑饮食标题时保留原有餐次、来源和标签', async () => {
    const editingEvent = makeEvent({
      title: '鸡蛋',
      typedKey: 'meal',
      typedData: {
        type: 'meal',
        mealOrder: 'breakfast',
        source: 'takeout',
        foodTags: ['protein'],
      },
    })
    const { onUpdate } = renderCard({ editingEvent })

    fireEvent.change(screen.getByDisplayValue('鸡蛋'), { target: { value: '鸡蛋三明治' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      id: editingEvent.id,
      title: '鸡蛋三明治',
      color: 'sand',
      categoryId: 'sand',
      typedData: {
        type: 'meal',
        mealOrder: 'breakfast',
        source: 'takeout',
        foodTags: ['protein'],
      },
    }))
  })

  // ── 输入即事件块：一句话里的时间直接变成块的起止 ──

  it('输入「9:00-10:30 写代码」按 Enter → 存成 9:00–10:30 的事件块', async () => {
    const { onSave } = renderCard()
    const input = screen.getByPlaceholderText('这段时间在做什么？')

    fireEvent.change(input, { target: { value: '9:00-10:30 写代码' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.title).toBe('写代码')
    expect(saved.startTime).toBe(new Date(2026, 5, 22, 9, 0).getTime())
    expect(saved.endTime).toBe(new Date(2026, 5, 22, 10, 30).getTime())
  })

  it('输入「写代码 45分钟」按 Enter → 从当前起点推 45 分钟，标题不含时长', async () => {
    const { onSave, start } = renderCard()
    const input = screen.getByPlaceholderText('这段时间在做什么？')

    fireEvent.change(input, { target: { value: '写代码 45分钟' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.title).toBe('写代码')
    expect(saved.startTime).toBe(start)
    expect(saved.endTime).toBe(start + 45 * 60_000)
  })

  it('输入里带时间时，卡片头部实时显示解析出的区间', () => {
    renderCard()
    const input = screen.getByPlaceholderText('这段时间在做什么？')

    fireEvent.change(input, { target: { value: '9:00-10:30 写代码' } })

    // 头部时间条从默认的 10:00 – 10:30 变成 09:00 – 10:30
    const header = screen.getByText(/6月22日 09:00/)
    expect(header.textContent).toContain('09:00')
    expect(header.textContent).toContain('10:30')
    expect(header.textContent).not.toContain('10:00')
  })

  // ── 纸皮肤（A 版）的视觉契约 ──────────────────────────
  // 这三条不是实现细节：换回圆角浮层、把分类名做成胶囊、
  // 把分类点塞回方块按钮里，用户一眼就看出来不是那版了。

  it('卡片是纸：容器带 data-skin="paper"，不是圆角浮层', () => {
    renderCard()
    const card = document.querySelector('[data-skin="paper"]') as HTMLElement
    expect(card).toBeTruthy()
    expect(card.className).not.toMatch(/\brounded-xl\b/)
  })

  it('头部时间不做成胶囊，分类名是纯文字', () => {
    renderCard()
    const head = document.querySelector('[data-card-head="paper"]') as HTMLElement
    expect(head).toBeTruthy()
    // 分类名是裸文字，不再套一层带边框的圆胶囊
    const cat = head.querySelector('[data-card-cat]') as HTMLElement
    expect(cat).toBeTruthy()
    expect(cat.className).not.toMatch(/rounded-full/)
    expect(cat.className).not.toMatch(/\bborder\b(?!-)/)
  })

  it('分类点是裸圆点，不放在方块按钮边框里', () => {
    renderCard()
    const dots = document.querySelector('[data-card-dots="paper"]') as HTMLElement
    expect(dots).toBeTruthy()
    const first = dots.querySelector('button') as HTMLElement
    expect(first.className).not.toMatch(/\bh-8\b/)
    expect(first.className).not.toMatch(/\brounded-lg\b/)
  })

  // ── 纸的强调色必须来自当前分类 ─────────────────────────
  // 写死一个苔绿就等于「不管你在记什么，纸都长一个样」，
  // 而分类色是 CaILens 里最强的语义信号。

  it('纸的强调色跟随分类：默认 accent，切到次要矛盾变 sage', () => {
    renderCard()
    const card = document.querySelector('[data-skin="paper"]') as HTMLElement
    expect(card.style.getPropertyValue('--paper-card-accent')).toBe('var(--event-accent-fill)')

    fireEvent.click(screen.getByTitle(/Alt\+2/))
    expect(card.style.getPropertyValue('--paper-card-accent')).toBe('var(--event-sage-fill)')
  })

  it('饮食模式的纸用 sand 色，不是当前默认分类色', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: '记录吃了什么' }))
    const card = document.querySelector('[data-skin="paper"]') as HTMLElement
    expect(card.style.getPropertyValue('--paper-card-accent')).toBe('var(--event-sand-fill)')
  })

  // ── 子模式也是同一张纸 ──────────────────────────────────
  // 饮食和睡眠只是默认模式的变体，不该长得像另一个应用。

  it('饮食模式里「记下这一顿」是纸上的文字按钮，不是圆角实心块', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: '记录吃了什么' }))
    const submit = screen.getByRole('button', { name: '记下' })
    expect(submit.className).not.toMatch(/\brounded-lg\b/)
    expect(submit.className).toContain('font-serif')
  })

  // E 版：质量从五个 emoji 改成五档刻度 + 文字标签。
  // 契约「是文字不是圆角方块」不变，另加一条：好端必须在最左。
  it('睡眠模式的质量是五档刻度文字，且好端在最左', () => {
    renderCard({ editingEvent: makeEvent({
      color: 'stone',
      categoryId: 'stone',
      typedKey: 'sleep',
      typedData: { type: 'sleep', sleepType: 'main', bedtime: 0, wakeTime: 0 },
    }) })

    const labels = ['很好', '好', '一般', '差', '很差']
    const buttons = labels.map((l) => screen.getByRole('button', { name: l }))

    for (const btn of buttons) {
      expect(btn.className).not.toMatch(/\brounded-lg\b/)
    }

    // DOM 顺序即视觉顺序（绝对定位 + left%），好端在前
    for (let i = 1; i < buttons.length; i++) {
      const rel = buttons[i - 1].compareDocumentPosition(buttons[i])
      expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  // 睡眠时间从两个 time input 改成一条可拖的横轴：
  // 轴把时钟盘展开成直线（20:00 → 次日 12:00），拖圆点即改时间。
  it('睡眠时间是一条横轴，拖圆点能改时间', () => {
    renderCard({ editingEvent: makeEvent({
      color: 'stone',
      categoryId: 'stone',
      typedKey: 'sleep',
      typedData: { type: 'sleep', sleepType: 'main', bedtime: 0, wakeTime: 0 },
    }) })

    const band = document.querySelector('[data-sleep-band]') as HTMLElement
    expect(band).toBeTruthy()

    // jsdom 不做布局，手动给轨道一个 320px 宽的盒子
    band.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 320, bottom: 28,
      width: 320, height: 28, toJSON: () => ({}),
    }) as DOMRect

    // 两个圆点各自报出自己的时刻（aria-label 是单字符串，不会被拆成多个文本节点）
    expect(screen.getByRole('button', { name: /调整入睡时间，当前 10:00/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /调整醒来时间，当前 10:30/ })).toBeTruthy()

    // 高亮段落在两个圆点之间：入睡 10:00 → 轴上 87.5%，醒来 10:30 → 90.625%
    const segs = band.querySelectorAll('div')
    const fill = Array.from(segs).find((d) => d.style.left && d.style.width) as HTMLElement
    expect(fill).toBeTruthy()
    expect(parseFloat(fill.style.left)).toBeCloseTo(87.5, 1)
    expect(parseFloat(fill.style.width)).toBeCloseTo(3.125, 1)
  })

  // E 版主张「打开即答案」：新建睡眠时不用先填两个时刻，
  // 默认就是「从锚点倒推 8 小时」，按一次记录就走。
  it('新建睡眠时默认倒推 8 小时，不用先填时间', () => {
    // stone 分类直接映射到 sleep 模式，不用去点分类点
    renderCard({ defaultColor: 'stone' })

    // 锚点是 10:00 → 默认区间 02:00–10:00，正好 8 小时
    expect(screen.getByRole('button', { name: /调整入睡时间，当前 02:00/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /调整醒来时间，当前 10:00/ })).toBeTruthy()
    expect(screen.getByText('8h00m')).toBeTruthy()
  })
})
