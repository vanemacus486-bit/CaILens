import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventDetailCard } from '../EventDetailCard'
import type { CalendarEvent, SleepData } from '@/domain/event'

function makeAnchor(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function makeEvent(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: '睡觉',
    startTime: new Date(2026, 5, 26, 4, 0).getTime(),
    endTime:   new Date(2026, 5, 26, 10, 0).getTime(),
    color: 'stone',
    categoryId: 'stone',
    createdAt: 0,
    updatedAt: 0,
    ...over,
  }
}

function sleepData(over: Partial<SleepData> = {}): SleepData {
  return { type: 'sleep', sleepType: 'main', bedtime: 0, wakeTime: 0, ...over }
}

function renderCard(over: Partial<CalendarEvent> = {}) {
  render(
    <EventDetailCard
      event={makeEvent(over)}
      anchorEl={makeAnchor()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />,
  )
}

describe('EventDetailCard — 通用结构', () => {
  it('画出标题与日期时间', () => {
    renderCard()
    expect(screen.getByText('睡觉')).toBeTruthy()
    expect(screen.getByText(/6月26日 星期五/)).toBeTruthy()
  })

  it('普通事件不显示睡眠质量', () => {
    renderCard({ title: '写代码', color: 'accent', categoryId: 'accent' })
    expect(screen.queryByText('睡眠质量')).toBeNull()
  })
})

describe('EventDetailCard — 睡眠特色', () => {
  it('五分质量映射到中文标签（4 → 良好）', () => {
    renderCard({ typedData: sleepData({ quality: 4 }) })
    expect(screen.getByText('睡眠质量')).toBeTruthy()
    expect(screen.getByText('良好')).toBeTruthy()
  })

  it('未评级时回退到「未评级」', () => {
    renderCard({ typedData: sleepData({ quality: undefined }) })
    expect(screen.getByText('未评级')).toBeTruthy()
  })

  it('小睡 + 夜醒 显示对应角标', () => {
    renderCard({ typedData: sleepData({ sleepType: 'nap', hasAwakening: true }) })
    expect(screen.getByText('小睡')).toBeTruthy()
    expect(screen.getByText('夜醒')).toBeTruthy()
  })

  it('失眠 + 噩梦 显示对应角标', () => {
    renderCard({ typedData: sleepData({ sleepType: 'insomnia', hasNightmare: true }) })
    expect(screen.getByText('失眠')).toBeTruthy()
    expect(screen.getByText('噩梦')).toBeTruthy()
  })

  it('主睡且无异常时不显示任何角标', () => {
    renderCard({ typedData: sleepData({ quality: 3 }) })
    expect(screen.queryByText('小睡')).toBeNull()
    expect(screen.queryByText('失眠')).toBeNull()
    expect(screen.queryByText('夜醒')).toBeNull()
  })
})
