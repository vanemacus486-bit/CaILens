# CaILens

[中文](./README.md)

CaILens is a local-first time-logging tool inspired by Alexander Lyubishchev's lifelong time accounting practice, as told in Daniil Granin's *This Strange Life*. It records, categorises, and visualises how your hours are actually spent — no accounts, no servers, no telemetry.

> **Status:** v3.23.0 — Three-mode navigation, project-SOP-todo system, 4-tab statistics dashboard. 498 tests.
> 📋 [Changelog](./CHANGELOG.md) — Full version history with detailed changes.

## Downloads

### Latest (recommended)

```bash
npx cailens
```

One command — always the latest version. Requires **Node 20+**.

Or install globally:

```bash
npm install -g cailens
cailens
```

> npm always delivers the latest code. Run `npm update -g cailens` to upgrade.

### Pre-built packages

| Platform | File | Notes |
|----------|------|-------|
| Windows (x64) | [CaILens.exe](https://github.com/vanemacus486-bit/CaILens/releases/latest) | Portable, no install needed. Windows 10 1803+ |
| Android | [CaILens-android-debug.apk](https://github.com/vanemacus486-bit/CaILens/releases/latest) | Android 7.0+ |

> ⚠️ **Pre-built packages lag behind the latest code.** Due to release cadence, the exe / apk on GitHub Releases may be outdated. Use `npx cailens` for the newest features.

---

## Philosophy

Most calendar tools optimise for scheduling: future events, invites, reminders. That solves a different problem than understanding your own time.

Lyubishchev kept a time log for 56 years. Every hour accounted for. Every category tallied. It was not productivity theatre — it was an instrument for thinking about how a life is actually spent.

CaILens is a small attempt at that instrument, for the browser.

- **Record, don't plan.** There is no scheduling. You log what happened, not what you hope will happen.
- **Local-first.** Your data lives in IndexedDB. No accounts, no servers, no telemetry. Your time diary is yours alone.
- **Quiet design.** Warm neutral palette, serif headings, restrained accents. The app gets out of the way. No nudges, no gamification, no judgment.
- **Code quality over feature quantity.** Strict TypeScript, 498 tests, one-way dependency layers. The codebase should age well.

---

## Features

### Three-Mode Navigation (v3.23)

The top navigation bar provides three work modes, switchable via `1` `2` `3`:

| Mode | Key | Purpose |
|------|-----|---------|
| 📅 Calendar | `1` | Week / Day / Month views |
| 📋 Plan | `2` | Todo management |
| 📊 Review | `3` | Statistics: routine / lifestyle / body / correlation |

All three modes share the same top bar. URL-driven state, browser back/forward works.

### Week Calendar

- **24-hour, single-screen week view** (Mon–Sun, with time gutter).
- **Click-to-create** — inline edit card with title + description.
- **Drag to move** — continuous minute-axis coordinate system, seamless cross-day. Raw Pointer Events, 60fps ghost overlay.
- **Drag edges to resize** — handles; drag past midnight for cross-day events.
- **Cross-day events** — sleep spanning midnight, arrow indicators.
- **Live preview at 60fps**.
- **Right-click menu** — delete, change colour (6 categories).
- **Overlap layout** — automatic side-by-side.
- **Current time line** — 1px solid + 3px dot + 2s breathing animation.
- **Light / dark mode** — manual toggle, auto-detects system preference. WCAG AA contrast.
- **Tri-view** — W / D / M pills for Week/Day/Month. URL-driven.

### Day Diary (DayEventStream)

Embedded via `?view=day&date=YYYY-MM-DD`, sharing URL space with Week/Month.

- **Serif reading layout** — heading (600), paragraph (description), smaller footer.
- **Markdown descriptions** — **bold**, *italic*, inline code, lists, links.
- **Category transition dividers**.
- **Prev/next day navigation**.

### Month View (MonthView)

- **Monthly aggregation grid**.
- **Double-click to Day View**.
- `‹` `›` month navigation.
- URL param `?view=month&date=2026-05-01`.

### QuickLog

- **`N` global shortcut** — quick entry from any page.
- **Minimal input** — event name, category, notes. Autofocus title, **Tab** to switch, **Enter** to save.
- **Alt+number** — `Alt+1..6` for categories.
- **Autocomplete dropdown** — recent matches.
- **Recent pills** — quick-repeat recent events.
- **Auto time** — inherits from previous event or `now - 1h` → `now`.
- **Undo** — 3-second snackbar.
- **Floating card** — attached below the week view.

### Todos / Action Page (v3.23)

The `/action` page separates planning from recording.

- **4-state todo** — `todo / in_progress / done / cancelled`.
- **Priority** — high / medium / low. Sortable.
- **Due-date grouping** — overdue / today / upcoming / none.
- **`sortTodos()`** — pure function: undone first → sortOrder → priority → createdAt.
- **Quick add** — top input + Enter.
- **Zustand store** — `todoStore`.

### Projects & SOP (v3.23)

New project dimension: event → project → category. Each project can have a Standard Operating Procedure (SOP).

- **Project detail** — `/projects/:projectId`, with event overview + SOP editor.
- **SOP editor** — title / step / note / warning sections.
- **Version management** — each edit creates a version; history + rollback.
- **Zustand stores** — `projectStore` + `sopStore`.

### Profile (v3.23)

`/profile` page manages personal info and body metrics.

- **Body metrics** — height / weight / body fat / resting heart rate / blood pressure.
- **Sleep baseline** — personal sleep requirement for steady metrics comparison.
- **Data persistence** — `profileStore` + `profileRepository`.

### Daily Context (v3.22)

Capture the "why" behind your time.

- **Quick log** — 5 sliders + 2 numeric inputs + notes: last meal, social, outdoor, exercise, mood, screen.
- **All fields optional** — ~20 seconds.
- **Status indicator**.
- **Restrained Mode** — suppress insights while keeping recording.

### Insights (v3.22)

Correlate context with sleep metrics.

- **Group comparison** — split history into high/low groups per variable.
- **Plain-language cards** — "Late last meal: bedtime delayed by 34 min."
- **Correlation ≠ causation**.
- **Actionable suggestions**.
- **Stats page entry** — 「Correlation」tab.

### Steady Metrics (v3.22)

From streak anxiety to steady-state perspective.

- **Median bedtime & wake time**.
- **Standard deviation**.
- **Drift velocity** (min/week).
- **Drift projection** — "In 4 weeks, bedtime will reach 23:45."
- **Consistency index**.

### Restrained Mode (v3.22)

Record without being analyzed.

- **Toggle** — Settings → Data → Restrained Mode.
- **Hides** — insight entry points.
- **Design goal** — causality without scrutiny.

### Standard Week View

"What does a typical week look like?"

- **7×24 grid** — 168 (weekday, hour) buckets by minute weight.
- **Habit visualization** — darker = stronger. Category colours.
- **<30% grey** — low-ratio cells fade.
- **Hover distribution** — full activity breakdown.
- **Range selector** — all / last 12 weeks / last 4 weeks.
- **Hide sleep toggle**.
- **≤8 weeks shows absolute counts** — `"3/4 weeks"`.

### Search

- **Ctrl+K / Cmd+K global shortcut**.
- **Keyword search** — titles + descriptions, case-insensitive.
- **Description snippets** — ±20 chars context + highlight.
- **Instant navigation** — jump to week, open detail.
- **Toolbar entry** — search icon.

### Sidebar

- **Icon rail with hover expansion** — 200ms delay, bilingual labels. Pin to keep expanded.
- **Week navigation** — prev / next / today.
- **ICS import** and **Stats dashboard** buttons.

### Keyboard Shortcuts

**All bindings user-customizable**:

| Shortcut | Action |
|----------|--------|
| `1` / `2` / `3` | Calendar / Plan / Review mode |
| `Ctrl+K` | Open search panel |
| `N` | Quick log |
| `Ctrl+C` | Copy focused event |
| `Ctrl+V` | Paste event |
| `Ctrl+←` / `Ctrl+→` | Previous / Next week |
| `Ctrl+Shift+←` / `Ctrl+Shift+→` | Previous / Next day |
| `M` | Switch to Month View |

- **16 bindable actions**.
- **Settings → Shortcuts** — click to record, conflict detection.
- **Reset** — per-action or all.
- Auto-disabled in input fields.

### Categories (6 fixed)

| Colour | Name | Type |
|---|---|---|
| Terracotta | Core Focus | Type I — creative core |
| Sage | Support Tasks | Type II — auxiliary |
| Sand | Chores & Admin | Type II — auxiliary |
| Warm gray | Personal Growth | Type I — creative core |
| Rose | Rest & Leisure | Type II — auxiliary |
| Stone | Sleep | Type II — auxiliary |

Editable names (CN/EN). Configurable weekly budget per category.

### Settings Page

Tabbed sub-route layout:

- **Categories** — inline name edit, budget, keyword folders, auto-reclassify.
- **Appearance** — language (CN/EN), theme (light/dark), accent (rust/ocean/forest/plum), font (Inter/LXGW WenKai).
- **Shortcuts** — view and customise all bindings.
- **Data** — restrained mode toggle, export/import.
- **Storage** — IndexedDB info.
- **About** — version & license.

### Statistics Dashboard (v3.23 4-Tab)

Upgraded from 3 views to **4 primary tabs**:

**📊 Routine**
- Trend chart (day/week/month granularity, multi-line, budget baseline)
- Yearly heatmap (GitHub contribution graph, 6-category pill, percentile thresholds)
- Sleep rhythm chart (calendar Y-axis, month/quarter/year views)
- Steady metrics (median, stddev, drift, projection, consistency)

**🥗 Lifestyle**
- Diet nutrition card — daily meal type stats
- Outfit card — daily outfit tracking
- Hygiene card — hygiene score trends
- Leisure card — leisure distribution

**💪 Body**
- Body metrics panel — weight / body fat / heart rate / blood pressure trends
- Sleep baseline comparison

**🔗 Correlation**
- Context variable vs routine metric analysis
- Group comparison + plain-language insight cards
- Correlation ≠ causation disclaimer
- Data maturity: Cold / Warming / Mature

### ICS Import

- **Parse RFC 5545** (ical.js). Skips all-day and recurring events.
- **Name aggregation** — inline 6-colour category buttons (1-6 keys).
- **Smart suggestions** — keyword matching, one-click apply.
- **Coverage progress bar**.
- **Search filter + per-instance override**.
- **Auto-reclassify on keyword change**.

### Data

- **Persistent local storage** — IndexedDB (Dexie v4), Schema 9+, auto-migration.
- **Export** — CSV / JSON / **encrypted .cailens** (age + gzip).
- **Import** — CSV / JSON restore.
- **Encrypted backup** — full round-trip.

---

## Architecture

```
use-cases/ ──→ domain/  ──→  data/  ──→  stores/  ──→  features/ + components/
 (orchestration)  (pure logic)  (Repository)  (Zustand)      (UI)
```

- **`use-cases/`** — orchestration layer. Pure DI functions for cross-repository operations (e.g. auto-learn keywords on event creation).
- **`domain/`** — pure types and business logic. No React, no IndexedDB, no side effects. All unit-tested.
- **`data/`** — Dexie schema + repositories + migrations. Only layer touching IndexedDB.
- **`stores/`** — Zustand stores wrapping data layer. Components never call repositories directly.
- **`features/` + `components/`** — React UI.

Notable details:

- **Drag system** — minute-axis coordinates (0..7×1440), cross-day is arithmetic. Ghost via rAF direct DOM.
- **Render performance** — `React.memo`, stable callbacks, Zustand sliced subscriptions.
- **Stats engine** — pure functions: weekly stats, interval merging, Type I/II split, maturity, steady metrics, correlation.
- **Keyword learning** — `use-cases/classifyAndLearnKeyword.ts`.

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
npm run test         # run unit tests once (498 tests)
npm run test:watch   # run tests in watch mode
npm run lint         # run ESLint
npm run tauri:build  # Tauri production build (Windows exe)
npm run android:build# Android APK build
```

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| UI | React 19 + TypeScript 6 (strict) | Functional components, hooks, no `any` |
| Build | Vite 8 | |
| Styling | Tailwind CSS v4 + CSS custom properties | shadcn-style primitives on Radix UI |
| State | Zustand v5 | Sliced selectors |
| Storage | IndexedDB via Dexie v4 | Local-first, no backend |
| Router | react-router-dom v7 | HashRouter |
| Charts | Recharts 3 | |
| Dates | date-fns v4 | No dayjs / moment |
| Testing | Vitest 4 + RTL + fake-indexeddb | 498 tests, 28 test files |
| Fonts | Inter, Source Serif 4, JetBrains Mono, Noto Serif SC, Noto Sans SC, **LXGW WenKai** | Fontsource, local |
| Icons | lucide-react | |
| Desktop | Tauri v2 | Windows portable exe |
| Mobile | Capacitor v8 | Android |

---

## License

[Proprietary EULA](./LICENSE) — Copyright (c) 2025–2026 vanemacus486-bit. All rights reserved.

Personal use on a single device. Redistribution, resale, and reverse engineering are prohibited. See the full license for terms.

---

[中文版 →](./README.md)
