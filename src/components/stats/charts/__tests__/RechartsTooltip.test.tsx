import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RechartsTooltip } from '../RechartsTooltip'

/* The trend chart draws a decorative fill <Area> *and* a <Line> for the same
   single category. recharts hands a custom tooltip BOTH series — the Area
   flagged `type:'none'`. Before the fix the custom tooltip ignored that flag,
   so the category ("主要矛盾") rendered twice. These tests pin the cure. */

describe('RechartsTooltip de-duplication', () => {
  it('drops the decorative type:"none" Area so the category appears once', () => {
    render(
      <RechartsTooltip
        active
        label="06.22"
        payload={[
          { name: '主要矛盾', value: 6, dataKey: 'accent', type: 'none', fill: '#c47a5a' },
          { name: '主要矛盾', value: 6, dataKey: 'accent', color: '#c47a5a' },
        ]}
      />,
    )
    expect(screen.getAllByText('主要矛盾')).toHaveLength(1)
  })

  it('collapses two identical series sharing a dataKey', () => {
    render(
      <RechartsTooltip
        active
        payload={[
          { name: '主要矛盾', value: 6, dataKey: 'accent', color: '#c47a5a' },
          { name: '主要矛盾', value: 6, dataKey: 'accent', color: '#c47a5a' },
        ]}
      />,
    )
    expect(screen.getAllByText('主要矛盾')).toHaveLength(1)
  })

  it('keeps every distinct category in a multi-select tooltip', () => {
    render(
      <RechartsTooltip
        active
        showTotal
        sortByValue
        payload={[
          { name: '主要矛盾', value: 6, dataKey: 'accent', type: 'none', fill: '#c47a5a' },
          { name: '主要矛盾', value: 6, dataKey: 'accent', color: '#c47a5a' },
          { name: '次要矛盾', value: 6, dataKey: 'sage', color: '#7d9471' },
          { name: '休息娱乐', value: 11, dataKey: 'rose', color: '#b07a8a' },
        ]}
      />,
    )
    expect(screen.getAllByText('主要矛盾')).toHaveLength(1)
    expect(screen.getByText('次要矛盾')).toBeTruthy()
    expect(screen.getByText('休息娱乐')).toBeTruthy()
    // 合计 must count each series once: 6 + 6 + 11 = 23.0h (Area not double-counted).
    expect(screen.getByText('Σ23.0h')).toBeTruthy()
  })

  it('appends each series share when showShare is set (multi-select)', () => {
    render(
      <RechartsTooltip
        active
        showShare
        sortByValue
        payload={[
          { name: '主要矛盾', value: 6, dataKey: 'accent', color: '#c47a5a' },
          { name: '次要矛盾', value: 6, dataKey: 'sage', color: '#7d9471' },
          { name: '休息娱乐', value: 11, dataKey: 'rose', color: '#b07a8a' },
        ]}
      />,
    )
    // 11 / 23 = 48%, 6 / 23 = 26%.
    expect(screen.getByText('48%')).toBeTruthy()
    expect(screen.getAllByText('26%')).toHaveLength(2)
  })

  it('omits share % for a single series (would always be 100%)', () => {
    render(
      <RechartsTooltip
        active
        showShare
        payload={[{ name: '主要矛盾', value: 6, dataKey: 'accent', color: '#c47a5a' }]}
      />,
    )
    expect(screen.queryByText('100%')).toBeNull()
  })

  it('renders the previous-period delta from the row payload', () => {
    render(
      <RechartsTooltip
        active
        showDelta
        sortByValue
        payload={[
          { name: '休息娱乐', value: 11, dataKey: 'rose', color: '#b07a8a', payload: { __d_rose: 2 } },
          { name: '主要矛盾', value: 6, dataKey: 'accent', color: '#c47a5a', payload: { __d_accent: -3 } },
        ]}
      />,
    )
    expect(screen.getByText('▲2.0')).toBeTruthy()
    expect(screen.getByText('▼3.0')).toBeTruthy()
  })

  it('hides the redundant 合计 row when only one series survives', () => {
    render(
      <RechartsTooltip
        active
        showTotal
        payload={[
          { name: '主要矛盾', value: 6, dataKey: 'accent', type: 'none', fill: '#c47a5a' },
          { name: '主要矛盾', value: 6, dataKey: 'accent', color: '#c47a5a' },
        ]}
      />,
    )
    expect(screen.getByText('主要矛盾')).toBeTruthy()
    expect(screen.queryByText('合计')).toBeNull()
  })
})
