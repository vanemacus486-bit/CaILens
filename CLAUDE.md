# CalLens 项目指引

## 1. 项目哲学

**CalLens 不是日程工具，是一面镜子。**

几点睡、几斤重，是心生之相。一个人的作息，是他的价值观、人际关系、审美偏好、日常选择层层向下传导的最终结果——决定它的东西远在云端之上。直接干预作息，就像站在塔底徒手去接一只从塔顶释放的铅球：到了那个点不能不睡，到了那个点不能不醒，到了几点一定饿得受不了。变数早就发生过了，你只是在承受结果。

CalLens 的工作不在塔底，在塔顶。它不催你早睡、不替你规划、不给你打分。它只做一件事：让你看清自己每天真正的输入——吃了什么、和谁来往、穿了什么、用什么工具、如何回应冒犯与辜负——从而让"漂移"的源头浮出水面。

## 原则

- **作息是输出，不是输入**。工具不去干预输出，只帮用户看清输入。
- **越上游越重要**。饮食和运动是输入，人际关系和价值观是更上游的输入。功能要能引导用户向更上游回溯，而不是停在表层指标。
- **观察先于管理，理解先于焦虑**。不做规划、不做提醒、不做催促、不做排名。
- **可解释先于精确**。每一条分析结论都要能用一句白话讲清，不依赖黑箱。
- **沉底先于冲刺**。鼓励长期稳态，而非短期高强度。一切指标设计都为"沉到底"服务。
- **工具有限，生活无限**。工具只呈现因果信号，不替用户做决定。始终留出"不被工具审视"的空间。
- **克制先于丰富**。代码质量优先于功能数量。在"加功能"和"保持克制"之间犹豫时，默认不加。

军队、寺院、律宗、原教旨派之所以作息高度规律，不是因为戒律严，而是因为有一套完整、经得起生活和事业挑战的价值观，并把它贯彻到了衣食住行的每一个细节。CalLens 帮不了你建立价值观，但能帮你看清：你声称的价值观，和你每天实际的选择，是否对得上。

对得上，拈花微笑。对不上，先别急着改作息。

---

## 2. 技术栈

| 层 | 选型 | 备注 |
|---|---|---|
| 框架 | React 19 + TypeScript 6 strict | 函数组件 + hooks，禁 `any` |
| 构建 | Vite 8 | |
| 样式 | Tailwind CSS v4 + CSS 变量 design tokens | shadcn/ui 风格，复制到项目内 |
| 状态 | Zustand v5 | 切片订阅 |
| 存储 | IndexedDB (Dexie v4) | 本地优先，无后端 |
| 路由 | react-router-dom v7 | HashRouter |
| 图表 | recharts v3 | 仅 StatsPage |
| 日期 | date-fns v4 | 禁 dayjs/moment |
| ICS | ical.js v2 | |
| 测试 | Vitest 4 + RTL + fake-indexeddb | |
| 图标 | lucide-react | |
| 桌面 | Tauri v2 | Windows |
| 移动 | Capacitor v8 | Android |

**铁律：** 不引入 FullCalendar、Schedule-X、react-big-calendar 等日历库——周视图自实现。

---

## 3. 命令

```bash
npm run dev          # 开发服务器（:5173）
npm run build        # tsc -b && vite build
npm run lint         # ESLint
npm run test         # 跑一次单元测试
npm run tauri:build  # Tauri 生产构建（慢！每次代码变更后必须跑以覆盖 release/ 下的 exe）
npm run test -- src/domain/__tests__/layout.test.ts  # 单文件测试
```

**提交前自检：** `npm run lint && npm run test && npm run build`
**每次代码变更后：** 自动跑 `npm run tauri:build` 覆盖 exe（用户明确要求的流程，不再仅跑 `npm run build` 验证）

---

## 4. 架构（依赖方向单向）

```
domain/  ──→  data/  ──→  stores/  ──→  pages/ + features/ + components/
(纯逻辑)    (Repository)   (Zustand)              (UI)
```

**核心规则：**
- **`src/domain/`** — 纯类型 + 纯函数，不依赖 React/Dexie/浏览器 API。必须有测试。
- **`src/data/`** — 唯一操作 IndexedDB 的地方。Repository 构造函数注入 `Clock` + `IdGenerator`。通过 `getRepositories.ts` 的 DI 容器懒加载。
- **`src/stores/`** — Zustand 包装 Repository。组件永不直接调 Repository。
- **`src/pages/`** — 路由级页面（StatsPage / ActionPage / ProfilePage / ProjectDetailPage）。编排 store + 渲染。
- **`src/features/`** — 业务功能模块（week-view、day-view、month-view、settings、quick-log、search、import-ics、sop）。
- **`src/components/`** — 可复用 UI 原语。`ui/` shadcn 复制，`calendar/` 日历组件，`stats/` 图表，`nav/` 导航。

