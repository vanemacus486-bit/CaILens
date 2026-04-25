export const DEFAULT_HOUR_START = 0
export const DEFAULT_HOUR_END = 24
/** Width of the left time-label column in the main calendar grid (px). */
export const TIME_COLUMN_WIDTH_PX = 80
export const MIN_EVENT_HEIGHT_PX = 20
export const SLOTS_PER_HOUR = 2            // 30-minute granularity
export const TOTAL_SLOTS = 24 * SLOTS_PER_HOUR  // 48

// Fixed number of overlap columns inside each DayColumn grid.
// Supports up to 6 simultaneous overlapping events; extras are clipped.
export const MAX_OVERLAP_COLUMNS = 6
