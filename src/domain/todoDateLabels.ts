/**
 * # todoDateLabels — 到期日文案格式化（纯函数，零副作用）
 */

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * 格式化为完整日期描述，如 "3月15日 周六"
 */
export function formatDueDate(dueDate: number | null, now: number): string {
  if (dueDate === null) return ''
  const d = new Date(dueDate)
  const todayStart = new Date(now).setHours(0, 0, 0, 0)
  const tomorrowStart = todayStart + 86400000
  const dayAfterStart = tomorrowStart + 86400000

  if (dueDate < todayStart) return `过期 · ${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_NAMES[d.getDay()]}`
  if (dueDate < tomorrowStart) return '今天'
  if (dueDate < dayAfterStart) return '明天'
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_NAMES[d.getDay()]}`
}

/**
 * 格式化为短 chip 文案，如 "今天" / "明天" / "3月15日"
 */
export function formatDueDateChip(dueDate: number | null, now: number): string {
  if (dueDate === null) return ''
  const d = new Date(dueDate)
  const todayStart = new Date(now).setHours(0, 0, 0, 0)
  const tomorrowStart = todayStart + 86400000

  if (dueDate < todayStart) return '过期'
  if (dueDate < tomorrowStart) return '今天'
  if (dueDate < tomorrowStart + 86400000) return '明天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
