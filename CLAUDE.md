# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. 项目是什么

**CaILens**（Calendar + Lens）是一个本地优先、克制安静的时间管理工具。灵感来自《奇特的一生》中柳比歇夫的时间统计法。

**产品哲学（不是装饰，是约束）：**

- 不做日程规划，不做团队协作，不催促用户。
- 用记录代替规划，用观察代替管理，用理解代替焦虑。
- 每一个新增的交互都应符合这条准则——不催促，不评价，只呈现事实。
- 代码质量优先于功能数量。宁可功能少，也要代码干净、类型严格、可维护。

当处于"加一个功能让它更全"和"保持克制不加"之间犹豫时，**默认选择不加**。

---

## 2. 技术栈

| 层   | 选型                                                              | 备注                                             |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------ |
| 框架 | React 19 + TypeScript 6（strict）                                 | 函数组件 + hooks，不允许 `any`                   |
| 构建 | Vite 8                                                            |                                                  |
| 样式 | Tailwind CSS v4 + 自定义 design tokens（CSS 变量）                | shadcn/ui 风格组件，**复制到项目里**而非作为依赖 |
| 状态 | Zustand v5                                                        | 切片订阅，避免不必要的重渲染                     |
| 存储 | IndexedDB（通过 Dexie v4）                                        | 本地优先，无后端                                 |
| 路由 | react-router-dom v7                                               | HashRouter，4 条路由 + settings 子路由            |
| 图表 | recharts v3                                                       | 仅 StatsPage + AI 内联图表使用                    |
| 日期 | date-fns v4                                                       | 不要引入 dayjs / moment                          |
| ICS  | ical.js v2                                                        | .ics 文件导入解析                                |
| 测试 | Vitest 4 + React Testing Library + fake-indexeddb                 | 440 个测试，26 个测试文件                         |
| 图标 | lucide-react                                                      |                                                  |
| AI   | react-markdown + remark-gfm + 原生 fetch SSE 流式解析             | 支持 DeepSeek / OpenAI / Claude / 自定义兼容     |
| 字体 | Inter（UI）+ Source Serif 4（阅读感文本）+ JetBrains Mono（时间） | 通过 Fontsource 本地托管                         |
| 桌面 | Tauri v2                                                          | Windows 打包                                     |
| 移动 | Capacitor v8                                                      | Android 打包                                     |

**依赖管理铁律：** 不要引入不必要的包。每加一个新依赖必须说明理由。**绝对不要引入** FullCalendar、Schedule-X、react-big-calendar 等日历库——周视图自己实现。

---

## 3. 命令

```bash
npm run dev          # 启动开发服务器（默认 http://localhost:5173）
npm run build        # 类型检查 + 生产构建（先 tsc -b 再 vite build）
npm run lint         # ESLint
npm run test         # 跑一次单元测试
npm run test:watch   # 监听模式
npm run preview      # 本地预览构建结果
npm run tauri:dev    # Tauri 开发模式（Windows）
npm run tauri:build  # Tauri 生产构建
npm run android:sync # Capacitor Android 同步
npm run android:open # Capacitor Android 打开
```

**跑单个测试文件：**

```bash
npm run test -- src/domain/__tests__/layout.test.ts
```

**提交前自检：**

```bash
npm run lint && npm run test && npm run build
```

---

## 4. 架构（依赖方向单向，必须遵守）

```
domain/  ──→  data/  ──→  stores/  ──→  features/ + components/
 (纯逻辑)    (Repository)   (Zustand)         (UI)
```

**规则：**

