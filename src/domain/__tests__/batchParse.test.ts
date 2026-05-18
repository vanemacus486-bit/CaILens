import { describe, it, expect } from 'vitest'
import { parseBatchText } from '../batchParse'

describe('parseBatchText', () => {
  it('parses "/"-separated entries', () => {
    const result = parseBatchText('9-11 写报告 / 11-12 开会')
    expect(result).toEqual([
      { startOffsetMinutes: 9 * 60, endOffsetMinutes: 11 * 60, title: '写报告' },
      { startOffsetMinutes: 11 * 60, endOffsetMinutes: 12 * 60, title: '开会' },
    ])
  })

  it('parses newline-separated entries', () => {
    const result = parseBatchText('9-11 写报告\n11-12 开会')
    expect(result).toEqual([
      { startOffsetMinutes: 9 * 60, endOffsetMinutes: 11 * 60, title: '写报告' },
      { startOffsetMinutes: 11 * 60, endOffsetMinutes: 12 * 60, title: '开会' },
    ])
  })

  it('parses with explicit minutes like 9:30-11:00', () => {
    const result = parseBatchText('9:30-11:00 晨会')
    expect(result).toEqual([
      { startOffsetMinutes: 9 * 60 + 30, endOffsetMinutes: 11 * 60, title: '晨会' },
    ])
  })

  it('handles leading-zero hours', () => {
    const result = parseBatchText('09-11 编码')
    expect(result).toEqual([
      { startOffsetMinutes: 9 * 60, endOffsetMinutes: 11 * 60, title: '编码' },
    ])
  })

  it('returns empty for blank input', () => {
    expect(parseBatchText('')).toEqual([])
    expect(parseBatchText('   ')).toEqual([])
  })

  it('skips malformed segments silently', () => {
    const result = parseBatchText('9-11 写报告 / 随便写的文字 / 11-12 开会')
    expect(result).toEqual([
      { startOffsetMinutes: 9 * 60, endOffsetMinutes: 11 * 60, title: '写报告' },
      { startOffsetMinutes: 11 * 60, endOffsetMinutes: 12 * 60, title: '开会' },
    ])
  })

  it('rejects zero-length or end-before-start ranges', () => {
    const result = parseBatchText('11-9 反向 / 11-11 零长')
    expect(result).toEqual([])
  })

  it('handles mixed newline and "/" separators together', () => {
    const result = parseBatchText('9-10 A / 10-11 B\n11-12 C')
    expect(result).toEqual([
      { startOffsetMinutes: 9 * 60, endOffsetMinutes: 10 * 60, title: 'A' },
      { startOffsetMinutes: 10 * 60, endOffsetMinutes: 11 * 60, title: 'B' },
      { startOffsetMinutes: 11 * 60, endOffsetMinutes: 12 * 60, title: 'C' },
    ])
  })

  it('does not split on "/" without surrounding spaces', () => {
    const result = parseBatchText('9-10 读/写代码')
    expect(result).toEqual([
      { startOffsetMinutes: 9 * 60, endOffsetMinutes: 10 * 60, title: '读/写代码' },
    ])
  })
})
