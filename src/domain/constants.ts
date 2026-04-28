// Layout algorithm constants — kept in domain layer because layout.ts
// (a domain pure function) depends on these values.
export const SLOTS_PER_HOUR = 2            // 30-minute granularity
export const TOTAL_SLOTS = 24 * SLOTS_PER_HOUR  // 48

// Fixed number of overlap columns inside each DayColumn grid.
// Supports up to 6 simultaneous overlapping events; extras are clipped.
export const MAX_OVERLAP_COLUMNS = 6