- **`src/domain/`** —— 纯类型 + 纯函数业务规则。**不依赖** React、不依赖 Dexie、不依赖任何浏览器 API。所有业务逻辑（时间计算、布局算法、统计计算、关键词匹配）放这里，必须有单元测试。
- **`src/data/`** —— Dexie schema + Repository。**整个项目里唯一直接和 IndexedDB 打交道的地方**。Repository 通过构造函数注入 `Clock` 和 `IdGenerator`，便于测试。
- **`src/stores/`** —— Zustand store，包装 Repository，对 UI 暴露 selectors 和 actions。**组件永远不直接调 Repository。**
- **`src/features/`** —— 业务功能组件（如 `week-view`、`day-view`、`ai-chat`、`quick-log`）。可以包含 hooks、子组件。
- **`src/components/`** —— 可复用的 UI 原语。`components/ui/` 是 shadcn 复制过来的，`components/calendar/` 是日历专用基础组件，`components/stats/` 是统计图表组件。
- **`src/pages/`** —— 路由页面组件（`StatsPage`）。
- **`src/hooks/`** —— 跨 feature 共享的 hooks。

**关键文件：**

| 层     | 文件                                         | 说明                                                              |
| ------ | -------------------------------------------- | ----------------------------------------------------------------- |
| domain | `src/domain/event.ts`                        | `CalendarEvent` 类型、`EventColor` 枚举                           |
| domain | `src/domain/category.ts`                     | `Category` 类型（含 `weeklyBudget` + `folders`）、`KeywordFolder`、`DEFAULT_CATEGORIES` |
| domain | `src/domain/settings.ts`                     | `AppSettings` 类型（language: zh/en）                             |
| domain | `src/domain/time.ts`                         | 时间工具（getDayStart、isSameDay、getWeekDays、formatTime 等）    |
| domain | `src/domain/layout.ts`                       | 重叠事件水平并排布局算法（纯函数）                                |
| domain | `src/domain/constants.ts`                    | 布局常量（SLOTS_PER_HOUR、TOTAL_SLOTS 等）                       |
| domain | `src/domain/stats.ts`                        | `computeWeekStats`、`computeDayStats`、`mergeIntervals`、`computeStreak`、`computeTypeSplit` |
| domain | `src/domain/estimate.ts`                     | `WeeklyEstimate` 类型、`computeDeviations`、`detectSystematicBias` |
| domain | `src/domain/maturity.ts`                     | `getDataMaturity` 数据成熟度分析（cold/warming/mature）          |
| domain | `src/domain/projection.ts`                   | `computeAnnualProjection` 年度投影（柳比歇夫基准 2200h）         |
| domain | `src/domain/quality.ts`                      | `computeRecordQuality` 记录质量指标                               |
| domain | `src/domain/reflection.ts`                   | `generateWeeklyReflection` 周反思文本生成                         |
| domain | `src/domain/icsImport.ts`                    | `parseIcs` + `classifyEvent`（关键词匹配自动归类）               |
| domain | `src/domain/migration.ts`                    | v1→v2 数据迁移（补 categoryId）                                   |
| domain | `src/domain/quickLog.ts`                     | `deriveDefaultTimes` + `deriveDefaultColor` 快速记录默认值推算   |
| domain | `src/domain/shortcuts.ts`                    | 键盘快捷键注册表（16 个可绑定操作、冲突检测、修饰键解析）        |
| domain | `src/domain/aiChat.ts`                       | AI 对话类型（AiConversation、AiChatMessage、PinnedAnalysis、MessageFeedback） |
| domain | `src/domain/eventSegment.ts`                 | 跨午夜事件分段算法（睡眠等跨天事件的视觉分段）                    |
| domain | `src/domain/minuteAxis.ts`                   | 分钟轴连续坐标系（跨天拖拽的数学基础）                            |
| domain | `src/domain/themes.ts`                       | 主题色定义（rust/ocean/forest/plum）                              |
| data   | `src/data/db.ts`                             | Dexie 数据库定义（v9 schema，含 AI 对话相关表）                   |
| data   | `src/data/eventRepository.ts`                | 事件 CRUD（依赖注入 Clock + IdGenerator）                         |
| data   | `src/data/categoryRepository.ts`             | 分类 CRUD（getAll、updateName、updateFolders、updateBudget）     |
| data   | `src/data/settingsRepository.ts`             | 设置 CRUD（get、update）                                          |
| data   | `src/data/estimateRepository.ts`             | 周估算 CRUD（getByWeek、upsert、getRecentHistory）               |
| data   | `src/data/aiConversationRepository.ts`       | AI 对话 CRUD（conversations、messages、pinnedAnalyses、feedback） |
| stores | `src/stores/eventStore.ts`                   | 全局事件状态（含自动关键词学习、ICS 导入、批量重新分类）         |
| stores | `src/stores/categoryStore.ts`                | 全局分类状态                                                      |
| stores | `src/stores/settingsStore.ts`                | 全局设置状态                                                      |
| stores | `src/stores/estimateStore.ts`                | 全局估算状态                                                      |
| stores | `src/stores/uiStore.ts`                      | UI 状态（侧边栏展开/固定、移动端开关）                           |
| stores | `src/stores/aiChatStore.ts`                  | AI 对话状态（流式响应、对话管理、提及解析、分析沉淀）            |
| hooks  | `src/hooks/useStatsAggregation.ts`           | 多粒度（周/月/季/年/全部）统计聚合 hook                          |
| UI     | `src/features/week-view/WeekView.tsx`        | 主视图入口（周视图）                                              |
| UI     | `src/features/week-view/WeekToolbar.tsx`     | 周导航栏 + 视图切换器 + 快速记录按钮 + 搜索入口                  |
| UI     | `src/features/week-view/WeekDateHeader.tsx`  | 周日期头                                                          |
| UI     | `src/features/week-view/WeekStats.tsx`       | 周统计卡片网格                                                    |
| UI     | `src/features/week-view/WeekStatsSidebar.tsx`| 周统计右侧边栏（总时长 + 分类分解条 + 连续记录）                 |
| UI     | `src/features/week-view/EventEditCard.tsx`   | 事件编辑弹窗（含分类选择器、草稿预览）                            |
| UI     | `src/features/week-view/EventDetailCard.tsx` | 事件详情弹窗                                                      |
| UI     | `src/features/day-view/DayView.tsx`          | 日视图（日记风格时间线）                                          |
| UI     | `src/features/settings/SettingsPage.tsx`     | 设置页面（标签式子路由：分类/外观/快捷键/数据/存储/关于）        |
| UI     | `src/features/settings/SettingsPopover.tsx`  | 设置弹窗（快捷入口）                                              |
| UI     | `src/features/settings/KeywordEditor.tsx`    | 关键词芯片编辑器                                                  |
| UI     | `src/features/settings/FolderKeywordEditor.tsx` | 文件夹关键词管理器（增删改名 + 拖拽）                           |
| UI     | `src/features/settings/CategoryNameEditor.tsx` | 分类名行内编辑器                                                |
| UI     | `src/features/app-shell/Sidebar.tsx`         | 左侧导航栏（hover 展开 + 固定 + 移动端 overlay）                 |
| UI     | `src/features/import-ics/ImportIcsDialog.tsx` | ICS 导入对话框（文件选择 → 预览 → 导入）                        |
| UI     | `src/features/quick-log/QuickLogDialog.tsx`  | 快速记录对话框（`n` 键触发，自动时间链、颜色继承、撤销 snackbar） |
| UI     | `src/features/search/CommandPalette.tsx`     | 命令面板（Ctrl+K，搜索事件 + 快速导航）                          |
| UI     | `src/features/ai-chat/AiChatDrawer.tsx`      | AI 时间助手右侧面板（流式 SSE、@提及、Markdown、内联图表）      |
| UI     | `src/pages/StatsPage.tsx`                    | 统计仪表盘（多粒度、多图表、合并组趋势、热力图）                  |
| hooks  | `src/features/week-view/hooks/useDragToMove.ts` | 拖拽移动事件                                                  |
| hooks  | `src/features/week-view/hooks/useDragToResize.ts` | 拖拽边缘改时长                                                |
| hooks  | `src/features/week-view/hooks/useEventDrag.ts` | 统一拖拽 hook（move + resize，分钟轴坐标系）                   |
| hooks  | `src/features/week-view/hooks/useWeekFromURL.ts` | URL 参数 `?week=YYYY-MM-DD` 同步                               |
| hooks  | `src/features/day-view/hooks/useDayFromURL.ts` | URL 参数 `?date=YYYY-MM-DD` 同步                               |

