# CaILens — Agent Memory

本地优先的时间统计工具，灵感来自柳比歇夫 56 年实践。记录、分类、可视化你的时间去向——没有账号、没有服务器、没有数据上报。

## Project

| 项 | 值 |
|---|---|
| 仓库 | `git+https://github.com/vanemacus486-bit/CaILens.git` |
| 入口 | `src/main.tsx` → `App.tsx` (React 19 + StrictMode) |
| 构建 | Vite 8 (`base: './'` 相对路径) |
| 类型 | TypeScript ~6.0.2 strict (`noImplicitAny`, `strictNullChecks` 等) |
| 包类型 | `"type": "module"` (ESM) |
| 路由 | react-router-dom v7 `HashRouter`，路径见下表 |
| 存储 | Dexie v4 (IndexedDB)，schema v25，16 张表 |
| 状态 | Zustand v5 切片订阅，9 个 store + 1 watchdog |
| 测试 | Vitest 4 + jsdom + fake-indexeddb，25 文件 / 509 测试 |
| 图标 | lucide-react |
| 桌面 | Tauri v2 (`src-tauri/`) |
| 移动 | Capacitor v8 (`capacitor.config.ts`) |

**路由表：**

| 路径 | 组件 | 说明 |
|---|---|---|
| `/` | → `/week` | 重定向（保留 search params） |
| `/week` | `WeekView` | 周视图（`?view=day&date=...` 切日；`?week=...` 指定周） |
| `/action` | `ActionPage` | 待办事项 + 项目分组双视图 |
| `/stats` | `StatsPage` | 复盘仪表盘（4 Tab：作息/日常/身体/关联） |
| `/settings` | `SettingsPage` | 设置页（弹窗 `SettingsModal` 也可触发） |
| `/projects/:projectId` | `ProjectDetailPage` | 项目详情（事件/SOP/灵感 3 Tab） |
| `/profile` | `ProfilePage` | 个人档案 |
| `/quick-capture` | `QuickCaptureWindow` | 浮动快速记录窗口 |

**全局快捷键：** `1`→日历, `2`→规划, `3`→复盘, `Esc`→回周视图, `N`→快速记录, `Ctrl+K`→搜索, `Ctrl+C/V`→复制/粘贴事件, `Ctrl+←/→`→上/下周, `Ctrl+Shift+←/→`→上/下天

## Commands

```bash
npm run dev          # Vite dev server (:5173)
npm run build        # tsc -b && vite build → 只出网页包 dist/，不更新桌面 .exe
npm run lint         # eslint .
npm run test         # vitest run  (509 tests, ~13s)
npm run test:watch   # vitest (watch)
npm run preview      # vite preview
npm run tauri:build  # ★重打桌面 .exe（用户说"构建/打包"通常指这个）→ release/CaILens.exe
npm run android:build# cd android && gradlew assembleDebug && node ../scripts/copy-release.mjs android
```

**提交前自检：** `npm run lint; npm run test; npm run build`（PowerShell 用 `;` 顺序执行，**别写 `&&`** — PS 5.1 会报"`&&` 不是有效语句分隔符"，三条全跑不了。详见下方 Build 节）

## Build（构建 / 排查）

> **‼️ 默认含义：用户说"构建 / 重新构建 / 打包 / 出包 / 出新版本"，在本项目几乎总是指 `npm run tauri:build`（重打桌面 .exe）。**
> 用户是**双击桌面程序**用的，ta 要的是更新后的 `release/CaILens.exe`，不是网页包。
> `npm run build` 只生成 `dist/`（网页），用户**根本看不到**——单独跑它来"完成构建任务"**几乎总是错的**：跑完桌面程序纹丝不动，又会被当成"构建失败"。
> 拿不准就按 `npm run tauri:build` 做，或先问一句"要桌面 .exe 还是网页包？"。完整流程见本节末「**打包桌面 .exe**」。

> **本机环境：Windows + PowerShell 5.1。** 多数"让 AI 构建却失败"并不是代码错，而是**命令写成了 bash 语法**或**误读了输出**。动手前先读本节。

**注意：`npx tsc -b` / `npm run build` 只是"验证代码能不能编译过"，不产出用户要用的桌面程序：**

```powershell
npx tsc -b              # 只查类型：静默无输出＝通过；失败才打印 error TSxxxx
npm run build           # 编译网页包到 dist/（这只是 tauri:build 的前置步骤，不更新桌面 .exe）
```

