import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { CalendarEvent, HygieneData } from '@/domain/event'
import { HygieneCalendarCard } from '../HygieneCalendarCard'
import { DEFAULT_HYGIENE_ACTIVITIES } from '@/domain/hygieneActivity'

function hygieneEvent(title: string, activity: HygieneData['activity'], when: Date): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    title,
    startTime: when.getTime(),
    endTime: when.getTime() + 600_000,
    color: 'sand',
    categoryId: 'sand',
    typedKey: 'hygiene',
    typedData: { type: 'hygiene', activity },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

describe('HygieneCalendarCard rendering', () => {
  it('places a hygiene event on the week time axis', () => {
    // 当前周内（卡片默认锚定本周）的某一天 10:30
    const now = new Date()
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30)
    const events = [hygieneEvent('晨间护肤', 'skincare', when)]

    const { container, getAllByText } = render(
      <HygieneCalendarCard rangeEvents={events} activities={DEFAULT_HYGIENE_ACTIVITIES} language="zh" />,
    )

    // 时刻轴上恰好一个色点
    expect(container.querySelectorAll('.wta-mark').length).toBe(1)
    // 明细里出现事件标题（区别于图例中固定的"护肤"）
    expect(getAllByText('晨间护肤').length).toBeGreaterThan(0)
  })

  it('falls back to title keywords for plain events without typedData', () => {
    const now = new Date()
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0)
    const plain: CalendarEvent = {
      id: crypto.randomUUID(),
      title: '洗澡',
      startTime: when.getTime(),
      endTime: when.getTime() + 600_000,
      color: 'sky',
      categoryId: 'sky',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const { container } = render(
      <HygieneCalendarCard rangeEvents={[plain]} activities={DEFAULT_HYGIENE_ACTIVITIES} language="zh" />,
    )

    expect(container.querySelectorAll('.wta-mark').length).toBe(1)
  })
})