---

## 5. 已实现功能（以代码为准）

### 周视图
- 7 天，时间格子 0:00–24:00，默认滚动到 8:00–20:00
- 点击空白创建事件 → 弹出编辑弹窗
- 拖拽事件移动（含跨天拖拽，分钟轴连续坐标系，基于 Pointer Events 自实现）
- 拖事件上下边缘改变时长（可拖过午夜变为跨天事件）
- 拖动时实时预览（draft preview merge 进 effectiveEvents，60fps）
- 右键菜单（基于 `@radix-ui/react-context-menu`）：删除、复制、改颜色
- 当前时间红线（仅今日列，每整分钟更新）
- 上一周 / 下一周 / 本周 导航（状态在 URL 参数 `?week=YYYY-MM-DD`）
- 重叠事件水平并排（`domain/layout.ts` 纯函数算法）
- 跨天事件显示（睡眠等跨越午夜的事件，带箭头指示器和连续圆角）
- 周统计侧边栏 + 卡片网格（总时长、分类分解、连续周数）

### 快速记录
- `n` 键全局快捷键，任意页面打开快速记录对话框
- 时间链自动接续：从上一事件结束时间开始（≤4h 间隔），否则回退 `now-1h`→`now`
- 颜色与分类继承：默认取上一事件颜色，`Alt+1..6` 切换
- 标题 autofocus，Enter 保存，Esc 关闭
- 保存后 3 秒 undo snackbar，点击撤销即删除
- 工具栏 `+` 按钮入口

