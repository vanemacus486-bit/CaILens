import { describe, it, expect } from 'vitest'
import { addKeywordIfValid, flattenFolderKeywords } from '../category'

describe('addKeywordIfValid', () => {
  it('adds a new keyword to the list', () => {
    const result = addKeywordIfValid(['meeting'], 'coding')
    expect(result).toEqual(['meeting', 'coding'])
  })

  it('returns null when candidate is too short', () => {
    expect(addKeywordIfValid([], 'a')).toBeNull()
    expect(addKeywordIfValid([], '')).toBeNull()
    expect(addKeywordIfValid([], '  ')).toBeNull()
  })

  it('returns null when candidate is a duplicate', () => {
    expect(addKeywordIfValid(['coding', 'meeting'], 'coding')).toBeNull()
    // case-sensitive: exact match after trim
    expect(addKeywordIfValid(['Coding'], 'Coding')).toBeNull()
  })

  it('allows unlimited keywords (no MAX_KEYWORDS limit)', () => {
    const many = Array.from({ length: 50 }, (_, i) => `kw${i}`)
    const result = addKeywordIfValid(many, 'new-kw')
    expect(result).not.toBeNull()
    expect(result).toHaveLength(51)
  })

  it('trims whitespace before checking', () => {
    const result = addKeywordIfValid(['meeting'], '  coding  ')
    expect(result).toEqual(['meeting', 'coding'])
  })

  it('handles empty initial list', () => {
    const result = addKeywordIfValid([], 'coding')
    expect(result).toEqual(['coding'])
  })

  it('does not mutate the input array', () => {
    const input = ['meeting']
    addKeywordIfValid(input, 'coding')
    expect(input).toEqual(['meeting'])
  })

  it('respects MIN_KEYWORD_LENGTH boundary', () => {
    const justEnough = 'ab'
    expect(addKeywordIfValid([], justEnough)).not.toBeNull()
    expect(addKeywordIfValid([], 'a')).toBeNull()
  })
})

describe('flattenFolderKeywords', () => {
  it('flattens keywords across all folders', () => {
    const folders = [
      { id: 'f1', name: 'Work', keywords: ['meeting', 'coding'] },
      { id: 'f2', name: 'Study', keywords: ['reading', 'writing'] },
    ]
    expect(flattenFolderKeywords(folders)).toEqual(['meeting', 'coding', 'reading', 'writing'])
  })

  it('deduplicates keywords across folders', () => {
    const folders = [
      { id: 'f1', name: 'A', keywords: ['meeting', 'coding'] },
      { id: 'f2', name: 'B', keywords: ['coding', 'reading'] },
    ]
    expect(flattenFolderKeywords(folders)).toEqual(['meeting', 'coding', 'reading'])
  })

  it('returns empty array for empty folders', () => {
    expect(flattenFolderKeywords([])).toEqual([])
    expect(flattenFolderKeywords([{ id: 'f1', name: 'X', keywords: [] }])).toEqual([])
  })
})
