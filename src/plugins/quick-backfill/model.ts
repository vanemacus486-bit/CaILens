import type { CategoryId } from '@/domain/category'
import { EVENT_COLORS } from '@/domain/event'
import type { ImportedEvent } from '@/domain/icsImport'
import { formatISODate, parseISODate } from '@/domain/time'

/**
 * 补记模式的数据模型。
 *
 * 与「实时记录」的区别不在字段，而在**约束**：
 * - 实时记录：以现在为锚点，用户只需要说「做了什么」，时间几乎不用改。
 * - 补记：以过去为锚点，用户一次要填很多条，且**时间连续性是主要痛点**
 *   （上一条结束 = 下一条开始，否则中间会出现无法解释的空洞）。
 *
 * 所以这里的模型只做两件事：把「日期 + 时:分」拼成时间戳，以及维护行与行之间的接续。
 */

/** 一行 = 一条待创建的记录。全部字段都是字符串，因为要直接绑到 input 上。 */
export interface BackfillRow {
  /** 行内唯一 id，仅用于 React key 与增删定位，不落库 */
  key: string
  /** 'YYYY-MM-DD' */
  date: string
  /** 'HH:MM' */
  start: string
  /** 'HH:MM'；早于 start 时视为跨天 */
  end: string
  title: string
  categoryId: CategoryId
}

/** 单行校验结果。空数组 = 可以提交。 */
export interface RowIssue {
  field: 'date' | 'start' | 'end' | 'title'
  message: string
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

let rowSeq = 0

/** 新行 key。不用 crypto.randomUUID：只活在前端内存里，短一点更好调试。 */
export function nextRowKey(): string {
  rowSeq += 1
  return `bf-${rowSeq}`
}

/** 把 'YYYY-MM-DD' + 'HH:MM' 拼成 UTC 毫秒时间戳。任一格式不合法时返回 null。 */
export function toTimestamp(date: string, time: string): number | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null
  const [h, m] = time.split(':').map(Number)
  const base = parseISODate(date)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/** 时间戳 → 'HH:MM'（本地时区，仅用于回填输入框） */
export function toTimeString(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 时间戳 → 'YYYY-MM-DD'（本地时区） */
export function toDateString(ts: number): string {
  return formatISODate(new Date(ts))
}

/**
 * 结束时间早于开始时间时按跨天处理（+24h）。
 *
 * 补记场景下这是常见需求：23:00–01:00 的睡眠必须能录进去。
 * 实时记录里同样的输入多半是手误，所以那边选择了「提示并改成 30 分钟」，
 * 这里的默认行为不同是有意为之。
 */
export function resolveEnd(startTs: number, endTs: number): number {
  return endTs <= startTs ? endTs + 86_400_000 : endTs
}

/** 校验单行。标题为空也算不合法——否则会创建一堆无名记录。 */
export function validateRow(row: BackfillRow): RowIssue[] {
  const issues: RowIssue[] = []

  if (!DATE_RE.test(row.date)) {
    issues.push({ field: 'date', message: '日期格式应为 YYYY-MM-DD' })
  }
  if (!TIME_RE.test(row.start)) {
    issues.push({ field: 'start', message: '开始时间格式应为 HH:MM' })
  }
  if (!TIME_RE.test(row.end)) {
    issues.push({ field: 'end', message: '结束时间格式应为 HH:MM' })
  }
  if (!row.title.trim()) {
    issues.push({ field: 'title', message: '标题不能为空' })
  }
  return issues
}

/** 该行是否可以提交 */
export function isRowReady(row: BackfillRow): boolean {
  return validateRow(row).length === 0
}

/**
 * 把合法行转成 `ImportedEvent`，直接复用 eventStore.importParsedEvents 的批量通道。
 *
 * 复用而不是新写一个 `bulkCreateEvent`：那条通道已经处理好缓存失效、跨窗口广播、
 * 全量列表增量合并。插件不该重造这段。
 */
export function toImportedEvent(row: BackfillRow): ImportedEvent | null {
  if (!isRowReady(row)) return null
  const startTs = toTimestamp(row.date, row.start)
  const rawEndTs = toTimestamp(row.date, row.end)
  if (startTs == null || rawEndTs == null) return null
  const endTs = resolveEnd(startTs, rawEndTs)
  return {
    title: row.title.trim(),
    startTime: startTs,
    endTime: endTs,
  }
}

/**
 * 自动接续：把上一行的结束时间作为下一行的开始时间。
 *
 * 跨天时日期要跟着推进，否则 23:00–01:00 之后那行的日期会退回前一天。
 */
export function continueFrom(prev: BackfillRow): BackfillRow {
  const startTs = toTimestamp(prev.date, prev.start)
  const rawEndTs = toTimestamp(prev.date, prev.end)
  const base: BackfillRow = {
    key: nextRowKey(),
    date: prev.date,
    start: prev.end,
    end: prev.end,
    title: '',
    categoryId: prev.categoryId,
  }
  if (startTs == null || rawEndTs == null) return base
  const endTs = resolveEnd(startTs, rawEndTs)
  return {
    ...base,
    date: toDateString(endTs),
    start: toTimeString(endTs),
    // 默认 30 分钟，用户只需改结束时间
    end: toTimeString(endTs + 30 * 60_000),
  }
}

/** 初始行：当天 09:00–10:00，空标题。 */
export function createInitialRow(date = toDateString(Date.now())): BackfillRow {
  return {
    key: nextRowKey(),
    date,
    start: '09:00',
    end: '10:00',
    title: '',
    categoryId: EVENT_COLORS[0],
  }
}

/** 按开始时间排序后的合法行数 / 总时长，用于底部汇总。 */
export function summarize(rows: BackfillRow[]): { count: number; totalMs: number } {
  let count = 0
  let totalMs = 0
  for (const row of rows) {
    const ev = toImportedEvent(row)
    if (!ev) continue
    count += 1
    totalMs += ev.endTime - ev.startTime
  }
  return { count, totalMs }
}