### 搜索 / 命令面板
- `Ctrl+K` / `Cmd+K` 全局快捷键唤起
- 关键词搜索匹配标题、描述、地点，大小写不敏感
- 点击结果跳转到对应周并打开事件详情
- 工具栏搜索图标入口

### 键盘快捷键系统
- 16 个可绑定操作（导航、视图切换、主题/语言、事件操作等）
- 设置页「快捷键」标签页：点击 pill 录制新绑定，冲突检测警告
- 单操作重置 + 一键重置全部
- 输入框/文本域中自动禁用，命令面板中实时显示当前绑定

### 日视图
- 日记风格时间线，每事件显示圆点 + 时间标签 + 内容
- 分类切换分隔线
- 上一天 / 下一天 导航（URL 参数 `?date=YYYY-MM-DD`）

### 统计仪表盘（`/stats`）
- 多周期：周、月、季、年、全部
- 多对比：上一周期、同比、均值
- 概览卡片（有效时间、核心聚焦、记录连续、周期总计）
- 时间分配（环图 + 堆叠条图）
- 柳比歇夫分析（Type I/II 拆分 + 年度投影）
- 节奏与日程（24h 能量分布、每周节律、热力图）
- 时间预算（预算 vs 实际、超支/未达标记）
- 合并组趋势图（自定义分类合计线，右键配置，堆叠面积 + 实线总计，持久化到 localStorage）
- 趋势（30 天滚动折线、分类 sparkline）
- 周回顾（反思文本）
- 估算 vs 实际（偏差检测、系统性偏差）
- 记录质量（事件数、平均粒度、实时率、覆盖率）
- 月度对比卡片
- 年度热力图（GitHub 贡献图范式，53×7 网格，5 级强度，年份切换）

### AI 时间助手
- 右侧滑入面板，多 AI 提供商（DeepSeek / OpenAI / Claude / 自定义兼容）
- 流式 SSE 响应，react-markdown + remark-gfm 渲染
- @ 提及：输入 `@` 引用分类、事件、日期或周，自动解析为结构化上下文
- 日历联动：点击事件或框选时间段自动带入对话
- 反向锚定：AI 提及关键词时 hover，日历中匹配事件高亮、非匹配变暗
- 内联数据可视化：百分比→迷你进度条，时间数字→彩色标签，对比数据→微型柱状图
- 上下文自适应按钮：空白→开场问题，分析后→深入追问，聊天后→本周分析
- 历史按周归档：折叠分组，搜索过滤，自动话题摘要
- Pin 分析到日记：重要 AI 分析固定到当天日视图，可取消固定
- 反馈系统：每条回复 👍/👎/🔄，数据存本地

