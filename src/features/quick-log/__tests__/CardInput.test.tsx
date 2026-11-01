import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardInput } from '../CardInput'

// ── Seam: CardInput 的视觉契约 ─────────────────────────────
// 「纸」版皮肤的三条硬规则。它们不是实现细节：
// 换成无衬线、加回圆角盒子、把焦点环画回来，用户一眼就看得出来不是那版了。
// 所以这里用类名把它们钉住，防止后续重构悄悄漂回去。

function renderInput(over: Partial<Parameters<typeof CardInput>[0]> = {}) {
  const props = {
    value: '',
    onChange: () => {},
    placeholder: '这段时间在做什么？',
    ...over,
  }
  const { container } = render(<CardInput {...props} />)
  return { container, input: screen.getByPlaceholderText('这段时间在做什么？') }
}

describe('CardInput — 纸皮肤', () => {
  it('输入文字用衬线字体，不是无衬线', () => {
    const { input } = renderInput()
    expect(input.className).toContain('font-serif')
    expect(input.className).not.toContain('font-sans')
  })

  it('没有圆角盒子：容器不带边框，也不带圆角', () => {
    const { container } = renderInput()
    const box = container.querySelector('[data-card-input]') as HTMLElement
    expect(box).toBeTruthy()
    expect(box.className).not.toMatch(/\brounded-xl\b/)
    expect(box.className).not.toMatch(/\bborder\b(?!-)/)
  })

  it('聚焦反馈走容器上的 data 属性，由样式表画下划线而不是焦点环', () => {
    const { container } = renderInput()
    const box = container.querySelector('[data-card-input]') as HTMLElement
    expect(box.getAttribute('data-skin')).toBe('paper')
  })
})
