import { describe, it, expect } from 'vitest'
import { buildWeeklyPrompt } from '../ai'

describe('buildWeeklyPrompt', () => {
  it('returns systemPrompt and userPrompt as strings', () => {
    const result = buildWeeklyPrompt({
      weekLabel: '第 19 周',
      totalHours: 42,
      byCategory: [
        { name: '主要矛盾', hours: 28, percentage: 66.7 },
        { name: '次要矛盾', hours: 10, percentage: 23.8 },
        { name: '庶务时间', hours: 4, percentage: 9.5 },
      ],
    })

    expect(result.systemPrompt).toBeDefined()
    expect(result.userPrompt).toBeDefined()
    expect(typeof result.systemPrompt).toBe('string')
    expect(typeof result.userPrompt).toBe('string')
  })

  it('includes the week label in the user prompt', () => {
    const result = buildWeeklyPrompt({
      weekLabel: '第 19 周',
      totalHours: 10,
      byCategory: [],
    })

    expect(result.userPrompt).toContain('第 19 周')
  })

  it('includes total hours in the user prompt', () => {
    const result = buildWeeklyPrompt({
      weekLabel: 'Week 1',
      totalHours: 42,
      byCategory: [],
    })

    expect(result.userPrompt).toContain('42h')
  })

  it('includes category breakdown when provided', () => {
    const result = buildWeeklyPrompt({
      weekLabel: '第 20 周',
      totalHours: 20,
      byCategory: [
        { name: '主要矛盾', hours: 15, percentage: 75 },
      ],
    })

    expect(result.userPrompt).toContain('主要矛盾')
    expect(result.userPrompt).toContain('15h')
    expect(result.userPrompt).toContain('75%')
  })

  it('handles empty category list gracefully', () => {
    const result = buildWeeklyPrompt({
      weekLabel: '第 1 周',
      totalHours: 0,
      byCategory: [],
    })

    expect(result.userPrompt).toContain('暂无分类记录')
    expect(result.systemPrompt).toBeDefined()
  })

  it('filters out zero-hour categories', () => {
    const result = buildWeeklyPrompt({
      weekLabel: '第 21 周',
      totalHours: 10,
      byCategory: [
        { name: '主要矛盾', hours: 10, percentage: 100 },
        { name: '休息娱乐', hours: 0, percentage: 0 },
      ],
    })

    expect(result.userPrompt).toContain('主要矛盾')
    expect(result.userPrompt).not.toContain('休息娱乐')
  })

  it('includes prior context when provided', () => {
    const result = buildWeeklyPrompt({
      weekLabel: '第 22 周',
      totalHours: 30,
      byCategory: [],
    }, '我目前的主要矛盾是准备秋招')

    expect(result.userPrompt).toContain('准备秋招')
  })
})