### 数据成熟度
- `maturity.ts` 纯函数：cold（<3 天）、warming（3-13 天）、mature（14+ 天）
- 冷状态 UI 适配（MaturityPlaceholder 进度环、副本调整）

### 分类系统
- 6 个固定分类（CategoryId = EventColor），不可增删
- 双语名称（zh/en），用户可分别修改，上限 20 字符
- 默认分类名（中文/英文）：主要矛盾/Core Focus、次要矛盾/Support Tasks、庶务时间/Chores & Admin、个人提升/Personal Growth、休息娱乐/Rest & Leisure、睡眠时长/Sleep
- 每周预算（weeklyBudget，单位小时），用户可修改（1-168）
- 关键词文件夹系统（KeywordFolder）：每分类可有多个文件夹，每文件夹含关键词列表
- 自动关键词学习：创建/修改事件时自动将标题加入当前分类第一文件夹的关键词
- 批量重新分类：关键词变更后自动对所有历史事件重新匹配

### 设置页（`/settings`）
- 标签式子路由：分类、外观、快捷键、数据、存储、关于
- 外观：语言切换（中文/English）、主题切换（浅色/深色）、主题色四选一（rust/ocean/forest/plum）
- 分类：名称行内编辑、每周预算滑块（BudgetBar）、关键词文件夹管理（增删改名 + 拖拽跨文件夹移动）
- 快捷键：查看和自定义所有绑定，冲突检测
- 数据：CSV/JSON 导出
- 存储：IndexedDB 存储信息概览

### ICS 导入
- 解析 .ics 文件（基于 ical.js）
- 跳过全天事件和重复事件（记录跳过数量）
- 事件名聚合导入（按事件名分组，一行分类覆盖全部同类事件）
- 智能预填建议（关键词匹配自动猜分类）
- 关键词匹配自动归类（classifyEvent）
- 四步状态机：空闲 → 预览 → 导入中 → 完成
- 事件覆盖度进度条、搜索过滤、同名单例覆盖

### 侧边栏
- 桌面端 hover 展开（200ms 延迟）+ 固定按钮
- 移动端汉堡菜单 overlay
- 导航：本周、上一周、下一周
- 工具：ICS 导入、统计仪表盘
- 底部：设置入口、固定开关

### 其他
- 浅色 / 深色模式（CSS class `.dark`）+ 4 种主题色
- 双语 UI（中文 / English，通过 `t(zh, en)` 辅助函数）
- 440 个单元测试（26 个测试文件，覆盖 domain / data / hooks）
- CSV / JSON 数据导出
- Tauri 桌面打包（Windows）+ Capacitor Android 打包

### 当前没有的（且不打算近期做）

全天事件、重复事件、月/年日历视图、日程视图、团队协作、通知/提醒、多设备同步、多用户、AI 自动分类（基于 LLM）、自定义分类数量。

---

## 6. 数据模型现状

```typescript
// src/domain/event.ts
export type EventColor = "accent" | "sage" | "sand" | "sky" | "rose" | "stone";

export interface CalendarEvent {
  id: string; // crypto.randomUUID()
  title: string;
  startTime: number; // UTC ms
  endTime: number; // UTC ms
  color: EventColor;
  categoryId: EventColor; // 与 color 同值（CategoryId = EventColor），永远同步
  description?: string;
  location?: string;
  createdAt: number; // UTC ms
  updatedAt: number; // UTC ms
}
```