**关键领域模块：**

| 文件 | 作用 |
|---|---|
| `domain/event.ts` | `CalendarEvent` 类型，`EventColor` 枚举，`MealRecord`/`SleepRecord` |
| `domain/category.ts` | `Category` 类型，`weeklyBudget`, `KeywordFolder` |
| `domain/settings.ts` | `AppSettings`（language: zh/en） |
| `domain/time.ts` | 时间工具（getDayStart, formatISODate 等） |
| `domain/stats.ts` | computeWeekStats, computeDayStats, computeTypeSplit |
| `domain/estimate.ts` | `WeeklyEstimate` 估算类型 |
| `domain/project.ts` | `Project` 项目类型 |
| `domain/sop.ts` | `SOP`, `SOPVersion` 流程 |
| `domain/inspiration.ts` | `InspirationLog` 灵感记录 |
| `domain/profile.ts` | 用户档案（身体数据） |
| `domain/todo.ts` | 待办事项 + `groupTodosByDueDate` / `sortTodos` |
| `domain/dailyContext.ts` | 每日上下文（穿搭/卫生/娱乐/身体指标） |
| `domain/correlation.ts` | 关联分析 |
| `domain/steadyMetrics.ts` | 稳态指标 |
| `domain/standardWeek.ts` | 标准周计算 |
| `domain/layout.ts` | 周视图布局算法（重叠排版） |
| `domain/maturity.ts` | 数据成熟度判定 |
| `domain/gaps.ts` | 间隙检测 |
| `domain/icsImport.ts` | ICS 文件导入 |

**关键存储/状态文件：**

| 文件 | 作用 |
|---|---|
| `data/db.ts` | Dexie schema（当前 v21），共 16 张表 |
| `data/getRepositories.ts` | Repository DI 容器（懒加载单例） |
| `data/adapters/StorageAdapter.ts` | 存储抽象（IndexedDB / FileSystem） |
| `stores/eventStore.ts` | 全局事件状态 |
| `stores/categoryStore.ts` | 全局分类状态 |
| `stores/settingsStore.ts` | 全局设置状态 |
| `stores/todoStore.ts` | 待办状态 |
| `stores/projectStore.ts` | 项目状态 |
| `stores/dailyContextStore.ts` | 每日上下文状态 |
| `stores/bodyMetricsStore.ts` | 身体指标状态 |
| `stores/profileStore.ts` | 档案状态 |
| `stores/sopStore.ts` | SOP 状态 |
| `stores/estimateStore.ts` | 估算状态 |
| `stores/uiStore.ts` | UI 临时状态（抽屉开合、剪贴板等） |
| `hooks/useStatsAggregation.ts` | 多粒度统计聚合 hook |

---

## 5. 设计系统

Design tokens 定义在 `src/index.css`（CSS 变量），通过 Tailwind 类访问。

**色彩：** 浅色 `#f0ece4`，深色 `#2a2824`。暖中性色调。accent `#c96442` 不滥用。
6 种事件色（accent/sage/sand/sky/rose/stone）各有 `bg/text/fill` 三个变量。
状态色：success `#2D7D46`，danger `#B53535`，info `#3A5A80`。
4 主题色（rust/ocean/forest/plum），见 `domain/themes.ts`。
**新增 UI 必须同时定义 `:root` 和 `.dark` 两套变量。**

**字体：** `font-sans`(Inter) UI 文本，`font-serif`(Source Serif 4) 阅读内容，`font-mono`(JetBrains Mono) 时间数字。

**视觉克制：** 圆角 `rounded-lg`，不用纯黑边框（用 `border-border-subtle/default`），不用阴影做层次（用 surface base/raised/sunken），不饱和色彩，过渡 200-400ms ease-out，不用 emoji 装饰 UI。移动端不优先支持但不能崩溃。

---

## 6. 数据约束

- 所有时间存 **UTC 毫秒时间戳**，仅显示层转本地时区
- 颜色用预定义字符串 key（`EventColor`），不存 hex
- **`CategoryId = EventColor`**，永远同值
- 分类数量固定 6 个，不可增删
- Schema 变更通过 `db.version(N+1).stores({...}).upgrade(tx=>...)` 迁移

**Current schema (v21) — 共 16 张表：**

