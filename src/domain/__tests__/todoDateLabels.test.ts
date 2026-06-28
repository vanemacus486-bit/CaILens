/**
 * # todoDateLabels.test.ts — 到期日文案格式化
 */

import { describe, it, expect } from 'vitest'
import { formatDueDate, formatDueDateChip } from '../todoDateLabels'

const NOW = new Date(2025, 5, 15).getTime() // June 15 2025 (Sunday)
const TODAY_START = new Date(2025, 5, 15).getTime()
const TOMORROW_START = TODAY_START + 86400000
const YESTERDAY_START = TODAY_START - 86400000

describe('formatDueDate', () => {
  it('returns empty string for null', () => {
    expect(formatDueDate(null, NOW)).toBe('')
  })

  it('labels today', () => {
    expect(formatDueDate(TODAY_START + 3600000, NOW)).toBe('今天')
  })

  it('labels tomorrow', () => {
    expect(formatDueDate(TOMORROW_START, NOW)).toBe('明天')
  })

  it('labels past dates as overdue', () => {
    expect(formatDueDate(YESTERDAY_START, NOW)).toContain('过期')
  })

  it('labels future dates with month and day', () => {
    const future = TODAY_START + 3 * 86400000
    const result = formatDueDate(future, NOW)
    expect(result).toContain('月')
    expect(result).toContain('日')
  })
})

describe('formatDueDateChip', () => {
  it('returns empty string for null', () => {
    expect(formatDueDateChip(null, NOW)).toBe('')
  })

  it('returns "今天" for today', () => {
    expect(formatDueDateChip(TODAY_START, NOW)).toBe('今天')
  })

  it('returns "明天" for tomorrow', () => {
    expect(formatDueDateChip(TOMORROW_START, NOW)).toBe('明天')
  })

  it('returns "过期" for past dates', () => {
    expect(formatDueDateChip(YESTERDAY_START, NOW)).toBe('过期')
  })

  it('returns short date for future dates', () => {
    const future = TODAY_START + 5 * 86400000
    expect(formatDueDateChip(future, NOW)).toMatch(/\d+月\d+日/)
  })
})