- **只想确认有没有类型错 → 跑 `npx tsc -b`**，它静默＝通过，不刷那 ~490 行字体清单，省 token。怀疑增量缓存脏了，用 `npx tsc -b --force` 重来。
- 完整构建 `npm run build` 的**成败只看最后两三行**：出现 `✓ built in X` ＝成功；中途有 `error TSxxxx` 块＝失败。中间几百行 `dist/assets/noto-serif-sc-*.woff2` 是正常字体产物，**不是错误，别理**。
- 要退出码：`npm run build; "EXIT=$LASTEXITCODE"`（`0`＝成功）。`$LASTEXITCODE` 是原生程序退出码，比 `$?` 可靠。

**下面这些不是构建失败，别当成错去"修"：**

| 看到的输出 | 真相 |
|---|---|
| `(!) Some chunks are larger than 500 kB` | vite 体积**警告**，构建已成功，忽略 |
| `npm warn Unknown user config "electron_mirror"` | npm 配置提示，与构建无关 |
| `head/grep/tail … 无法将…识别为 cmdlet` | 你在 PowerShell 用了 **bash 命令**，去掉管道重跑 |
| `标记"&&"不是此版本中的有效语句分隔符` | PS 5.1 不支持 `&&`，见下表 |

**bash → PowerShell 对照（AI 最常踩的坑）：**

| 别用（bash 写法，会报错） | 用这个 |
|---|---|
| `npm run build 2>&1 \| head -40` | `npm run build`（直接跑，读尾部结论即可） |
| `… \| tail -20` | `… \| Select-Object -Last 20` |
| `… \| grep error` | `… \| Select-String error` |
| `npm run lint && npm run test` | `npm run lint; if ($?) { npm run test }` |
| `echo $?` | `$LASTEXITCODE` |

> `npm run build` 内部的 `tsc -b && vite build` 跑在 **cmd.exe**（npm 自己起的子 shell）里，那里的 `&&` 合法；但**你在 PowerShell 终端直接敲 `tsc -b && vite build` 会报错**。所以始终走 `npm run build`，别手动拆开。

**⚠️ 三种"构建"别搞混（"改了代码却没变化"的头号原因）：**

| 你的目的 | 命令 | 改代码后的表现 |
|---|---|---|
| 开发时看效果（最常用） | `npm run dev` → 浏览器 `localhost:5173` | **自动热更新**，秒见 |
| 桌面 App 一边开发一边看 | `npm run tauri:dev` | 桌面窗口 + 自动热更新 |
| 出网页发布包 | `npm run build` → 写入 `dist/` | 只更新 `dist/`，**不碰任何已打开的 App** |
| 出桌面 .exe | `npm run tauri:build` → `release/CaILens.exe` | 重新打包（含 Rust 编译，慢几分钟） |

> **打包好的 `release/CaILens.exe` 是冻结快照**：内嵌的是上次 `npm run tauri:build` 那一刻的 `dist/`。之后改源代码、甚至单独跑 `npm run build`，都**不会**让这个 .exe 变——双击它永远是旧版本。
> - 想让桌面 .exe 反映新代码：**先关掉正在运行的 App**（否则覆盖 `release/CaILens.exe` 会因文件占用失败），再 `npm run tauri:build`，然后重新打开。
> - 频繁改代码迭代时**别每次重打 .exe**（每次都要编译 Rust，慢）。用 `npm run tauri:dev`（桌面+热更新）或 `npm run dev`（浏览器）即时验证，定稿后再 `tauri:build` 出包。

**打包桌面 .exe（实测步骤，照此做必成）：**

1. **先关掉正在运行的 CaILens** —— 最容易翻车的一步。`release/CaILens.exe` 被占用时，Rust 白编译 3 分钟后会卡在最后一步复制产物。先 `Get-Process CaILens`（无输出＝没运行）确认；要强制关：`Stop-Process -Name CaILens -Force -ErrorAction SilentlyContinue`。
2. `npm run tauri:build`。依次执行：`npm run build`(前端→`dist/`) → **编译 Rust release（最慢，约 3 分钟）** → makensis 打安装包 → `copy-release.mjs` 复制到 `release/`。
3. **输出末尾出现这几行＝成功：**
   - `` Finished `release` profile [optimized] target(s) in Xm Xs ``
   - `Built application at: ...\target\release\CaILens.exe`
   - `Finished 1 bundle at: ...\nsis\CaILens_<版本>_x64-setup.exe`
   - `Done — 3 file(s) copied to release/`
