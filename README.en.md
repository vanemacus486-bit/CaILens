# CaILens

[中文](./README.md)

> *Time, recorded. Like a book you write one hour at a time.*

CaILens is a local-first time-logging tool inspired by Alexander Lyubishchev's lifelong time accounting practice, as told in Daniil Granin's *This Strange Life*. It records, categorises, and visualises how your hours are actually spent — no accounts, no servers, no telemetry.

<img width="1920" height="978" alt="image" src="https://github.com/user-attachments/assets/7a408948-e7fd-4137-89a7-5361b12b64c5" />

<img width="1920" height="978" alt="image" src="https://github.com/user-attachments/assets/85722717-8233-41ff-946b-ecc2f8fcf60a" />

<img width="1920" height="978" alt="image" src="https://github.com/user-attachments/assets/0c7ebf00-f893-4a3a-8f3b-2063cab143a2" />

> **Status:** Active development. Statistics dashboard with data maturity system, budget-aware weekly review, annual projection, estimate-vs-actual calibration, and recording quality metrics — all built. Responsive mobile layout now implemented in the web UI. Cross-day event support added.

## Downloads

| Platform | File | Notes |
|----------|------|-------|
| Windows (x64) | [CaILens.exe](https://github.com/vanemacus486-bit/CaILens/releases/latest) | Portable, no install needed. Windows 10 1803+ |
| Android | [CaILens-android-debug.apk](https://github.com/vanemacus486-bit/CaILens/releases/latest) | Android 7.0+ |

> The Android APK has been rebuilt with the latest responsive layout and feature updates.

---

## Philosophy

Most calendar tools optimise for scheduling: future events, invites, reminders. That solves a different problem than understanding your own time.

Lyubishchev kept a time log for 56 years. Every hour accounted for. Every category tallied. It was not productivity theatre — it was an instrument for thinking about how a life is actually spent.

CaILens is a small attempt at that instrument, for the browser.

- **Record, don't plan.** There is no scheduling. You log what happened, not what you hope will happen.
- **Local-first.** Your data lives in IndexedDB. No accounts, no servers, no telemetry. Your time diary is yours alone.
- **Quiet design.** Warm neutral palette, serif headings, restrained accents. The app gets out of the way. No nudges, no gamification, no judgment.
- **Code quality over feature quantity.** Strict TypeScript, 267 tests, one-way dependency layers. The codebase should age well.

---

## Features

### Week Calendar

- **24-hour, single-screen week view** (Mon–Sun, with time gutter).
- **Click-to-create** — click any empty slot, a modal overlay card appears with a prompt: *"What were you doing?"*
- **Drag to move** — events follow the pointer, including cross-day drag. Built on raw Pointer Events, no library.
- **Drag edges to resize** — top and bottom handles for adjusting duration; drag past midnight to create cross-day events.
- **Cross-day events** — events spanning midnight (e.g. sleep) display across days with arrow indicators and continuous rounded corners. (⚠️ Experimental — known bugs. Drag and cross-day resize behavior may be incorrect.)
- **Live preview at 60fps** — draft events render in real-time as you edit or drag.
- **Right-click menu** — delete, change colour (6 colours, each tied to a category).
- **Overlap layout** — overlapping events are laid out side-by-side automatically.
- **Current time indicator** — a terracotta line on today's column, updating every minute.
- **Light / dark mode** — follows system preference.

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
- **Per-category budget** — number input for weekly hour targets.
- **Collapsible keywords** — show preview with count badge; expand to full keyword folder editor.
- **Data export** — one-click CSV and JSON download.

### Statistics Dashboard

A full analytics page (click the chart icon in the sidebar), powered by **Recharts**:

**Overview**
- 4 metric cards — Net Effective Time, Core Focus, Tracking Streak, Period Total. Each with delta vs the selected comparison.
- **Time Account card** — three-segment bar: recorded / sleep (8h/day default) / unrecorded hours.
- **Annualised context** — Core Focus card shows projected yearly hours and percentage of Lyubishchev's 1966 benchmark (~2200h).

**Analysis Modules**
- **Time Allocation** — interactive donut chart (category distribution) + stacked bar chart (daily breakdown).
- **Lyubishchev Analysis** — Type I (creative core) vs Type II (auxiliary) split with percentage bars, cumulative category hours, and **annual projection card** extrapolating the current pace to a full year.
- **Rhythm & Schedule** — 24-hour stacked area chart, weekly rhythm table with dominant activity chips, and a 7×24 hour heatmap with **density / blank distribution toggle**.
- **Trends & Comparison** — 30-day rolling trend line with category tabs + week-over-week sparkline cards. Extreme values greyed out during warming phase.
- **Time Budget** — budget vs actual bars with diagonal stripe pattern for overruns, AlertTriangle icon, and danger-coloured over-budget labels.
- **Week in Review** — algorithmically generated reflective narrative. Mentions severe budget overruns, zero-record categories, Type I/II ratio tensions, and biggest gainers. Cold-start safe: single sentence during early weeks.
- **Estimate vs. Actual** — Monday prompt to predict your week's hours per category. End-of-week comparison table with deviations. Highlights ±30% gaps. Foundation for **systematic bias detection** across multiple weeks.
- **Notable Moments** — auto-detected highlights: longest session (excluding sleep), current streak, top category.
- **Recording Quality** — meta-metrics about the recording habit: event count, average granularity, real-time logging ratio, waking-hour coverage.

**Data Maturity System**
- Every module adapts to how much data you have:
  - **Cold** (< 3 days) — hides deltas, trend charts, and weekly rhythm. Shows progress-ring placeholders.
  - **Warming** (3–13 days) — shows data but marks extreme percentages, waters trend charts, filters to real days only.
  - **Mature** (≥ 14 days) — full analytics unlocked.

**Period selector:** Week / Month / Quarter / Year / All-time.  
**Compare modes:** vs last period / vs same period last year / vs average. Labels include the actual date ranges.

### ICS Import

- **Parse RFC 5545 files** (via ical.js). All-day and recurring events are automatically skipped with counts shown.
- **Keyword-based auto-classification** — each category has editable keywords organised in folders. On import, event titles are matched against all keywords (case-insensitive substring). First match wins.
- **Re-classify on keyword change** — updating keywords re-scans all existing events.

### Data

- **Persistent local storage** — IndexedDB via Dexie v4. Schema at version 6. Migrations run automatically.
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
npm run test         # run unit tests once (267 tests)
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
| Testing | Vitest + React Testing Library + fake-indexeddb | 267 tests across 17 test files |
| Fonts | Inter, Source Serif 4, JetBrains Mono | Fontsource, locally hosted |
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
- **Statistics engine** — pure functions for week stats, bucket aggregation, interval merging, Type I/II split, streak computation, annual projection, data maturity, reflection generation, deviation analysis, and recording quality metrics.


## License

[Creative Commons Attribution-NonCommercial 4.0 International](./LICENSE)

You may use, share, and adapt this software for non-commercial purposes only, with attribution. Commercial use requires a separate agreement.

---

[中文版 →](./README.md)
