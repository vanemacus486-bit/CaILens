# CaILens

> A time journal, not a calendar.

CaILens is a local-first time-logging app inspired by Alexander Lyubishchev's lifelong time accounting practice, as told in Daniil Granin's *This Strange Life*. Calendars help you plan the future. CaILens helps you see where your time actually went.

![CaILens main view](./docs/screenshot.png)

<!-- TODO: replace with a real screenshot of the week view, ideally with a few colorful events laid out across the day -->

## Why

Most calendar tools optimize for scheduling: future events, invites, reminders. That is a different problem from understanding your own time.

Lyubishchev kept a time log for 56 years — every hour accounted for, every category tallied. It was not productivity theater. It was an instrument for thinking about how a life is actually spent.

CaILens is a small attempt at that instrument, for the browser:

- **Past, not future.** The unit is a logged event, not a planned one.
- **Local-first.** Your data lives in your browser (IndexedDB). No accounts, no servers, no telemetry.
- **Quiet design.** Restrained palette, no nudges, no streaks. The app gets out of the way.

## Features

- **24-hour, single-screen week view.** No scrolling between morning and night — the whole day is visible at once.
- **Direct manipulation everywhere.** Click-to-create, drag-to-move (across columns too), drag-to-resize, right-click for the context menu, double-click to edit inline.
- **Live drag preview.** Events render at 60fps while dragging, with the target time updating in real time.
- **Six color categories** for at-a-glance pattern recognition.
- **Keyboard-friendly inline editing.** Title, time, category — no modals.
- **Persistent local storage.** Refresh the page; your week is still there.

## Getting started

Requires **Node 20+** and **npm**.

```bash
git clone https://github.com/vanemacus486-bit/CaILens.git
cd CaILens
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Other scripts

```bash
npm run build       # type-check and production build
npm run preview     # preview the production build locally
npm run test        # run unit tests once
npm run test:watch  # run tests in watch mode
npm run lint        # run ESLint
```

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| UI | React 19 + TypeScript | Functional components, hooks, strict TS |
| Build | Vite 8 | |
| Styling | Tailwind CSS v4 + custom design tokens | shadcn-style primitives on top of Radix UI |
| State | Zustand | Sliced selectors to keep re-renders local |
| Storage | IndexedDB via Dexie | Local-first, no backend |
| Dates | date-fns | |
| Testing | Vitest + React Testing Library + fake-indexeddb | 100+ unit tests |

## Architecture

The codebase is organized in layers, with strict one-way dependencies:

- **`domain/`** — pure types and business rules. No React, no IndexedDB, no side effects. Easy to unit-test.
- **`data/`** — Dexie schema and repositories. The only place that talks to IndexedDB.
- **`store/`** — Zustand stores wrapping the data layer, exposing selectors and actions to the UI.
- **`components/`** — React components. They never reach into the data layer directly.

A few notes on the harder parts:

- **Drag system.** Built directly on Pointer Events rather than a library, because the interaction we wanted (cross-column drags, live preview, edge-resize, all coexisting with click-to-create) is awkward to express through HTML5 DnD or higher-level abstractions. Hit-testing and snapping happen against the layout grid, not the DOM.
- **Render performance.** Aggressive use of `React.memo`, stable callbacks, and Zustand's sliced subscriptions so a drag that touches one event doesn't re-render the other 49 in the week.
- **Storage.** A thin repository layer over Dexie. The store calls repositories; components never see Dexie. Migrations live with the schema.

## Roadmap

A few things on the list, in no particular order:

- Statistics view (Lyubishchev-style category totals over arbitrary ranges)
- Import / export (JSON, ICS)
- Recurring templates ("morning routine" as a one-click insert)
- Optional sync (still local-first; sync as opt-in, not default)

## Built with Claude Code

This project was developed in close collaboration with [Claude Code](https://www.anthropic.com/claude-code). The split was roughly:

- **Human:** product direction, architecture decisions, UX judgment calls (when an interaction *felt* right vs. just worked), and the parts that touch taste — the palette, the typography, the choice of what *not* to build.
- **Claude:** most of the implementation, test scaffolding, and the patient debugging of pointer-event edge cases.

The drag system in particular went through several rounds: an initial HTML5 DnD prototype that hit a wall on cross-column drags, a rewrite on Pointer Events, and a third pass to add the live preview without dropping below 60fps. Each pass was a conversation, not a prompt.

If you're curious about the workflow, the repository keeps the planning docs (`PLAN.md`, `CLAUDE.md`) that grew alongside the code.

## License

[MIT](./LICENSE)

---

[中文版 →](./README.zh-CN.md) *(coming soon)*