4. **产物在 `release/`**：`CaILens.exe`（绿色版 ~21MB，须与 `WebView2Loader.dll` 同目录）＋ `CaILens_<版本>_x64-setup.exe`（NSIS 安装包 ~17MB）。
5. **验证**：`release/CaILens.exe` 的修改时间必须是「刚刚」；时间没更新＝没打包成功，别开它。

打包时这些是**正常提示、不是错误**：`Warn ... identifier ... ends with .app`（macOS 提示，Windows 无关）、`(!) Some chunks are larger than 500 kB`、`npm warn Unknown ... config "electron_mirror"`。

> 版本号注意：安装包名里的版本取自 `src-tauri/tauri.conf.json` 的 `version`（当前 `3.9.0`），与 `package.json`（`3.23.0`）**不一致**。要对齐就改 `tauri.conf.json` 的 `version`。

## Architecture

```
use-cases/  →  domain/  →  data/  →  stores/  →  features/ + components/ + pages/
(orchestration) (pure logic) (Repo+Dexie) (Zustand) (UI)
```

**单向依赖，严禁反向。** `domain/` 不得 import React/Dexie/浏览器 API。

| 层 | 关键文件 | 职责 |
|---|---|---|
| `domain/` | `event.ts`, `category.ts`, `stats.ts`, `layout.ts`, `todo.ts`, `time.ts`, `settings.ts`, `quadrant.ts`, `gaps.ts`, `maturity.ts`, `icsImport.ts`, `dailyContext.ts`, `dietStats.ts`, `insomnia.ts`, `napStats.ts`, `recipeStats.ts`, `log.ts`, `shortcuts.ts` | 纯类型 + 纯函数。统计引擎、布局算法、关键词学习、关联分析、稳态指标、成熟度判定 |
| `data/` | `db.ts` (Dexie v25), `getRepositories.ts` (DI 容器), `eventRepository.ts`, `categoryRepository.ts`, `todoRepository.ts`, `projectRepository.ts`, `settingsRepository.ts`, `dailyContextRepository.ts`, `estimateRepository.ts`, `inspirationRepository.ts`, `profileRepository.ts`, `migrations/upgrades.ts`, `adapters/StorageAdapter.ts`, `adapters/IndexedDBAdapter.ts`, `adapters/FileSystemAdapter.ts`, `tauriFs.ts`, `seedDemoData.ts` | 唯一碰 IndexedDB 的地方。Repository 注入 Clock+IdGenerator。适配器模式：IndexedDB / 文件系统 / Tauri FS |
| `stores/` | `eventStore.ts`, `categoryStore.ts`, `settingsStore.ts`, `todoStore.ts`, `projectStore.ts`, `dailyContextStore.ts`, `profileStore.ts`, `estimateStore.ts`, `uiStore.ts`, `watchdog.ts` | Zustand 切片包装 Repository。组件只通过 store 访问数据 |
| `features/` | `week-view/` (WeekView, DayTimelineCard, EventBlock 等), `day-view/` (DayEventStream), `month-view/`, `quick-log/` (FloatingEventCard), `quick-capture/`, `search/` (CommandPalette), `import-ics/`, `settings/`, `action/` | 业务功能模块，按场景组织 |
| `components/` | `ui/` (shadcn 复制: button, dialog, popover, alert-dialog, context-menu, DatePickerPopover, ErrorBoundary, snackbar), `calendar/` (EventBlock, DayColumn, CurrentTimeLine, EventCard, TimeGrid), `nav/` (TopNavBar, TabBar, ReviewLayout, SlideSegmented), `stats/` (40+ 图表组件) | 可复用 UI 原语 |
| `pages/` | `StatsPage.tsx`, `ActionPage/`, `ProfilePage.tsx`, `ProjectDetailPage/` | 路由级页面，编排 store + 渲染 |
| `hooks/` | `useStatsAggregation.ts`, `useShortcutManager.ts`, `useMediaQuery.ts`, `useTabTransition.ts`, `usePageScrollRestore.ts`, `useSessionRestore.ts` | 共享 hooks |
| `use-cases/` | `classifyAndLearnKeyword.ts` | 跨 Repository 编排（事件创建→关键词自动学习→重归类） |
| `lib/` | `cailensExport.ts`, `icsExport.ts`, `jsonCsvImport.ts`, `fireAndForget.ts`, `utils.ts`, `hooks/` | 工具函数：加密导出(age+gzip)、ICS 导出、JSON/CSV 导入 |

