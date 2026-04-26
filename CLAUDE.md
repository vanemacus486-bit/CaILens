# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Type-check + production build
npm run lint         # Run ESLint
npm run test         # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
npm run preview      # Preview production build
```

Run a single test file:
```bash
npx vitest run src/domain/time.test.ts
```

## Architecture

CaILens is a local-first week-view calendar (React + TypeScript + Vite). The layers have strict one-way dependencies — no layer may import from a layer above it:

```
domain/     → Pure TS types and time utilities. No React, no Dexie, no side effects.
data/       → Dexie 4 (IndexedDB). EventRepository is the only place that touches the DB.
stores/     → Zustand 5. useEventStore wraps the repository; components never call the repo directly.
components/ → Reusable React primitives (Radix UI + Tailwind).
features/   → Feature modules. WeekView is the main entry point; drag hooks live here.
lib/        → Shared hooks and helpers.
App.tsx     → BrowserRouter; single route `/` → WeekView.
```

**State and data flow:**
- `useEventStore` (Zustand) holds the canonical `events[]` for the current week and exposes typed actions (`createEvent`, `updateEvent`, `deleteEvent`).
- URL parameter `?week=YYYY-MM-DD` drives which week is loaded (`useWeekFromURL`).
- Local WeekView state handles modal mode (`CardState`) and the live drag preview (`DraftPreview`).

**Drag system** is built on Pointer Events (not HTML5 DnD) to support cross-column moves, edge-resize, and 60fps live preview. See `useDragToMove` and `useDragToResize` in `features/week-view/hooks/`.

**Performance pattern:** `React.memo` on event blocks, sliced Zustand selectors, and stable callbacks prevent unnecessary re-renders. Follow this pattern when adding new components that receive event data.

## Key technologies

| Concern | Library |
|---------|---------|
| UI | React 19, TypeScript (strict, no `any`) |
| Build | Vite 8; path alias `@/` → `src/` |
| Styling | Tailwind CSS v4 + design tokens |
| State | Zustand 5 (sliced subscriptions) |
| Storage | Dexie 4.4.2 (IndexedDB, local-first, no backend) |
| Dates | date-fns 4 |
| Testing | Vitest + React Testing Library + fake-indexeddb |

## Testing conventions

Tests live alongside source files (`*.test.ts` / `*.test.tsx`). Domain logic tests are pure TS; component tests use React Testing Library. IndexedDB tests use `fake-indexeddb` — no mocking of the Dexie layer itself.