```typescript
// src/domain/category.ts
export type CategoryId = EventColor; // 6 个固定分类，id 与 EventColor 一一对应

export interface CategoryName {
  zh: string
  en: string
}

export interface KeywordFolder {
  id: string       // unique within the category
  name: string     // user-editable folder name
  keywords: string[]
}

export interface Category {
  id: CategoryId
  name: CategoryName
  color: EventColor     // 固定，与 id 同值
  weeklyBudget: number  // 每周预算（小时）
  folders: KeywordFolder[]
}

export const DEFAULT_CATEGORIES = [
  { id: "accent", name: { zh: "主要矛盾", en: "Core Focus"       }, color: "accent", weeklyBudget: 20, folders: [{ id: "default", name: "默认", keywords: [] }] },
  { id: "sage",   name: { zh: "次要矛盾", en: "Support Tasks"    }, color: "sage",   weeklyBudget: 10, folders: [{ id: "default", name: "默认", keywords: [] }] },
  { id: "sand",   name: { zh: "庶务时间", en: "Chores & Admin"   }, color: "sand",   weeklyBudget: 5,  folders: [{ id: "default", name: "默认", keywords: [] }] },
  { id: "sky",    name: { zh: "个人提升", en: "Personal Growth"  }, color: "sky",    weeklyBudget: 5,  folders: [{ id: "default", name: "默认", keywords: [] }] },
  { id: "rose",   name: { zh: "休息娱乐", en: "Rest & Leisure"   }, color: "rose",   weeklyBudget: 5,  folders: [{ id: "default", name: "默认", keywords: [] }] },
  { id: "stone",  name: { zh: "睡眠时长", en: "Sleep"            }, color: "stone",  weeklyBudget: 3,  folders: [{ id: "default", name: "默认", keywords: [] }] },
] as const;
```

```typescript
// src/domain/settings.ts
export interface AppSettings {
  id: "default"; // singleton — Dexie primary key
  language: AppLanguage; // 'zh' | 'en'
}
```

```typescript
// src/domain/estimate.ts
export interface WeeklyEstimate {
  id: string
  weekStart: number // UTC ms (Monday 00:00)
  categoryId: EventColor
  estimatedHours: number
  createdAt: number
}
```

```typescript
// src/domain/aiChat.ts
export interface AiConversation {
  id: string
  weekStart: number
  updatedAt: number
  messages: AiChatMessage[]
}

export interface AiChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  feedback?: 'like' | 'dislike' | null
}

export interface PinnedAnalysis {
  id: string
  date: number           // UTC ms (day start)
  conversationId: string
  messageId: string
  content: string        // rendered markdown
  createdAt: number
}

export interface MessageFeedback {
  id: string
  messageId: string
  rating: 'like' | 'dislike' | 'regenerate'
  createdAt: number
}
```

**Dexie schema（`src/data/db.ts`）当前是 version 9：**

```typescript
this.version(1).stores({ events: "id, startTime" });

// v3: 新增 categories + settings 表，迁移 v1 events 补 categoryId
// v4: categories.keywords: string[] → folders: KeywordFolder[]
// v5: 已有 categories 补 weeklyBudget 默认值
// v6: 新增 weeklyEstimates 表
// v7: events 表新增 endTime 索引（QuickLog getLatest 查询用）
// v8: 新增 conversations + chatMessages 表（AI 对话系统）
// v9: 新增 pinnedAnalyses + messageFeedback 表（分析沉淀 + 消息反馈）
this.version(9).stores({
  events:          "id, startTime, endTime",
  categories:      "id",
  settings:        "id",
  weeklyEstimates: "id, weekStart, categoryId",
  conversations:   "id, weekStart, updatedAt",
  chatMessages:    "id, conversationId, createdAt",
  pinnedAnalyses:  "id, date, conversationId",
  messageFeedback: "id, messageId",
});
```

**关键约束：**

- 所有时间存 **UTC 毫秒时间戳**，不存字符串。仅显示层转本地时区。
- 颜色用预定义字符串 key，不存 hex。hex 在 CSS 变量里（见第 7 节）。
- 任何 schema 变更必须通过 `db.version(N+1).stores({...}).upgrade(tx => ...)` 进行迁移，不允许破坏性变更。
- CategoryId = EventColor，两者永远同值，不得分离。
- 全新 DB 通过 `on('populate')` 播种默认分类和设置；`on('ready')` 兜底补种。
- 分类数量固定 6 个，不可增删。

---

## 7. UI / 设计系统

**Design tokens 定义在 `src/index.css`**（CSS 变量），通过 Tailwind 自定义类访问（如 `bg-surface-base`、`text-text-primary`、`bg-event-accent-bg`）。

**色彩规则：**