**关键领域模块：**

| 文件 | 作用 |
|---|---|
| `domain/layout.ts` | 周视图布局算法（重叠事件并排计算） |
| `domain/stats.ts` | computeWeekStats, computeDayStats, computeTypeSplit |
| `domain/todo.ts` | Todo 类型 + sortTodos/groupTodosByDueDate (19KB 大文件) |
| `domain/quadrant.ts` | 四象限分析 |
| `domain/dailyContext.ts` | 每日上下文（穿搭/卫生/娱乐/身体指标） |
| `domain/correlation.ts` | 关联分析 |
| `domain/steadyMetrics.ts` | 稳态指标 |
| `domain/gaps.ts` | 间隙检测 |
| `domain/maturity.ts` | 数据成熟度判定 (Cold/Warming/Mature) |
| `domain/shortcuts.ts` | 快捷键系统定义 (6KB) |
| `domain/dietStats.ts` | 饮食统计 (10KB) |
| `domain/insomnia.ts` | 失眠分析 (4.7KB) |
| `domain/napStats.ts` | 午睡统计 (3.5KB) |
| `domain/recipeStats.ts` | 食谱统计 (7KB) |
| `domain/log.ts` | 日志系统 |
| `domain/eventSegment.ts` | 事件分段 |
| `domain/minuteAxis.ts` | 分钟轴坐标系 |
| `domain/dateRange.ts` | 日期范围工具 |
| `domain/migration.ts` | 迁移工具 |

## Design System

**色彩：** 浅色 `--surface-base: #F1EBE0`，深色 `--surface-base: #1a1a1a`。暖中性色调。accent `#c47a5a`。

**6 种事件色** = 6 种分类 = 6 种 CategoryId。各有 `bg/text/fill` 三个 CSS 变量：
- `accent` (焦橙) / `sage` (鼠尾草绿) / `sand` (沙色) / `sky` (暖灰蓝) / `rose` (玫瑰色) / `stone` (石灰色)

**4 主题色** (rust/ocean/forest/plum) 覆盖 surface + accent + grid-line 三层，不影响事件色。

**状态色：** success `#2D7D46`, danger `#B53535`, info `#3A5A80`。

**字体：** Inter (UI), Source Serif 4 (阅读), JetBrains Mono (时间数字), LXGW WenKai (可选), Noto Serif SC / Noto Sans SC (中文)。

**视觉克制：** `rounded-lg`，不用纯黑边框，不用阴影做层次（用 surface/base/raised/sunken），过渡 200-400ms ease-out，饱和色彩克制。

**CSS 变量定义：** `src/index.css` + `src/styles/tokens.css`。Tailwind 通过 `tailwind.config.ts` 映射到 CSS 变量。

## Data Constraints

- 所有时间存 **UTC 毫秒时间戳**，仅显示层转本地时区
- 颜色用预定义字符串 key (`EventColor`)，不存 hex
- **CategoryId = EventColor**，永远同值
- 分类数量固定 6 个，不可增删
- Schema 变更通过 `db.version(N).stores({...}).upgrade(...)` 迁移
- 所有时间数据统一存 UTC 毫秒时间戳，仅显示层做本地时区转换

## Conventions

- **函数组件 + hooks**，禁 `any` / `as unknown as` / `@ts-ignore`
- **`domain/` 零副作用**：无 React、无 IndexedDB、无浏览器 API
- **组件不直接调 Repository**：必须通过 store
- **`index.html` `<style>` 禁全局选择器**：Tailwind v4 用 `@layer`，非 layered 样式无条件优先
- **新增 UI 必须定义 `:root` 和 `.dark` 两套变量**
- **测试**：`domain/` 纯函数必须有测试；IndexedDB 测试用 `fake-indexeddb`；Repository 注入 fake Clock + IdGenerator
- **不引入新 npm 依赖** 除非必要且已评估
- **不引入日历库**（周视图自实现）
- **不在视图中添加名言/引言**
- **YAGNI**：不在 `domain/` 写过度抽象的代码
