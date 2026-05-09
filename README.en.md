# CaILens

[中文](./README.md)

> *Time, recorded. Like a book you write one hour at a time.*

CaILens is a local-first time-logging tool inspired by Alexander Lyubishchev's lifelong time accounting practice, as told in Daniil Granin's *This Strange Life*. It records, categorises, and visualises how your hours are actually spent — no accounts, no servers, no telemetry.

<img width="1920" height="978" alt="image" src="https://github.com/user-attachments/assets/7a408948-e7fd-4137-89a7-5361b12b64c5" />

> **Status:** v3.7 — ICS Import Redesign. Event name aggregation (1369 rows → ~28 types); inline category buttons with 1-6 keyboard shortcuts; smart keyword suggestion with one-click apply; event coverage progress bar; per-instance override support. 354 tests.

## Downloads

| Platform | File | Notes |
|----------|------|-------|
| Windows (x64) | [CaILens.exe](https://github.com/vanemacus486-bit/CaILens/releases/latest) | Portable, no install needed. Windows 10 1803+ |
| Android | [CaILens-android-debug.apk](https://github.com/vanemacus486-bit/CaILens/releases/latest) | Android 7.0+ |

> The Android APK has been rebuilt with the latest responsive layout and feature updates.
> There may be a problem with the download at present. The browser version can be used normally. The exe file is waiting to be updated and modified to read local files similar to obsidan

---

## Philosophy

Most calendar tools optimise for scheduling: future events, invites, reminders. That solves a different problem than understanding your own time.

Lyubishchev kept a time log for 56 years. Every hour accounted for. Every category tallied. It was not productivity theatre — it was an instrument for thinking about how a life is actually spent.

CaILens is a small attempt at that instrument, for the browser.

- **Record, don't plan.** There is no scheduling. You log what happened, not what you hope will happen.
- **Local-first.** Your data lives in IndexedDB. No accounts, no servers, no telemetry. Your time diary is yours alone.
- **Quiet design.** Warm neutral palette, serif headings, restrained accents. The app gets out of the way. No nudges, no gamification, no judgment.
- **Code quality over feature quantity.** Strict TypeScript, 354 tests, one-way dependency layers. The codebase should age well.

---

## Features

### Week Calendar

- **24-hour, single-screen week view** (Mon–Sun, with time gutter).
- **Click-to-create** — click any empty slot, a modal overlay card appears with a prompt: *"What were you doing?"*
- **Drag to move** — events follow the pointer, including cross-day drag. Built on raw Pointer Events, no library.
- **Drag edges to resize** — top and bottom handles for adjusting duration; drag past midnight to create cross-day events.
- **Cross-day events** — events spanning midnight (e.g. sleep) display across days with arrow indicators and continuous rounded corners.
- **Live preview at 60fps** — draft events render in real-time as you edit or drag.
- **Right-click menu** — delete, change colour (6 colours, each tied to a category).
- **Overlap layout** — overlapping events are laid out side-by-side automatically.
- **Current time indicator** — a terracotta line on today's column, updating every minute.
- **Light / dark mode** — manual toggle, with automatic system preference detection on first visit. Segmented control in Settings.

### QuickLog

- **`n` key global shortcut** — opens the QuickLog dialog from any page; shortcut auto-disables while the dialog is open.
- **Time-chain auto-continuation** — defaults start time to the last event's end time if within 4 hours, else falls back to `now − 1h` → `now`.
- **Colour + category inheritance** — default colour from the last event; switch with `Alt+1..6` or click colour dots.
- **Title-first input** — autofocus on title, Enter to save, Esc to close. Built for speed.
- **Collapsible details** — description + location, collapsed by default, 200ms `max-height` expand animation.
- **Undo after save** — 3-second snackbar in the bottom-right corner; click Undo to delete the event. Saving again within 3 seconds replaces the toast without affecting already-saved events.
- **Toolbar entry** — `+` button in the week view toolbar, next to search, with shortcut tooltip.

### Search

- **Ctrl+K / Cmd+K global shortcut** — summon the search panel from any page.
- **Keyword search** — matches event titles, descriptions, and locations, case-insensitive.
- **Instant navigation** — clicking a result jumps to the corresponding week and opens the event detail card.
- **Toolbar entry** — search icon button in the week view toolbar.

### Sidebar

- **Icon rail with hover expansion** — 200ms delay, Chinese/English labels appear on hover. Pin to keep expanded. State persisted to localStorage.
- **Week navigation** — previous, next, jump to today.
- **ICS import** and **Statistics dashboard** buttons.

### Day Diary

- **Vertical timeline view** — one day at a time, with time labels, coloured dots, and serif entry text.
- **Category transition dividers** — subtle separators when the activity type changes.
- **Prev / next day navigation** — walk through your diary day by day.

### Categories (6 fixed)

| Colour | Name (EN) | Name (ZH) | Type |
|---|---|---|---|
| Terracotta | Core Focus | 主要矛盾 | Type I — creative core |
| Sage | Support Tasks | 次要矛盾 | Type II — auxiliary |
| Sand | Chores & Admin | 庶务时间 | Type II — auxiliary |
| Warm gray | Personal Growth | 个人提升 | Type I — creative core |
| Rose | Rest & Leisure | 休息娱乐 | Type II — auxiliary |
| Stone | Sleep | 睡眠时长 | Type II — auxiliary |

Users can rename categories in both Chinese and English. Each category has a configurable **weekly budget** (in hours) — edit in Settings. Every event belongs to exactly one category.

### Settings Page

- **3-section layout** — Interface (language), Categories (names + budgets + keywords), Data (export).
- **Language toggle** — Chinese / English, using a segmented control.
- **Theme toggle** — Light / Dark, using a segmented control, with automatic system preference detection on first visit.
- **Accent colour** — rust / ocean / forest / plum. Switching shifts surfaces, borders, and brand colour as a cohesive whole — not just a button tint.
- **Per-category budget** — number input for weekly hour targets.
- **Collapsible keywords** — show preview with count badge; expand to full keyword folder editor.
- **Data export** — one-click CSV and JSON download.

### Statistics Dashboard

Click the chart icon in the sidebar. A **segmented control at the top** switches between four views — one at a time, each filling the available viewport height:

**Category Bar Chart** (default)
- 6 thick bars distributed evenly across the full height, each = budget track (neutral) + actual fill (category colour).
- Overflow extends rightward in warning colour.
- Right-side labels show `actual/budget` in hours.

**Multi-Period Comparison**
- 2/3/6/12 side-by-side mini charts with a shared global scale, filling the full height.
- Period count selectable via a small segmented control.

**Trend Chart**
- Multi-line Recharts chart with category chip toggles, selection persisted to localStorage.
- Horizontal dashed budget reference line.
- Chart height adapts to the viewport.

**Day Intensity Heatmap** (one of the four left-side views)
- 7 rows (Mon–Sun) × N columns grid, rows and columns distributed evenly via CSS grid fractions.
- Cell colour intensity = "Core Focus" hours ÷ 24. Hover tooltip shows exact value.
- Gradient legend below the grid; wide tables scroll horizontally.

**Yearly Heatmap** (switch to "Heatmap" tab in the top bar)
- GitHub contribution graph paradigm: ~53 columns × 7 rows CSS grid.
- 6-category pill switcher — smooth colour transition via `--c-active` CSS variable.
- Intensity formula: `daily target = weeklyBudget / 7`, 5 levels (0→22%→48%→75%→100%).
- Cells scale 1.6× on hover with 1px black border; today gets a persistent black box-shadow.
- Stats bar (Total / Daily Avg / Streak / Best Day) with pip visualisation for streaks.
- **Year switching** — `‹` `›` arrows to navigate between years and review historical heatmap data.

**Period selector:** Week / Month / Quarter / Year / All-time — shared across all 4 views.  
**Data maturity:** Cold / Warming / Mature thresholds still gate analytics.

### ICS Import

- **Parse RFC 5545 files** (via ical.js). All-day and recurring events are automatically skipped with counts shown.
- **Event name aggregation** — events are instantly grouped by name (1369 rows → ~28 types). Each row shows the event name + occurrence count. Classifying one instance of "lunch" applies to all 487 events.
- **Inline category buttons** — 6 colour-coded dot buttons per row (numbered 1-6). Click to assign, or press 1-6 on keyboard for rapid classification.
- **Smart pre-fill suggestions** — keyword matching auto-guesses categories, shown with a dashed border + sparkle icon. **One-click "Apply N suggestions"** batch-accepts high-confidence matches.
- **Event-coverage progress bar** — shows "743 / 1369 events covered" (event count, not type count). Classifying high-frequency items gives immediate progress feedback.
- **Search filter** — event name search box to quickly narrow down 30+ types.
- **Per-instance override** — expandable rows allow overriding individual events that share the same name but differ in category.
- **Re-classify on keyword change** — updating keywords re-scans all existing events.

### Data

- **Persistent local storage** — IndexedDB via Dexie v4. Schema at version 7 (v7 adds endTime index). Migrations run automatically.
- **Streak tracking** — `computeStreak()` counts consecutive weeks with at least one logged event.
- **Data export** — CSV and JSON, available in Settings.

---

## Getting Started

Requires **Node 20+** and **npm**.

```bash
git clone https://github.com/vanemacus486-bit/CaILens.git
cd CaILens
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Scripts

```bash
npm run dev          # start dev server
npm run build        # type-check (tsc) + production build (vite)
npm run preview      # preview production build locally
npm run test         # run unit tests once (354 tests)
npm run test:watch   # run tests in watch mode
npm run lint         # run ESLint
```

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| UI | React 19 + TypeScript (strict) | Functional components, hooks, no `any` |
| Build | Vite 8 | |
| Styling | Tailwind CSS v4 + CSS custom properties | shadcn-style primitives on Radix UI |
| State | Zustand v5 | Sliced selectors for render performance |
| Storage | IndexedDB via Dexie v4 | Local-first, no backend |
| Charts | Recharts 3 | Donut, bar, area, line charts |
| Dates | date-fns v4 | No dayjs / moment |
| Testing | Vitest 4 + React Testing Library + fake-indexeddb | 354 tests across 21 test files |
| Fonts | Inter, Source Serif 4, JetBrains Mono, Noto Serif SC, Noto Sans SC | Fontsource, locally hosted |
| Icons | lucide-react | |

---

## Architecture

```
domain/  ──→  data/  ──→  stores/  ──→  features/ + components/
 (pure)       (Repo)       (Zustand)       (UI)
```

- **`domain/`** — pure types and business logic. No React, no IndexedDB, no side effects. All unit-tested.
- **`data/`** — Dexie schema and repositories. The only layer that touches IndexedDB.
- **`stores/`** — Zustand stores wrapping the data layer. Components never access repositories directly.
- **`features/` + `components/`** — React UI. `features/` for business-level views; `components/` for reusable primitives.

Notable details:

- **Drag system** built on raw Pointer Events. Hit-testing and snapping compute against the layout grid, not the DOM.
- **Render performance** — `React.memo`, stable callbacks, Zustand sliced subscriptions keep drags from re-rendering unrelated events.
- **QuickLog** — `n` global shortcut + `QuickLogDialog` form. Default times and colour derived by `deriveDefaultTimes` / `deriveDefaultColor` pure functions; global shortcut hook is standalone and reusable.
- **Statistics engine** — pure functions for week stats, bucket aggregation, interval merging, Type I/II split, streak computation, annual projection, data maturity, reflection generation, deviation analysis, and recording quality metrics.


## License

[Creative Commons Attribution-NonCommercial 4.0 International](./LICENSE)

You may use, share, and adapt this software for non-commercial purposes only, with attribution. Commercial use requires a separate agreement.

---

[中文版 →](./README.md)