- 浅色背景 `#f0ece4`，深色背景 `#2a2824`。**暖中性色调**。
- 主色（accent）`#c96442` —— 仅用于关键行动（保存、当前时间线），不滥用。
- 6 种事件颜色（accent / sage / sand / sky / rose / stone）—— 每种有 `bg`、`text`、`fill` 三个变量，必须配对使用以保证对比度。
- 状态色彩：success `#2D7D46`、danger `#B53535`、info `#3A5A80`
- 4 种主题色（`src/domain/themes.ts`）：rust（默认 `#c96442`）、ocean、forest、plum
- **新增 UI 必须同时定义 `:root`（浅色）和 `.dark`（深色）下的所有变量。**

**字体：**

- `font-sans`（Inter）—— UI 文本、按钮、表单
- `font-serif`（Source Serif 4）—— 事件标题、备注、分类名等"阅读感"文本
- `font-mono`（JetBrains Mono）—— 时间数字

**视觉克制原则：**

- 圆角 `rounded-lg` 居多，不要 `rounded-full` 大块面积
- 不用纯黑边框，用 `border-border-subtle` 或 `border-border-default`
- 不用阴影做层次（用 surface 三层：`base` / `raised` / `sunken`）
- 不用饱和度高的色彩
- 过渡 200–400ms ease-out，**不弹跳**
- 不用 emoji 装饰 UI
- **移动端不优先支持**，但桌面端宽度变小时不能崩溃

---

## 8. 测试约定

- 测试文件**与被测代码同目录**的 `__tests__/` 子目录下，命名 `*.test.ts(x)`
- `domain/` 层任何新增纯函数**必须**有单元测试（边界 + happy path 至少各一个）
- 涉及 IndexedDB 的测试用 `fake-indexeddb`（已在 `test-setup.ts` 配置）
- 涉及组件的测试用 `@testing-library/react`，避免测试实现细节，测试用户视角行为
- Repository 通过依赖注入测试（注入 fake `Clock` 和 `IdGenerator`），见 `data/__tests__/eventRepository.test.ts`

---

## 9. 开发规范

### 9.1 永远先看再写

开发前先了解相关现有文件，理解当前模式再动手。本项目分层严格，不熟悉架构容易违反依赖方向。

### 9.2 改之前先确认范围

- 修改一个文件超过 100 行时，先评估影响范围
- 涉及 schema 迁移、删除文件、改公共类型时，需谨慎确认
- 不要"顺手"重构无关代码

### 9.3 提交前自检

写完一个功能后，自己跑一遍：

```bash
npm run lint && npm run test && npm run build
```

### 9.4 不要做的事

- 不要引入新的 npm 依赖，除非必要且经过评估
- 不要把业务逻辑写在组件里（应该在 `domain/`）
- 不要在 `domain/` 引入 React 或浏览器 API
- 不要绕过 store 直接调 Repository
- 不要用 `any`、`as unknown as`、`@ts-ignore` 蒙混类型问题
- 不要写"防御性编程"包一堆 try-catch 吞掉错误
- 不要为了"灵活"提前抽象，YAGNI

### 9.5 关于注释

代码本身要清晰到几乎不需要注释。**只在以下情况写注释：**

- 解释"为什么"而不是"是什么"
- 边界条件和非显然的不变量
- 引用具体的设计决策来源

### 9.6 index.html 的 `<style>` 标签：禁止全局选择器

Tailwind v4 把所有样式（preflight、工具类、组件）放在 `@layer` 里。`index.html` 里的 `<style>` 标签没有 `@layer`，属于「非 layered 样式」。

**CSS 级联层的铁律：非 layered 样式无条件优先于 layered 样式，无论选择器优先级多高。** `* { margin: 0 }`（非 layered, 0,0,0）会覆盖 `.mx-auto { margin: auto }`（layered, 0,1,0）。

因此 `index.html` 的 `<style>` 中：

- **禁止** `*`、`html`、`body`、裸标签选择器——会泄漏到整个应用，杀死所有 Tailwind 间距工具类
- **必须**把所有规则 scope 到 `#splash-screen` 或 `.splash-*` 等容器选择器内
- CSS 自定义属性（`--splash-*`）定义在 `:root` 上可以接受——仅声明变量、不设置属性，不影响布局

