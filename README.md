# CaILens

> A focused weekly calendar, on the way to becoming a time journal.

CaILens is a local-first calendar app, building toward a full time-logging tool inspired by Alexander Lyubishchev's lifelong time accounting practice (as told in Daniil Granin's *This Strange Life*).

**Today, CaILens is a polished weekly calendar** — think of it as a Google Calendar-style week view, but local-first, open source, and quietly designed. The full time-journal vision (categorized stats, retrospective views, Lyubishchev-style accounting) is on the roadmap and under active development.

![CaILens week view](https://github.com/user-attachments/assets/f8e2a65e-a9ce-44a9-929f-ab4a790c4b84)

> **Status:** Active development. Calendar module shipped; statistics, journaling, and import/export coming soon.

## Why

Most calendar tools optimize for scheduling: future events, invites, reminders. That is a different problem from understanding your own time.

Lyubishchev kept a time log for 56 years — every hour accounted for, every category tallied. It was not productivity theater. It was an instrument for thinking about how a life is actually spent.

CaILens is a small attempt at that instrument, for the browser. It starts with the part that has to be excellent before anything else matters: the calendar grid itself.

The principles:

- **Local-first.** Your data lives in your browser (IndexedDB). No accounts, no servers, no telemetry.
- **Direct manipulation.** Click, drag, resize, type. Modals are a last resort.
- **Quiet design.** Restrained palette, no nudges, no streaks. The app gets out of the way.

## Features (current)

The calendar module is feature-complete and behaves the way Google Calendar's week view does, with a few opinionated differences:

- **24-hour, single-screen week view.** No scrolling between morning and night — the whole day is visible at once.
- **Click-to-create.** Click any empty slot to create an event at that time.
- **Drag to move.** Drag events anywhere, including across day columns.
- **Drag edges to resize.** Adjust duration without opening anything.
- **Live drag preview.** Events render at 60fps while dragging, with the target time updating in real time.
- **Inline editing.** Double-click to rename. No modal.
- **Right-click menu.** Quick access to delete, duplicate, color change.
- **Six color categories** for at-a-glance pattern recognition.
- **Persistent local storage.** Refresh the page; your week is still there.

## Roadmap

What's next, in rough order:

- **Statistics view** — Lyubishchev-style category totals over arbitrary ranges (this is the core of the project; the calendar is the input device for it).
- **Daily/monthly views** — beyond the current week view.
- **Recurring events** and templates ("morning routine" as a one-click insert).
- **Import / export** — JSON and ICS, so your data is never trapped here.
- **Search** across all logged events.
- **Optional sync** — still local-first; sync as opt-in, not default.

If you have opinions about any of these, open an issue.

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

## Built with Claude Code

This project was developed in close collaboration with [Claude Code](https://www.anthropic.com/claude-code). The split was roughly:

- **Human:** product direction, architecture decisions, UX judgment calls (when an interaction *felt* right vs. just worked), and the parts that touch taste — the palette, the typography, the choice of what *not* to build.
- **Claude:** most of the implementation, test scaffolding, and the patient debugging of pointer-event edge cases.

The drag system in particular went through several rounds: an initial HTML5 DnD prototype that hit a wall on cross-column drags, a rewrite on Pointer Events, and a third pass to add the live preview without dropping below 60fps. Each pass was a conversation, not a prompt.

If you're curious about the workflow, the repository keeps the planning docs (`PLAN.md`, `CLAUDE.md`) that grew alongside the code.

## License

[MIT](./LICENSE)

---

[中文版 →](./README.zh-CN.md)
