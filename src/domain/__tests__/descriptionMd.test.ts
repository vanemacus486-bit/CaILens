import { describe, it, expect } from 'vitest'
import { renderDescription } from '../descriptionMd'

describe('renderDescription', () => {
  it('returns empty string for empty input', () => {
    expect(renderDescription('')).toBe('')
  })

  it('escapes HTML entities', () => {
    const result = renderDescription('<script>alert("xss")</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })

  it('renders bold with ** markers', () => {
    const result = renderDescription('hello **world** today')
    expect(result).toContain('<strong>world</strong>')
  })

  it('renders italic with * markers', () => {
    const result = renderDescription('hello *world* today')
    expect(result).toContain('<em>world</em>')
  })

  it('renders inline code with ` markers', () => {
    const result = renderDescription('use `renderDescription()` function')
    expect(result).toContain('<code')
    expect(result).toContain('renderDescription()')
  })

  it('renders inline links', () => {
    const result = renderDescription('see [docs](https://example.com) here')
    expect(result).toContain('<a href="https://example.com"')
    expect(result).toContain('docs</a>')
  })

  it('renders unordered lists', () => {
    const result = renderDescription('- item 1\n- item 2\n- item 3')
    expect(result).toContain('<ul')
    expect(result).toContain('<li>item 1</li>')
    expect(result).toContain('<li>item 2</li>')
    expect(result).toContain('<li>item 3</li>')
    expect(result).toContain('</ul>')
  })

  it('renders plain text as paragraph', () => {
    const result = renderDescription('just some text')
    expect(result).toContain('<p')
    expect(result).toContain('just some text')
  })

  it('handles mixed content', () => {
    const result = renderDescription('**Bold** and *italic* with `code`\n\nMore text')
    expect(result).toContain('<strong>Bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<code')
    expect(result).toContain('More text')
  })

  it('closes list before starting new paragraph', () => {
    const result = renderDescription('- item\n\nnot in list')
    expect(result).toContain('</ul>')
    expect(result).toContain('<p')
    expect(result).toContain('not in list')
  })
})
