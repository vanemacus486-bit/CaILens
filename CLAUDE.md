# CalLens 项目指引

## 1. 项目哲学

**从被动的时间记录器 → 主动的生活方式调节器。**

作息是结果而非原因，直接干预作息无效。CalLens 的核心是通过捕捉和分析上游生活变量（饮食、社交、屏幕、运动、情绪等），帮助用户理解作息漂移的源头，达成长期稳定规律的作息。

- 不做日程规划、团队协作、催促用户
- **用记录代替规划，用观察代替管理，用理解代替焦虑**
- **输入优先于输出**：所有功能服务于"理解上游输入变量"，而非更精细地展示下游结果
- **可解释优于精确**：分析结论必须用一句白话讲清楚，不依赖黑箱模型
- **稳态优于冲刺**：指标设计鼓励长期稳定，而非短期高强度
- **工具有限，生活无限**：工具呈现因果信号，不替用户做决定；留出"不被工具审视"的空间
- 代码质量优先于功能数量
- 在"加功能"和"保持克制"之间犹豫时，**默认不加**

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
| AI | react-markdown + remark-gfm + 原生 fetch SSE | 支持 DeepSeek/OpenAI/Claude |
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
domain/  ──→  data/  ──→  stores/  ──→  features/ + components/
(纯逻辑)    (Repository)   (Zustand)         (UI)
```

**核心规则：**
- **`src/domain/`** — 纯类型 + 纯函数，不依赖 React/Dexie/浏览器 API。必须有测试。
- **`src/data/`** — 唯一操作 IndexedDB 的地方。Repository 构造函数注入 `Clock` + `IdGenerator`。
- **`src/stores/`** — Zustand 包装 Repository。组件永不直接调 Repository。
- **`src/features/`** — 业务功能组件（week-view、day-view、ai-chat、quick-log、settings、sop 等）。
- **`src/components/`** — 可复用 UI 原语。`ui/` shadcn 复制，`calendar/` 日历组件，`stats/` 图表，`plan/` 方案相关。

**关键领域模块（仅列存在文件，❌ 标记为待实现的产品需求）：**

| 文件 | 作用 |
|---|---|
| `domain/event.ts` | `CalendarEvent` 类型，`EventColor` 枚举 |
| `domain/category.ts` | `Category` 类型，`weeklyBudget`, `KeywordFolder` |
| `domain/settings.ts` | `AppSettings`（language: zh/en） |
| `domain/time.ts` | 时间工具（getDayStart, formatTime 等） |
| `domain/stats.ts` | computeWeekStats, computeDayStats, computeTypeSplit |
| `domain/estimate.ts` | `WeeklyEstimate` 估算类型 |
| `domain/project.ts` | `Project` 项目类型 |
| `domain/sop.ts` | `SOP`, `SOPVersion` 流程 |
| `domain/inspiration.ts` | `InspirationLog` 灵感记录 |
| `domain/aiChat.ts` | `AiChatMessage`, `AnchorMatch` AI 聊天 |
| `domain/standardWeek.ts` | 标准周计算 |
| `domain/profile.ts` | 用户档案 |
| ❌ `dailyContext.ts` | 待实现 — 每日生活上下文 |
| ❌ `plan.ts` | 待实现 — 方案系统 |
| ✅ `todo.ts` | ✅ 已实现 — 待办事项系统 |
| ❌ `planReview.ts` | 待实现 — 方案复盘 |
| ❌ `steadyMetrics.ts` | 待实现 — 稳态指标 |
| ❌ `correlation.ts` | 待实现 — 关联分析 |

**关键存储/状态文件：**

| 文件 | 作用 |
|---|---|
| `data/db.ts` | Dexie schema（当前 v19），含 14 张表 |
| `stores/eventStore.ts` | 全局事件状态 |
| `stores/categoryStore.ts` | 全局分类状态 |
| `stores/settingsStore.ts` | 全局设置状态 |
| `hooks/useStatsAggregation.ts` | 多粒度统计聚合 hook |
| `stores/todoStore.ts` | 待办状态 |

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

**Current schema (v17) — 共 11 张表：**

```
events:            id, startTime, endTime, typedData, projectId
categories:        id
settings:          id
weeklyEstimates:   id, weekStart, categoryId
projects:          id, categoryId, name, status, useCount, lastUsedAt
sops:              id, projectId
sopVersions:       id, sopId, version
inspirations:      id, projectId, eventId
mealRecords:       id, eventId
sleepRecords:      id, eventId
profiles:          id
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

