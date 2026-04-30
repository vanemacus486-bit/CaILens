# CaILens

> *Time, recorded. Like a book you write one hour at a time.*

CaILens is a local-first time-logging tool inspired by Alexander Lyubishchev's lifelong time accounting practice, as told in Daniil Granin's *This Strange Life*. It records, categorises, and visualises how your hours are actually spent — no accounts, no servers, no telemetry.

![CaILens week view](https://github.com/user-attachments/assets/f8e2a65e-a9ce-44a9-929f-ab4a790c4b84)

> **Status:** Active development. v2 shipped — categories, weekly stats, ICS import, keyword auto-classification, day diary view, and a full Recharts-powered statistics dashboard.

---

## Philosophy

Most calendar tools optimise for scheduling: future events, invites, reminders. That solves a different problem than understanding your own time.

Lyubishchev kept a time log for 56 years. Every hour accounted for. Every category tallied. It was not productivity theatre — it was an instrument for thinking about how a life is actually spent.

CaILens is a small attempt at that instrument, for the browser.

- **Record, don't plan.** There is no scheduling. You log what happened, not what you hope will happen.
- **Local-first.** Your data lives in IndexedDB. No accounts, no servers, no telemetry. Your time diary is yours alone.
- **Quiet design.** Warm neutral palette, serif headings, restrained accents. The app gets out of the way. No nudges, no streaks (as a gamification mechanic), no judgment.
- **Code quality over feature quantity.** Strict TypeScript, 500+ tests, one-way dependency layers. The codebase should age well.

---

## Features

### Week Calendar

- **24-hour, single-screen week view** (Mon–Sun, with time gutter).
- **Click-to-create** — click any empty slot, a modal overlay card appears with a prompt: *"What were you doing?"*
- **Drag to move** — events follow the pointer, including cross-day drag. Built on raw Pointer Events, no library.
- **Drag edges to resize** — top and bottom handles for adjusting duration.
- **Live preview at 60fps** — draft events render in real-time as you edit or drag.
- **Right-click menu** — delete, change colour (6 colours, each tied to a category).
- **Overlap layout** — overlapping events are laid out side-by-side automatically.
- **Current time indicator** — a terracotta line on today's column, updating every minute.
- **Light / dark mode** — follows system preference.

### Day Diary

- **Vertical timeline view** — one day at a time, with time labels, coloured dots, and serif entry text.
- **Category transition dividers** — subtle separators when the activity type changes.
- **Prev / next day navigation** — walk through your diary day by day.
- **Back to week view** — a single click returns you to the calendar.

### Categories (6 fixed)

| Colour | Name (EN) | Name (ZH) | Role |
|---|---|---|---|
| Terracotta | Core Work | 核心工作 | Type I — creative core |
| Sage | Support Work | 辅助工作 | Type II — auxiliary |
| Sand | Essentials | 必要事务 | Type II — auxiliary |
| Warm gray | Reading & Study | 阅读学习 | Type I — creative core |
| Rose | Rest | 休息 | Type II — auxiliary |
| Stone | Other | 其他 | Type II — auxiliary |

Users can rename categories in both Chinese and English. Every event belongs to exactly one category.

### Statistics Dashboard

A full analytics page (click the chart icon in the sidebar), powered by **Recharts**:

- **Overview cards** — net effective time, deep work hours, tracking streak, period total. Each with delta vs the selected comparison.
- **Time Allocation** — interactive donut chart (category distribution) + stacked bar chart (daily breakdown).
- **Lyubishchev Analysis** — Type I (creative core) vs Type II (auxiliary) split with percentage bars and cumulative category hours.
- **Rhythm & Schedule** — 24-hour stacked area chart, weekly rhythm table with dominant activity chips, and a 7×24 hour heatmap.
- **Trends & Comparison** — 30-day rolling trend line with category tabs + week-over-week sparkline cards.
- **Time Budget** — budget vs actual bars with over/under summaries.
- **Week in Review** — template-driven narrative interpreting the numbers.
- **Notable Moments** — auto-detected highlights: longest session, current streak, top category.
- **Export** — one-click CSV and JSON download. All data lives locally.

**Period selector:** Week / Month / Quarter / Year / All-time.  
**Compare modes:** vs last period / vs same period last year / vs average.

### ICS Import

- **Parse RFC 5545 files** (via ical.js). All-day and recurring events are automatically skipped with counts shown.
- **Keyword-based auto-classification** — each category has editable keywords. On import, event titles are matched against all keywords (case-insensitive substring). First match wins.
- **Re-classify on keyword change** — updating keywords re-scans all existing events.

### Data

- **Persistent local storage** — IndexedDB via Dexie v4. Schema migrations run automatically.
- **Streak tracking** — `computeStreak()` counts consecutive weeks with at least one logged event.

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
npm run test         # run unit tests once
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
| Testing | Vitest + React Testing Library + fake-indexeddb | |
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

---

## Built With Claude Code

This project was developed in close collaboration with [Claude Code](https://www.anthropic.com/claude-code). The split:

- **Human** — product direction, architecture decisions, UX judgment, the palette, the typography, and deciding what *not* to build.
- **Claude** — most of the implementation, test scaffolding, Recharts integration, and debugging pointer-event edge cases.

The drag system went through three passes (HTML5 DnD → Pointer Events → 60fps live preview). Each was a conversation, not a prompt. See `CLAUDE.md` for the working conventions that guide the collaboration.

---

## License

[Creative Commons Attribution-NonCommercial 4.0 International](./LICENSE)

You may use, share, and adapt this software for non-commercial purposes only, with attribution. Commercial use requires a separate agreement.

---

[中文版 →](./README.zh-CN.md)
