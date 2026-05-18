import type { CalendarEvent, CreateEventInput } from '@/domain/event'
import { getEventRepo } from '@/data/getRepositories'

/* ---------- JSON import ---------- */

export interface ImportStats {
  total: number
  imported: number
  skipped: number
  errors: string[]
}

export async function importJson(text: string): Promise<ImportStats> {
  const parsed: unknown = JSON.parse(text)
  const arr = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown>).events
  if (!Array.isArray(arr)) throw new Error('JSON must be an array of events or have an "events" array')

  const stats: ImportStats = { total: arr.length, imported: 0, skipped: 0, errors: [] }
  const valid: CreateEventInput[] = []

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i] as Record<string, unknown>
    const title = String(item.title ?? '')
    const startTime = Number(item.startTime)
    const endTime = Number(item.endTime)
    const color = item.color as CalendarEvent['color']
    const categoryId = (item.categoryId ?? item.color) as string
    const description = item.description !== undefined ? String(item.description) : undefined
    const location = item.location !== undefined ? String(item.location) : undefined

    if (!title || !startTime || !endTime || !color) {
      stats.skipped++
      stats.errors.push(`Row ${i + 1}: missing required fields`)
      continue
    }
    if (endTime <= startTime) {
      stats.skipped++
      stats.errors.push(`Row ${i + 1}: endTime <= startTime`)
      continue
    }

    valid.push({
      title,
      startTime,
      endTime,
      color,
      categoryId: (['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as const).includes(categoryId as never)
        ? categoryId as CalendarEvent['categoryId']
        : color as CalendarEvent['categoryId'],
      description,
      location,
    })
  }

  if (valid.length > 0) {
    await getEventRepo().bulkCreate(valid)
  }

  stats.imported = valid.length
  return stats
}

/* ---------- CSV import ---------- */

export async function importCsv(text: string): Promise<ImportStats> {
  const lines = text.trim().split('\n')
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const mandatory = ['title', 'starttime', 'endtime']
  for (const field of mandatory) {
    if (!header.includes(field)) throw new Error(`CSV missing required column: "${field}"`)
  }

  const idx = (name: string) => {
    const i = header.indexOf(name)
    return i >= 0 ? i : -1
  }

  const stats: ImportStats = { total: lines.length - 1, imported: 0, skipped: 0, errors: [] }
  const valid: CreateEventInput[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) { stats.skipped++; continue }

    const cols = parseCsvLine(line)
    const title = cols[idx('title')] ?? ''
    const startTime = Number(cols[idx('starttime')])
    const endTime = Number(cols[idx('endtime')])
    const colorRaw = cols[idx('color')] ?? cols[idx('categoryid')] ?? ''
    const description = cols[idx('description')] ?? undefined
    const location = cols[idx('location')] ?? undefined

    const color = (['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as const).includes(colorRaw as never)
      ? colorRaw as CalendarEvent['color']
      : 'accent'
    const categoryId = (['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as const).includes(colorRaw as never)
      ? colorRaw as CalendarEvent['categoryId']
      : 'accent'

    if (!title || !startTime || !endTime) {
      stats.skipped++
      stats.errors.push(`Row ${i + 1}: missing required fields`)
      continue
    }
    if (endTime <= startTime) {
      stats.skipped++
      stats.errors.push(`Row ${i + 1}: endTime <= startTime`)
      continue
    }

    valid.push({ title, startTime, endTime, color, categoryId, description, location })
  }

  if (valid.length > 0) {
    await getEventRepo().bulkCreate(valid)
  }

  stats.imported = valid.length
  return stats
}

/* ---------- simple CSV line parser (handles quoted fields) ---------- */

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}
