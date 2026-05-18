export interface ParsedDraft {
  startOffsetMinutes: number
  endOffsetMinutes: number
  title: string
}

/**
 * Parses batch time-log text like "9-11 写报告 / 11-12 开会" into draft events.
 *
 * Split by newlines or " / " (space-slash-space), then each segment matched by:
 *   `(\d{1,2})(:(\d{2}))?\s*-\s*(\d{1,2})(:(\d{2}))?\s+(.+)`
 *
 * Supports formats:
 *   9-11 标题
 *   09:00-11:00 标题
 *   9:30-11:30 标题
 */
export function parseBatchText(text: string): ParsedDraft[] {
  // Normalise " / " separators into newlines, then split
  const segments = text
    .replace(/\s+\/\s+/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  const results: ParsedDraft[] = []
  const re = /^(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?\s+(.+)$/

  for (const seg of segments) {
    const m = seg.match(re)
    if (!m) continue

    const startH = Number(m[1])
    const startM = m[2] !== undefined ? Number(m[2]) : 0
    const endH = Number(m[3])
    const endM = m[4] !== undefined ? Number(m[4]) : 0
    const title = m[5].trim()
    if (!title) continue

    const startOffset = startH * 60 + startM
    const endOffset = endH * 60 + endM
    if (endOffset <= startOffset) continue

    results.push({ startOffsetMinutes: startOffset, endOffsetMinutes: endOffset, title })
  }

  return results
}