### ✅ 近期完成

| 日期 | 变更 | 文件 |
|------|------|------|
| 今日 | **日常 Tab UI 重构**：复盘页面的"日常"Tab 从四卡片垂直堆叠改为二级 pills 切换模式（饮食/穿搭/卫生/娱乐），与"作息"Tab 的 UI 结构保持一致 | `EasternStatsShell.tsx`、`StatsPage.tsx` |

### 需求一：每日生活上下文记录（❌ 待实现）
在事件记录之外，新增轻量级每日上下文层——`DailyContext` 包含 12 个可选字段：
- 饮食、社交接触强度、户外时长、运动强度、情绪基调、屏幕使用情况、爱好、着装、清洁、人际圈、特殊备注
- **关键约束**：每日记录耗时目标 20 秒内，使用滑块（1-5 评分）+ 标签选择 + 自由文本
- **当前状态**：domain、data、store、UI 全部未实现

### 需求二：输入-输出关联分析（❌ 待实现）
自动分析生活变量与作息指标的显著相关。
- **关联引擎**：`domain/correlation.ts` — 待实现
- **洞察展示**：待实现
- **设计原则**：结论可解释、可操作，声明相关性不等于因果

### 需求三：方案层 + TODO 层 + 标准周对照（⚠️ 部分实现）
- **方案系统**：`domain/plan.ts` + `stores/planStore.ts` — 待实现
- **TODO 系统**：`domain/todo.ts` + `stores/todoStore.ts` + `pages/action/ActionPage.tsx` — **✅ 已实现**
- **方案执行率**：`domain/planExecution.ts` — 待实现
- **方案复盘**：`domain/planReview.ts` — 待实现（偏差源分析、漂移类型、复裁判定）
- **跨方案联动分析**：`domain/crossPlanAnalysis.ts` — 待实现
- **标准周蓝图**：DB 表待加 — 用户可编辑的理想日程模板
- **贴合度**：待实现

### 需求四：稳态指标（⚠️ 部分实现）
替代旧的"连续天数"冲刺型指标。
- **稳态指标面板**：`src/components/stats/SteadyMetricsPanel.tsx` — 存在但为空壳（返回 null），待填充
- **指征仪表盘**：`components/plan/PlanIndicatorDashboard.tsx` — 待创建
- **记录质量**：`domain/quality.ts` — 待实现
- **漂移可视化**：漂移速度（分钟/周）+ 预测时间 + 方向（推迟/提前/稳定）— 待实现

### 需求五：克制模式（❌ 待实现）
允许用户在某些时段只记录、不被分析、不被对照、不被警告。

---

## 10. 实现边界（坚决不做）

- 不引入标签 / 子分类 / 自定义分类数量
- 不引入 LLM 自动分类（仅关键词匹配）
- 不引入"计划 vs 实际"对比（仅估算偏差）
- 不引入 AI 通知 / 提醒 / 多设备同步
- 不引入全天事件 / 重复事件
- 不引入新的 npm 依赖（recharts、ical.js、react-markdown 已完成评估）
- 不在视图中添加名言/引言（用户明确要求删除并记住此偏好）

---

## 11. 路由表

| 路径 | 组件 | 说明 |
|---|---|---|
| `/` | `WeekView` | 周视图（默认） |
| `/day` | `DayView` | 日视图 |
| `/stats` | `StatsPage` | 统计仪表盘 |
| `/settings` | `SettingsPage` | 设置页 |
| `/action` | `ActionPage` | 待办事项 |

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
