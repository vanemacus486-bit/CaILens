# TODOs — 日志 Tab 重构

## 1. Create domain/log.ts — daily aggregation data model & pure functions [DONE]
   - [x] Define `DayTimeline` type (aggregates events, done todos, meal summary, sleep status per day)
   - [x] Define `WeekTimeline` type (7 days + weekly summary)
   - [x] Define `computeWeekTimeline()` pure function
   - [x] Define `computeDaySummary()` pure function
   - [x] Write 12 tests for the pure functions (all pass)

## 2. Refactor ActionPage log tab — from 7-column grid to vertical flow list [DONE]
   - [x] Added event store + category store loading
   - [x] Added event loading for the log tab's current week via `loadRange`
   - [x] Replaced `groupTodosByWeekDays` with `computeWeekTimeline` (events + done todos)
   - [x] Replaced `DayCard` grid with `DayTimelineCard` vertical flow list
   - [x] Added empty state that shows when both events and todos are absent

## 3. Implement DayTimelineCard component [DONE]
   - [x] Created `src/features/week-view/DayTimelineCard.tsx`
   - [x] Section: Day summary (total hours + category stack bar + labels)
   - [x] Section: Event timeline (compact event list with time, color bar, title, category tag, duration)
   - [x] Section: Done todos (compact list with strikethrough)
   - [x] Section: Life context (meal summary with short labels like 早·午·晚)
   - [x] Empty state: gray italic "··· 无记录 ···"
   - [x] Click event → navigate to week view with openEvent param

## 4. Enhance WeekNavigation component [DONE]
   - [x] Added `weekTotalHours` prop
   - [x] Show week total hours next to the week label
   - [x] Enhanced completionStats type with optional `totalMs` for tooltips
   - [x] Dot matrix tooltips now show per-day hours

## 5. Connect stats → log navigation [SKIPPED — nice-to-have, can be done separately]
   - [ ] In YearHeatmap / CategoryTrendChart, add click → navigate to `/action?tab=log&date=...`
   - [ ] In ActionPage, scroll to and highlight the targeted day

## 6. Clean up old code [DONE]
   - [x] Removed `DayCard.tsx` (no longer imported anywhere)
   - [x] Removed `handleDropOnDay` callback (no longer used)
   - [x] Removed unused imports and constants from DayTimelineCard
   - [x] All lint/tsc/test/build pass clean
