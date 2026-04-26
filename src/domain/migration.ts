import type { CalendarEvent, EventColor } from './event'
import type { CategoryId } from './category'

const VALID_COLORS: readonly EventColor[] =
  ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

/**
 * 把第一版 event（无 categoryId）迁移到第二版。
 * 规则：
 *   - 正常情况：categoryId = event.color
 *   - 脏数据（color 不在 6 个枚举里）：categoryId = 'stone'，console.warn 一次
 */
export function migrateEventV1ToV2(
  oldEvent: Omit<CalendarEvent, 'categoryId'> & { categoryId?: undefined }
): CalendarEvent {
  const isValidColor = VALID_COLORS.includes(oldEvent.color)
  if (!isValidColor) {
    console.warn(
      `[migration] event ${oldEvent.id} has invalid color "${oldEvent.color}", `
      + `falling back to 'stone'`
    )
  }
  const categoryId: CategoryId = isValidColor ? oldEvent.color : 'stone'
  return { ...oldEvent, color: isValidColor ? oldEvent.color : 'stone', categoryId }
}
