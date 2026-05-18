/**
 * Lightweight Markdown-to-HTML renderer for event descriptions.
 * Supports: **bold**, *italic*, `code`, - unordered lists, [text](url) links.
 * Input is plain text; all HTML special characters are escaped before processing.
 * Returns an HTML string safe for use with dangerouslySetInnerHTML.
 */
export function renderDescription(md: string): string {
  if (!md) return ''

  // Escape HTML entities first
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')

  // Italic: *text* or _text_ (but not inside words to avoid false positives)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>')

  // Inline code: `text`
  html = html.replace(/`(.+?)`/g, '<code class="font-mono text-xs bg-surface-sunken px-1 rounded">$1</code>')

  // Inline links: [text](url) — only allow http/https/mailto schemes
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, (_m: string, label: string, url: string) => {
    const safe = /^(https?:|mailto:)/i.test(url)
    if (!safe) return label
    return `<a href="${url}" class="text-accent underline hover:opacity-80" target="_blank" rel="noopener noreferrer">${label}</a>`
  })

  // Split into lines and process each
  const lines = html.split('\n')
  const result: string[] = []
  let inList = false

  for (const line of lines) {
    // Unordered list: "- item" or "* item"
    const listMatch = line.match(/^[\-\*]\s+(.+)/)
    if (listMatch) {
      if (!inList) {
        result.push('<ul class="list-disc pl-4 my-1 space-y-0.5 font-serif text-sm">')
        inList = true
      }
      result.push(`<li>${listMatch[1]}</li>`)
      continue
    }

    // Close list if we were in one
    if (inList) {
      result.push('</ul>')
      inList = false
    }

    // Empty line → paragraph break
    if (line.trim() === '') {
      continue
    }

    // Regular text line
    result.push(`<p class="font-serif text-sm leading-relaxed">${line}</p>`)
  }

  // Close any open list
  if (inList) {
    result.push('</ul>')
  }

  return result.join('\n')
}
