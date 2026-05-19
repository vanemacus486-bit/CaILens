# CaILens 项目指引

## 1. 项目哲学

本地优先、克制安静的时间管理工具。灵感来自柳比歇夫时间统计法。

- 不做日程规划、团队协作、催促用户
- 用记录代替规划，用观察代替管理，用理解代替焦虑
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
npm run tauri:build  # Tauri 生产构建（慢！仅用户要求时跑）
npm run test -- src/domain/__tests__/layout.test.ts  # 单文件测试
```

**提交前自检：** `npm run lint && npm run test && npm run build`

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
- **`src/features/`** — 业务功能组件（week-view、day-view、ai-chat、quick-log）。
- **`src/components/`** — 可复用 UI 原语。`ui/` shadcn 复制，`calendar/` 日历组件，`stats/` 图表。

**关键架构文件：**

| 文件 | 作用 |
|---|---|
| `domain/event.ts` | `CalendarEvent` 类型，`EventColor` 枚举 |
| `domain/category.ts` | `Category` 类型，`weeklyBudget`, `KeywordFolder` |
| `domain/settings.ts` | `AppSettings`（language: zh/en） |
| `domain/time.ts` | 时间工具（getDayStart, formatTime 等） |
| `domain/stats.ts` | computeWeekStats, computeDayStats, computeTypeSplit |
| `data/db.ts` | Dexie schema（当前 v9），含所有表定义 |
| `stores/eventStore.ts` | 全局事件状态 |
| `stores/categoryStore.ts` | 全局分类状态 |
| `stores/settingsStore.ts` | 全局设置状态 |
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

**Current schema (v9):**
```
events: id, startTime, endTime
categories: id
settings: id
weeklyEstimates: id, weekStart, categoryId
conversations: id, weekStart, updatedAt
chatMessages: id, conversationId, createdAt
pinnedAnalyses: id, date, conversationId
messageFeedback: id, messageId
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

## 9. 实现边界（坚决不做）

- 不引入标签 / 子分类 / 自定义分类数量
- 不引入 LLM 自动分类（仅关键词匹配）
- 不引入"计划 vs 实际"对比（仅估算偏差）
- 不引入 AI 通知 / 提醒 / 多设备同步
- 不引入全天事件 / 重复事件
- 不引入新的 npm 依赖（recharts、ical.js、react-markdown 已完成评估）

---

## 10. 路由表

| 路径 | 组件 | 说明 |
|---|---|---|
| `/` | `WeekView` | 周视图（默认） |
| `/day` | `DayView` | 日视图 |
| `/stats` | `StatsPage` | 统计仪表盘 |
| `/settings` | `SettingsPage` | 设置页 |

## Schema 版本历史

| 版本 | 变更 |
|---|---|
| v1 | 初始，仅 events |
| v3 | +categories + settings，补 categoryId |
| v4 | keywords: string[] → folders: KeywordFolder[] |
| v5 | categories 补 weeklyBudget |
| v6 | +weeklyEstimates |
| v7 | events +endTime 索引 |
| v8 | +conversations + chatMessages |
| v9 | +pinnedAnalyses + messageFeedback |