```
events:             id, startTime, endTime, projectId
categories:         id
settings:           id
weeklyEstimates:    id, weekStart, categoryId
projects:           id, categoryId, name, status, sortOrder, useCount, lastUsedAt
sops:               id, projectId
sopVersions:        id, sopId, version
inspirations:       id, projectId, eventId
mealRecords:        id, eventId
sleepRecords:       id, eventId
profiles:           id
outfitLogs:         id, date
hygieneLogs:        id, date
leisureLogs:        id, date
bodyMetricsRecords: id, date
todos:              id, status, dueDate, sortOrder, projectId
```

---

## 7. 测试约定

- 测试在 `__tests__/` 下，命名 `*.test.ts(x)`
- `domain/` 新增纯函数**必须**有测试（边界 + happy path）
- IndexedDB 测试用 `fake-indexeddb`（已配在 `test-setup.ts`）
- Repository 通过注入 fake Clock + IdGenerator 测试

---

## 8. 开发规范

### 8.1 永远先看再写
了解现有文件、理解当前模式再动手。本项目分层严格。

### 8.2 改之前确认范围
改 >100 行时先评估影响。涉及 schema 迁移、删文件、改公共类型需谨慎。

### 8.3 提交前自检
```bash
npm run lint && npm run test && npm run build
```

### 8.4 不要做的事
- 不引入新 npm 依赖（除非必要且已评估）
- 不在组件里写业务逻辑（应放 `domain/`）
- 不在 `domain/` 引入 React / 浏览器 API
- 不绕过 store 直接调 Repository
- 不用 `any` / `as unknown as` / `@ts-ignore`
- 不写防御性编程包 try-catch 吞错误
- 不提前抽象（YAGNI）

### 8.5 `index.html` `<style>` 禁全局选择器
Tailwind v4 用 `@layer` 管理样式。`index.html` 的 `<style>` 无 `@layer`（非 layered），**非 layered 样式无条件优先于 layered 样式**。`* { margin:0 }` 会杀死所有 Tailwind 间距工具类。所有规则必须 scope 到 `#splash-screen` 等容器选择器。

---

## 9. 核心产品需求

### 需求一：

### 需求二：

### 需求三：

### 需求四：

### 需求五：

---

## 10. 实现边界（坚决不做）

- 不引入标签 / 子分类 / 自定义分类数量
- 不引入 LLM 自动分类（仅关键词匹配）
- 不引入"计划 vs 实际"对比（仅估算偏差）
- 不引入 AI 通知 / 提醒 / 多设备同步
- 不引入 AI 聊天、对话式分析（v3.23 之后已彻底移除）
- 不引入全天事件 / 重复事件
- 不引入新的 npm 依赖（recharts、ical.js 已完成评估）
- 不在视图中添加名言/引言（用户明确要求删除并记住此偏好）

---

## 11. 路由表

| 路径 | 组件 | 说明 |
|---|---|---|
| `/` | `<Navigate to="/week">` | 重定向到周视图 |
| `/week` | `WeekView` | 周视图（默认）；`?view=day&date=...` 切日视图；`?week=...` 指定周 |
| `/action` | `ActionPage` | 待办事项 + 项目分组双视图 |
| `/stats` | `StatsPage` | 复盘仪表盘（4 Tab：作息/日常/身体/关联） |
| `/settings` | `SettingsPage` | 设置页（桌面/移动版） |
| `/projects/:projectId` | `ProjectDetailPage` | 项目详情（事件/SOP/灵感 3 Tab） |
| `/profile` | `ProfilePage` | 个人档案 |

**全局快捷键：** `1` → /week，`2` → /action，`3` → /stats，`Esc` → 回 /week（ProfilePage 自处理 Esc → /stats）

---

## 12. Schema 版本历史

| 版本 | 变更 |
|---|---|
| v1 | 初始，仅 events |
| v3 | +categories + settings，补 categoryId |
| v4 | keywords: string[] → folders: KeywordFolder[] |
| v5 | categories 补 weeklyBudget |
| v6 | +weeklyEstimates |
| v7 | events +endTime 索引 |
| v13 | +projects + events.projectId 索引 |
| v14 | +sops + sopVersions + inspirations |
| v16 | projects +useCount/lastUsedAt + mealRecords + sleepRecords |
| v17 | +profiles |
| v18 | +outfitLogs, hygieneLogs, leisureLogs, bodyMetricsRecords |
| v19 | +todos |
| v21 | 合并 taskGroups/taskGroupItems → projects/todos；projects +sortOrder；todos +projectId |