**2026-05 事故记录：** 启动画面 `<style>` 里加了 `*, *::before, *::after { margin: 0; padding: 0; }`，导致三个页面的所有 Tailwind `m-*`/`p-*`/`mx-auto` 等间距工具类全部失效，内容贴左、内边距归零。修复就是删除这条全局 reset。

---

## 10. 当前版本 — v3.14

**版本主题：从记录到理解。** 在稳定的事件记录基础上，增加了多视图、统计仪表盘、关键词智能归类、周估算和反思系统、AI 时间助手。

### 核心架构决策

- **关键词自动归类**：事件标题通过关键词匹配自动映射到分类（`classifyEvent`）。创建/修改事件时自动学习新关键词到分类第一文件夹。
- **数据成熟度**：`maturity.ts` 定义 cold/warming/mature 三级阈值，UI 据此调整显示内容和副本语气。
- **统计聚合**：`useStatsAggregation` hook 支持 week/month/quarter/year/all 五种粒度，统一处理裁剪、去重、按分类聚合。
- **估算系统**：用户可为每分类设每周估算小时数，统计页展示偏差并检测系统性偏差（连续 3 周 ±30%）。
- **柳比歇夫投影**：Type I（主要矛盾 + 个人提升）年度小时投影，与柳比歇夫 1966 年基准 2200 小时对比。
- **周反思**：`generateWeeklyReflection` 纯函数生成双语反思文本，含总量变化、分类排名、预算超支/零记录、Type I/II 比例、最大增益分类和尾句引用。
- **分钟轴坐标系**：`minuteAxis.ts` 定义 0..7×1440 连续整数轴，跨天拖拽退化为加减法。ghost 浮层 rAF 直接操作 DOM，不触发 React 重渲染。
- **事件分段**：`eventSegment.ts` 处理睡眠等跨午夜事件的视觉分段，自动计算 displayStart/displayEnd。
- **AI 对话系统**：流式 SSE 多提供商、提示词构建器（系统 + 画像 + 技能 + 自定义）、上下文注入（提及 + 日历选区）、对话存储与归档。
- **快捷键系统**：`shortcuts.ts` 定义 16 个可绑定操作，修饰键解析、冲突检测、录制与重置，输入框中自动禁用。

### 实现边界（坚决不做）

- 不引入标签 / 子分类 / 自定义分类数量（永远固定 6 个）
- 不引入自动分类（基于 LLM 识别标题）—— 仅用关键词匹配
- 不引入"计划 vs 实际"对比功能（仅估算 vs 实际偏差）
- 不引入跨周/月自动反思生成
- 不引入 AI 通知 / 提醒 / 多设备同步
- 不引入全天事件 / 重复事件
- 不引入新的 npm 依赖（recharts、ical.js、react-markdown、remark-gfm 已完成评估引入）

### 路由表

| 路径        | 组件           | 说明           |
| ----------- | -------------- | -------------- |
| `/`         | `WeekView`     | 周视图（默认） |
| `/day`      | `DayView`      | 日视图         |
| `/stats`    | `StatsPage`    | 统计仪表盘     |
| `/settings` | `SettingsPage` | 设置页面       |

### schema 版本历史

| 版本 | 变更                                                   |
| ---- | ------------------------------------------------------ |
| v1   | 初始 schema，仅 `events` 表                            |
| v3   | 新增 `categories` + `settings`，events 补 categoryId   |
| v4   | categories.keywords: string[] → folders: KeywordFolder[] |
| v5   | categories 补 weeklyBudget                            |
| v6   | 新增 `weeklyEstimates` 表                              |
| v7   | events 新增 endTime 索引                               |
| v8   | 新增 `conversations` + `chatMessages`（AI 对话系统）   |
| v9   | 新增 `pinnedAnalyses` + `messageFeedback`（分析沉淀 + 反馈） |

> v2 被跳过——upgrade 内异步写入不可靠，直接升到 v3。
