# CaILens

> A focused weekly calendar, on the way to becoming a time journal.

CaILens is a local-first time-logging tool, inspired by Alexander Lyubishchev's lifelong time accounting practice (as told in Daniil Granin's *This Strange Life*). It starts with a polished weekly calendar and builds upward: category system, weekly statistics, .ics import — all without accounts, servers, or telemetry.

![CaILens week view](https://github.com/user-attachments/assets/f8e2a65e-a9ce-44a9-929f-ab4a790c4b84)

> **Status:** Active development. v2 shipped with categories, weekly stats, .ics import, and keyword-based auto-classification. **Enhanced stats (hour heatmap, 12-month trend chart, month-over-month comparison) have landed on the stats page.**

## Why

Most calendar tools optimize for scheduling: future events, invites, reminders. That is a different problem from understanding your own time.

Lyubishchev kept a time log for 56 years — every hour accounted for, every category tallied. It was not productivity theater. It was an instrument for thinking about how a life is actually spent.

CaILens is a small attempt at that instrument, for the browser. It starts with the part that has to be excellent before anything else matters: the calendar grid itself.

The principles:

- **Local-first.** Your data lives in your browser (IndexedDB). No accounts, no servers, no telemetry.
- **Direct manipulation.** Click, drag, resize, type. Modals are a last resort.
- **Quiet design.** Restrained palette, no nudges, no streaks. The app gets out of the way.

## Features

### Calendar (v1, stable)

- **24-hour, single-screen week view** — all 24 hours visible at once from Monday to Sunday.
- **Click-to-create** — click any empty slot to create an event at that time.
- **Drag to move** — drag events anywhere, including across day columns.
- **Drag edges to resize** — adjust duration without opening any dialog.
- **Live drag preview** — events render at 60fps while dragging, with target time updating in real time.
- **Inline editing** — double-click to rename. No modal.
- **Right-click menu** — delete, duplicate, change color.
- **Current time indicator** — red line on today's column, updates every minute.
- **Overlap layout** — overlapping events are laid out side-by-side automatically.
- **Light / dark mode** — follows system preference with manual toggle.

### Categories & Statistics (v2, stable)

- **6 fixed categories** (Core Work, Support Work, Essentials, Reading & Study, Rest, Other), each with a distinct color. Users can rename them in both Chinese and English.
- **Category selector** in the event editor — every event belongs to exactly one category.
- **Weekly stats page** (click BarChart3 in the sidebar) with per-category breakdown, percentage bars, and total tracked hours. Overlapping time is deduplicated before calculating percentages.
- **Hour heatmap** — a 7×24 CSS Grid showing activity density across the week. Quantile-based color scaling highlights your peak hours at a glance.
- **Monthly stats** — week/month toggle switches to a month view with two visualizations:
  - **12-month trend chart** — pure SVG line chart with one line per category, distinct dash patterns and point shapes, and a hover tooltip.
  - **Month-over-month comparison cards** — 6 cards showing current vs previous month hours, with change arrows (↑↓) and an auto-generated insight line.
- **Bilingual UI** — Chinese (zh) and English (en), toggleable in settings.
- **Sidebar navigation** — replaced the v1 top nav. Today, previous/next week, stats, settings, and .ics import all live here.

### Import (v2, stable)

- **.ics file import** — parse RFC 5545 calendar files via ical.js. All-day and recurring events are automatically skipped with counts shown in the preview.
- **Keyword-based auto-classification** — each category can have keywords (editable in Settings). On import, event titles are matched against all keywords (case-insensitive substring). First match wins; unmatched events fall back to the default category you pick.
- **Re-classify on keyword change** — updating a category's keywords automatically re-scans all existing events and updates their categories/colors.

### Data

- **Persistent local storage** — IndexedDB via Dexie. Refresh or close the browser; data stays.
- **Schema migration** — versioned upgrades (v1→v3) run automatically.
- **6 event colors** (accent/sage/sand/sky/rose/stone) — distinct warm hues for at-a-glance pattern recognition.

## Roadmap

What's next, in rough order:

- **Enhanced statistics** — custom date ranges and longer historical views.
- **Journal / notes** — attach daily or weekly reflections to the timeline.
- **Export** — JSON and ICS export so your data is never trapped here.
- **Search** across all logged events.
- **Optional sync** — still local-first; sync as opt-in, not default.
- **UI polish** — settings and stats pages are functional but need visual refinement.

## Getting started

Requires **Node 20+** and **npm**.

```bash
git clone https://github.com/vanemacus486-bit/CaILens.git
cd CaILens
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Scripts

```bash
npm run dev          # start dev server (default http://localhost:5173)
npm run build        # type-check + production build
npm run preview      # preview production build locally
npm run test         # run unit tests once (544 tests, 26 test files)
npm run test:watch   # run tests in watch mode
npm run lint         # run ESLint
```

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| UI | React 19 + TypeScript (strict) | Functional components, hooks, no `any` |
| Build | Vite 8 | |
| Styling | Tailwind CSS v4 + custom design tokens | shadcn-style primitives on top of Radix UI; warm neutral palette |
| State | Zustand v5 | Sliced selectors to keep re-renders local |
| Storage | IndexedDB via Dexie v4 | Local-first, no backend |
| Dates | date-fns v4 | No dayjs/moment |
| Testing | Vitest + React Testing Library + fake-indexeddb | 544 tests across 26 files |
| Fonts | Inter, Source Serif 4, JetBrains Mono | Fontsource-hosted locally |
| Icons | lucide-react | |

## Architecture

The codebase is organized in strict one-way dependency layers:

```
domain/  ──→  data/  ──→  stores/  ──→  features/ + components/
 (pure)       (Repo)       (Zustand)       (UI)
```

- **`domain/`** — pure types and business rules. No React, no IndexedDB, no side effects. Easy to unit-test.
- **`data/`** — Dexie schema and repositories. The only place that talks to IndexedDB.
- **`stores/`** — Zustand stores wrapping the data layer, exposing selectors and actions to the UI.
- **`features/` + `components/`** — React components. They never reach into the data layer directly.

Notable implementation details:

- **Drag system** built directly on Pointer Events rather than a library. Hit-testing and snapping happen against the layout grid, not the DOM.
- **Render performance** — `React.memo`, stable callbacks, and Zustand's sliced subscriptions keep drags from re-rendering unrelated events.
- **Storage** — a thin repository layer over Dexie. Stores call repositories; components never see Dexie. Schema migrations live alongside the schema.

## Built with Claude Code

This project was developed in close collaboration with [Claude Code](https://www.anthropic.com/claude-code). The split was roughly:

- **Human:** product direction, architecture decisions, UX judgment calls, and the parts that touch taste — the palette, the typography, the choice of what *not* to build.
- **Claude:** most of the implementation, test scaffolding, and the patient debugging of pointer-event edge cases.

The drag system went through several rounds: an initial HTML5 DnD prototype, a rewrite on Pointer Events, and a third pass to add live preview at 60fps. Each pass was a conversation, not a prompt. See `PLAN.md` and `CLAUDE.md` for the planning docs that grew alongside the code.

## License

[MIT](./LICENSE)

---

[中文版 →](./README.zh-CN.md)
