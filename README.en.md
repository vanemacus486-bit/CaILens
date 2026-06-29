<div align="center">

<img src="docs/logo.png" width="96" alt="CaILens logo">

# CaILens

**Record the hour, not the second.**

A local-first time tracker — not a calendar, not a to-do list, but a book you write one hour at a time.
No account, no server, no telemetry.

[中文](./README.md) · [Changelog](./CHANGELOG.md) · [Privacy](./PRIVACY.md)

![version](https://img.shields.io/badge/version-3.23.0-c47a5a?style=flat-square)
![tests](https://img.shields.io/badge/tests-744_passing-2D7D46?style=flat-square)
![platform](https://img.shields.io/badge/platform-Windows_·_Android_·_Web-3A5A80?style=flat-square)
![typescript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square)
![license](https://img.shields.io/badge/license-EULA-B53535?style=flat-square)

</div>

<!-- Screenshot placeholder ① — the week view, the single most representative screen. See checklist at the bottom. -->
<p align="center">
  <img src="docs/screenshots/hero-week.png" alt="CaILens week view: 24 hours × 7 days on one screen" width="860">
</p>

<div align="center">

### Get started

```bash
npx cailens
```

One command runs the latest build (pulled from npm, no install, needs Node 20+).

[![Windows](https://img.shields.io/badge/Windows-.exe-c47a5a?style=for-the-badge)](https://github.com/vanemacus486-bit/CaILens/releases/latest)
[![Android](https://img.shields.io/badge/Android-.apk-6B7A4F?style=for-the-badge)](https://github.com/vanemacus486-bit/CaILens/releases/latest)
[![Source](https://img.shields.io/badge/GitHub-source-1C1814?style=for-the-badge&logo=github&logoColor=white)](https://github.com/vanemacus486-bit/CaILens)

</div>

> ⚠️ The prebuilt exe / apk lag behind the latest code. For the newest features use `npx cailens` or build from source.
> **Platform maturity:** the Windows desktop build is complete and polished; the Android build is early — usable, but still being refined.

---

## Why CaILens

Almost every calendar tool solves the same problem: *fitting the future into boxes* — reminding you of meetings, invites, alarms. But **understanding where your time actually goes** is a fundamentally different question.

Alexander Lyubishchev logged every hour of every day for 56 years, until his death. Not as a productivity performance, but as a tool for genuinely seeing how a life is spent. CaILens is an attempt at that tool for today.

- **🪞 Record, don't plan.** There is no schedule here. You log what already happened — not promises about tomorrow. See first, judge later.
- **🔒 Local-first.** All data lives in your device's IndexedDB. No account, no server, no network, no telemetry. Your time diary is yours alone.
- **🤫 Quiet by design.** Warm neutrals, serif headings, a restrained rust accent. The app never nags, rates, or interrupts — the only thing that keeps moving is the "now" line.
- **🧪 Code quality over feature count.** TypeScript strict mode, 744 tests, one-way layered dependencies.

---

## A look inside

<!-- Screenshot placeholders ②③④ — see checklist at the bottom. -->
<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/stats-dashboard.png" alt="Review dashboard"><br><sub><b>Review dashboard</b> · Routine / Lifestyle / Body / Correlation</sub></td>
    <td width="50%"><img src="docs/screenshots/day-view.png" alt="Day diary"><br><sub><b>Day diary</b> · serif typography turns logs into a page you can read</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/standard-week.png" alt="Standard week"><br><sub><b>Standard week</b> · all past weeks overlaid into your "typical week"</sub></td>
    <td width="50%"><img src="docs/screenshots/dark-mode.png" alt="Dark mode"><br><sub><b>Dark mode</b> · 6 visual styles, light / dark at will</sub></td>
  </tr>
</table>

---

## Features

### 📅 Week view
- **24 hours × 7 days on one screen** — a week across, a day down, no scrolling.
- **Click empty space to create** — the event expands into an inline edit card; no modal, no focus stealing. Type the title, press Enter, and focus flows into the description.
- **Dragging is editing** — a hand-written continuous minute-axis on native Pointer Events; drag across midnight, grab an edge to resize, 60fps ghost overlay.
- **Cross-midnight events** render as one continuous block; hover ~400ms for a quick-read preview.

### ⚡ Quick log
- **Press `N` anywhere** for a minimal flow: name, category, note — Tab between fields, Enter to save.
- **Time auto-continues** from the end of your previous entry — no manual time setting.
- Autocomplete + recents, with a 3-second undo after saving.

### 📖 Day diary
- Serif headings and body paragraphs; descriptions render **Markdown** (bold / italic / lists / links).
- Subtle dividers appear where the activity type changes — logs read like a narrative, not a report.

### 📊 Review dashboard
- **Year heatmap** — GitHub-contribution style, switchable across 6 categories.
- **Sleep rhythm** — calendar-format Y axis, month / quarter / year, bedtime + wake scatter.
- **Category trends** — daily / weekly / monthly multi-line charts with weekly-budget baselines.
- **Standard week** — 168 (weekday, hour) buckets weighted by minutes: "what am I usually doing at 9am Monday?"
- **Steady-state metrics** — sleep median, std-dev, drift velocity, drift projection, consistency index — shifting from "streaks" to "long-term stability".

### 🔗 Daily context + correlation insights
- Lightly log the variables that shape your rhythm (last meal, social, outdoors, exercise, mood, screen) in 20 seconds.
- Correlate them with sleep/routine into plain-language cards: "A later last meal: bedtime pushed back 34 min."
- Every insight carries a "correlation ≠ causation" disclaimer; an optional **Restraint mode** logs without analyzing, so the tool never becomes a new source of anxiety.

### 🗂️ Planning · projects · profile
- **Planning page** — TODOs with four states, priority, and due-date grouping, cleanly separated from "logging".
- **Projects & SOPs** — events belong to projects (event → project → category), each project carrying a versioned standard operating procedure.
- **Profile** — height / weight / body-fat / heart-rate / blood-pressure over time, against a sleep baseline.

### 🎨 Experience details
- **6 fixed categories** (Core Focus / Support / Chores / Growth / Rest / Sleep) with editable names and weekly budgets.
- **6 visual styles** plus light / dark mode; event colors pass a WCAG AA contrast audit.
- **Global search** (`Ctrl+K`), **full keyboard control** (16 rebindable actions), **English / Chinese i18n**.

### 🔓 Your data, free
- Export **CSV / JSON / encrypted `.cailens`** (age encryption + gzip); import CSV / JSON.
- **ICS import** — parses RFC 5545, aggregates by event name, smart-prefills categories.
- Everything stays local. Take it anywhere, never locked in.

---

## Engineering highlights

> A **pure front-end, local-first, backend-free** app that still has to carry calendar interaction, a stats engine, and cross-platform packaging. A few decisions worth noting:

- **One-way layered architecture** — `use-cases → domain → data → stores → features`, no reverse dependencies. The `domain/` layer is side-effect-free (no React, no IndexedDB), so it's fully covered by 744 unit tests.
- **Hand-written week view, no calendar library** — overlap layout, drag-to-move and drag-to-resize are all custom. The core is a **minute-axis coordinate system** (0..7×1440), so cross-day dragging is just arithmetic; the ghost overlay drives the DOM via `requestAnimationFrame` at 60fps.
- **Pure-function stats engine** — weekly stats, time-slot aggregation, standard week, steady-state metrics (drift via linear regression), correlation analysis, data-maturity gating — all testable pure functions.
- **One codebase, three targets** — the same React app ships as a Web bundle (Vite), a Windows desktop exe (Tauri), and an Android apk (Capacitor).
- **Engineering discipline** — TypeScript strict, no `any` / `as unknown as` / `@ts-ignore`; components reach data only through Zustand stores, never a Repository directly.

### Stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript 6 (strict), Tailwind CSS v4, Radix UI |
| State / storage | Zustand v5 · Dexie v4 (IndexedDB), local-first, no backend |
| Routing / charts / time | react-router-dom v7 (HashRouter) · Recharts 3 · date-fns v4 |
| Build / test | Vite 8 · Vitest 4 + Testing Library + fake-indexeddb (744 tests / 50 files) |
| Desktop / mobile | Tauri v2 (Windows exe) · Capacitor v8 (Android apk) |
| Crypto / fonts / icons | age-encryption · Inter / Source Serif 4 / JetBrains Mono / LXGW WenKai · lucide-react |

### Architecture

```
use-cases/  ──→  domain/  ──→  data/  ──→  stores/  ──→  features/ + components/ + pages/
(orchestration) (pure logic)  (Repo+Dexie)  (Zustand)      (UI)
```

`domain/` must not import React / Dexie / browser APIs. Data flows one way: components go through stores, stores wrap repositories, and repositories are the only place that touches IndexedDB.

---

## Roadmap

The core is largely done; what's next is expansion outward:

- [ ] **🤖 AI time assistant** — multi-provider streaming chat, `@`-mentions that inject structured time data, analyses you can pin to a given day's diary.
- [ ] **📈 Deeper charts** — more correlation dimensions, customizable review views.
- [ ] **📱 Mobile polish** — bring the Android experience up to par with desktop.
- [ ] **🔄 End-to-end sync** — local-first sync between desktop ↔ mobile (still no central server).

Completed milestones are in the [Changelog](./CHANGELOG.md).

---

## Run locally

Needs **Node 20+** and npm.

```bash
git clone https://github.com/vanemacus486-bit/CaILens.git
cd CaILens
npm install
npm run dev          # dev server (http://localhost:5173 by default)
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (HMR) |
| `npm run build` | Type-check + production build (web bundle → `dist/`) |
| `npm run test` | Run unit tests once (744) |
| `npm run lint` | ESLint |
| `npm run tauri:build` | Build the Windows desktop exe → `release/` |
| `npm run android:build` | Build the Android apk |

---

## Support the project

CaILens is free forever, local-first, with no ads or tracking. If it helped you see your time clearly, you're welcome to buy the author a coffee:

<!-- TODO: replace the two placeholder links with your real sponsor pages (see src/lib/sponsor.ts) -->
[![Afdian](https://img.shields.io/badge/Afdian-Sponsor-946ce6?style=flat-square)](https://afdian.com/a/REPLACE_ME)
[![Gumroad](https://img.shields.io/badge/Gumroad-Sponsor-ff90e8?style=flat-square)](https://REPLACE_ME.gumroad.com)

---

## License

[End-User License Agreement (EULA)](./LICENSE) — Copyright © 2025–2026 vanemacus486-bit. All rights reserved.

A license to use the software on a single device for personal use. Redistribution, resale, commercial use, and reverse engineering are prohibited. See LICENSE for full terms.

<div align="center">
<sub>A book you write one hour at a time.</sub>
</div>
