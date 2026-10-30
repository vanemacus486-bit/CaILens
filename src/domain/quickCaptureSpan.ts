/**
 * # quickCaptureSpan — 快速录入的默认时间区间
 *
 * 柳比歇夫式记日志的真实动作是「事后补记」：刚写完代码，现在记一笔。
 * 所以默认区间取「上一条事件的结束 → 现在」，连续补记时时间轴天然接得上。
 *
 * 三条规则，都是为了「打开就能回车，一次都不用改」：
 *   1. 上一条结束时间必须落在今天、且不晚于现在，否则不算数（跨夜/预排的事件不能拉长区间）
 *   2. 不算数时回落到当前整点
 *   3. 区间不短于 15 分钟，否则一个刚存完的事件会得到 0 长区间
 */

/** 最短区间：15 分钟。 */
export const QUICK_CAPTURE_MIN_MS = 15 * 60_000

export interface QuickCaptureSpanInput {
  /** 上一条事件的结束时刻（UTC ms）；无则 null */
  lastEventEnd: number | null
  /** 当前时刻（UTC ms） */
  now: number
}

export interface QuickCaptureSpan {
  start: number
  end: number
}

/** 本地自然日的起点。 */
function dayStart(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** 本地整点（向下取整到小时）。 */
function hourStart(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime()
}

function isUsableAnchor(lastEventEnd: number | null, now: number): lastEventEnd is number {
  if (lastEventEnd === null) return false
  if (lastEventEnd > now) return false
  // 必须是今天（同一天），避免昨天的事件把区间拉成十几个小时
  return dayStart(lastEventEnd) === dayStart(now)
}

export function computeQuickCaptureSpan({ lastEventEnd, now }: QuickCaptureSpanInput): QuickCaptureSpan {
  const start = isUsableAnchor(lastEventEnd, now) ? lastEventEnd : hourStart(now)
  const end = Math.max(now, start + QUICK_CAPTURE_MIN_MS)
  return { start, end }
}
