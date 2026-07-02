/**
 * Action page filter cycling logic — shared between AppHeader buttons
 * and keyboard shortcuts (Ctrl+←/→).
 *
 * Order: all → starred → archive → all → …
 */

export type ActionFilter = 'all' | 'starred' | 'archive'

const FILTER_ORDER: readonly ActionFilter[] = ['all', 'starred', 'archive']

/**
 * Cycle the action page filter.
 * @param current  current filter value (null = 'all')
 * @param direction 1 = next (→), -1 = prev (←)
 * @returns the next filter, or null to mean "all" (delete the URL param)
 */
export function cycleActionFilter(
  current: ActionFilter | null,
  direction: 1 | -1,
): ActionFilter | null {
  const idx = FILTER_ORDER.indexOf(current ?? 'all')
  const nextIdx = (idx + direction + FILTER_ORDER.length) % FILTER_ORDER.length
  return FILTER_ORDER[nextIdx] === 'all' ? null : FILTER_ORDER[nextIdx]
}
