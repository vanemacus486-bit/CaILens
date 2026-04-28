# CLAUDE.md

本文件供 Claude Code 在本项目中工作时参考。**每次会话开始时优先阅读本文件**。

---

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

| 层 | 选型 | 备注 |
|---|---|---|
| 框架 | React 19 + TypeScript（strict） | 函数组件 + hooks，不允许 `any` |
| 构建 | Vite 8 | |
| 样式 | Tailwind CSS v4 + 自定义 design tokens（CSS 变量） | shadcn/ui 风格组件，**复制到项目里**而非作为依赖 |
| 状态 | Zustand v5 | 切片订阅，避免不必要的重渲染 |
| 存储 | IndexedDB（通过 Dexie v4） | 本地优先，无后端 |
| 日期 | date-fns v4 | 不要引入 dayjs / moment |
| 测试 | Vitest + React Testing Library + fake-indexeddb | |
| 图标 | lucide-react | |
| 字体 | Inter（UI）+ Source Serif 4（阅读感文本）+ JetBrains Mono（时间） | 通过 Fontsource 本地托管 |

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
```

**跑单个测试文件：**
```bash
npm run test -- src/domain/__tests__/layout.test.ts
```

**改完任何代码后，提交前必须本地通过：**
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

- **`src/domain/`** —— 纯类型 + 纯函数业务规则。**不依赖** React、不依赖 Dexie、不依赖任何浏览器 API。所有业务逻辑（时间计算、布局算法、统计计算）放这里，必须有单元测试。
- **`src/data/`** —— Dexie schema + Repository。**整个项目里唯一直接和 IndexedDB 打交道的地方**。Repository 通过构造函数注入 `Clock` 和 `IdGenerator`，便于测试。
- **`src/stores/`** —— Zustand store，包装 Repository，对 UI 暴露 selectors 和 actions。**组件永远不直接调 Repository。**
- **`src/features/`** —— 业务功能组件（如 `week-view`）。可以包含 hooks、子组件。
- **`src/components/`** —— 可复用的 UI 原语。`components/ui/` 是 shadcn 复制过来的，`components/calendar/` 是日历专用基础组件。

**关键文件：**

| 层 | 文件 | 说明 |
|---|---|---|
| domain | `src/domain/event.ts` | `CalendarEvent` 类型、`EventColor` 枚举 |
| domain | `src/domain/time.ts` | 时间工具（getDayStart、isSameDay、getWeekDays 等） |
| domain | `src/domain/layout.ts` | 重叠事件水平并排布局算法（纯函数） |
| domain | `src/domain/category.ts` | `Category` 类型、`DEFAULT_CATEGORIES`、`CATEGORY_NAME_MAX_LENGTH` |
| domain | `src/domain/settings.ts` | `AppSettings` 类型（language: zh/en） |
| domain | `src/domain/stats.ts` | `computeWeekStats` 周统计纯函数、`mergeIntervals` |
| domain | `src/domain/migration.ts` | v1→v2 数据迁移（补 categoryId） |
| data | `src/data/db.ts` | Dexie 数据库定义（v3 schema） |
| data | `src/data/eventRepository.ts` | 事件 CRUD（依赖注入 Clock + IdGenerator） |
| data | `src/data/categoryRepository.ts` | 分类 CRUD（getAll、updateName） |
| data | `src/data/settingsRepository.ts` | 设置 CRUD（get、update） |
| stores | `src/stores/eventStore.ts` | 全局事件状态 |
| stores | `src/stores/categoryStore.ts` | 全局分类状态 |
| stores | `src/stores/settingsStore.ts` | 全局设置状态 |
| UI | `src/features/week-view/WeekView.tsx` | 主视图入口 |
| UI | `src/features/week-view/EventEditCard.tsx` | 事件编辑 Popover（含分类选择器） |
| UI | `src/features/week-view/EventDetailCard.tsx` | 事件详情 Popover |
| UI | `src/features/week-view/StatsBar.tsx` | 单条统计条 |
| UI | `src/features/week-view/WeekStats.tsx` | 周统计面板 |
| UI | `src/features/week-view/WeekDateHeader.tsx` | 周日期头 |
| UI | `src/features/app-shell/Sidebar.tsx` | 左侧导航栏 |
| UI | `src/features/settings/SettingsPopover.tsx` | 设置弹窗（语言切换 + 分类改名） |
| hooks | `src/features/week-view/hooks/useDragToMove.ts` | 拖拽移动事件 |
| hooks | `src/features/week-view/hooks/useDragToResize.ts` | 拖拽边缘改时长 |
| hooks | `src/features/week-view/hooks/useWeekFromURL.ts` | URL 参数 `?week=YYYY-MM-DD` 同步 |

---

## 5. 第一版已实现的功能（**完整清单**，注意：以代码为准，不以早期 PLAN.md 为准）

- 周视图（7 天，时间格子 0:00–24:00，默认滚动到 8:00–20:00）
- **点击空白创建事件** → 弹出 Popover（不是 Sheet）
- **双击事件 inline 改名**
- **拖拽事件移动**（含跨天拖拽，基于 Pointer Events 自实现）
- **拖事件上下边缘改变时长**
- **拖动时实时预览**（draft preview merge 进 effectiveEvents，60fps）
- **右键菜单**（基于 `@radix-ui/react-context-menu`）：删除、复制、改颜色
- 事件字段：`id` `title` `startTime`（UTC ms） `endTime`（UTC ms） `color`（6 种枚举） `categoryId`（与 color 同值） `description?` `location?` `createdAt` `updatedAt`
- 当前时间红线（仅今日列，每整分钟更新）
- 上一周 / 下一周 / 本周 导航（状态在 URL 参数 `?week=YYYY-MM-DD`）
- 重叠事件水平并排（`domain/layout.ts` 纯函数算法）
- 浅色 / 深色模式
- 500+ 单元测试（domain、data、hooks 都有覆盖，24 个测试文件全部通过）

**第一版没有的（要保留这种"没有"）：**

全天事件、跨天事件、重复事件、日/月/年/日程视图、导入导出、分类/标签、统计、AI、通知、提醒、多设备同步、多用户。

> **注：** PLAN.md 中的 `allDay: boolean` 字段**未实际实现**，`CalendarEvent` 没有这个字段。如果第二版用不到，不要补。

---

## 6. 数据模型现状

```typescript
// src/domain/event.ts
export type EventColor = 'accent' | 'sage' | 'sand' | 'sky' | 'rose' | 'stone'

export interface CalendarEvent {
  id: string              // crypto.randomUUID()
  title: string
  startTime: number       // UTC ms
  endTime: number         // UTC ms
  color: EventColor
  categoryId: EventColor  // 第二版新增，与 color 同值（CategoryId = EventColor）
  description?: string
  location?: string
  createdAt: number       // UTC ms
  updatedAt: number       // UTC ms
}
```

```typescript
// src/domain/category.ts
export type CategoryId = EventColor   // 6 个固定分类，id 与 EventColor 一一对应

export interface Category {
  id: CategoryId
  name: CategoryName     // { zh: string, en: string }，用户可改名
  color: EventColor      // 固定，与 id 同值
}

export const DEFAULT_CATEGORIES = [
  { id: 'accent', name: { zh: '核心工作', en: 'Core Work'       }, color: 'accent' },
  { id: 'sage',   name: { zh: '辅助工作', en: 'Support Work'    }, color: 'sage'   },
  { id: 'sand',   name: { zh: '必要事务', en: 'Essentials'      }, color: 'sand'   },
  { id: 'sky',    name: { zh: '阅读学习', en: 'Reading & Study' }, color: 'sky'    },
  { id: 'rose',   name: { zh: '休息',     en: 'Rest'            }, color: 'rose'   },
  { id: 'stone',  name: { zh: '其他',     en: 'Other'           }, color: 'stone'  },
] as const
```

```typescript
// src/domain/settings.ts
export interface AppSettings {
  id: 'default'           // singleton — Dexie primary key
  language: AppLanguage   // 'zh' | 'en'
}
```

**Dexie schema（`src/data/db.ts`）当前是 version 3：**
```typescript
this.version(1).stores({
  events: 'id, startTime',
})

// v3: 新增 categories + settings 表，含数据迁移
this.version(3).stores({
  events:     'id, startTime',
  categories: 'id',
  settings:   'id',
}).upgrade(async (tx) => {
  // 1. 给 v1 遗留 events 补 categoryId
  // 2. 迁移 v2 dev 数据库的 categories.name string → {zh, en}
  // 3. 播种 settings
})
// 全新 DB 通过 on('populate') 播种默认分类和设置
// on('ready') 兜底：如果 upgrade 内写入不可靠时补种
```

**关键约束：**

- 所有时间存 **UTC 毫秒时间戳**，不存字符串。仅显示层转本地时区。
- 颜色用预定义字符串 key，不存 hex。hex 在 CSS 变量里（见第 7 节）。
- 任何 schema 变更必须通过 `db.version(N+1).stores({...}).upgrade(tx => ...)` 进行迁移，不允许破坏性变更。

---

## 7. UI / 设计系统

**Design tokens 定义在 `src/index.css`**（CSS 变量），通过 Tailwind 自定义类访问（如 `bg-surface-base`、`text-text-primary`、`bg-event-accent-bg`）。

**色彩规则：**

- 浅色背景 `#FAF9F5`，深色背景 `#262624`。**暖中性色调**。
- 主色（accent）`#D97757` —— 仅用于关键行动（保存、当前时间线），不滥用。
- 6 种事件颜色（accent / sage / sand / sky / rose / stone）—— 每种有 `bg` 和 `text` 两个变量，必须配对使用以保证对比度。
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

## 9. 写代码时的工作习惯（这一节是给 Claude 的具体指令）

### 9.1 永远先看再写

接到任务后第一件事：**用 Read/Grep 工具看相关现有文件**，理解当前模式再动手。不要凭印象写。本项目分层严格，盲写大概率违反依赖方向。

### 9.2 改之前先确认范围

- 修改一个文件超过 100 行时，先输出修改计划让用户确认
- 涉及 schema 迁移、删除文件、改公共类型时，**先停下来确认**，不要直接动
- 不要"顺手"重构无关代码

### 9.3 提交前自检

写完一个功能后，自己跑一遍：
```bash
npm run lint && npm run test && npm run build
```
**任何一项失败都要修复后再交。** 不要把失败的测试甩给用户。

### 9.4 不要做的事

- 不要引入新的 npm 依赖，除非用户同意
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

---

## 10. 第二版（已实现）

**版本主题：让记录变得有意义。**

核心新增：分类系统（6 个固定分类，可改名）+ 周统计（百分比条）+ 双语设置。

### 已实现功能

**分类系统：**

- 6 个固定分类，id 与 EventColor 一一对应（accent/sage/sand/sky/rose/stone）
- 每个分类有双语名称 `{ zh: string, en: string }`，用户可分别修改
- 分类名称上限 20 字符（`CATEGORY_NAME_MAX_LENGTH`）
- 默认分类名（中文/英文）：核心工作/Core Work、辅助工作/Support Work、必要事务/Essentials、阅读学习/Reading & Study、休息/Rest、其他/Other
- EventEditCard 内新增分类选择器（颜色圆点 + 名称），创建事件时必须选分类
- 右键菜单改颜色功能保留（同时改了 categoryId，两者始终同步）

**设置面板（SettingsPopover）：**

- 入口：侧边栏齿轮图标
- 语言切换（中文 / English）—— 影响分类名称的显示语言
- 分类名称编辑（点击分类行进入编辑模式，Enter 提交，Escape 取消）
- 基于 Radix Popover 实现，side="right"

**周统计（WeekStats + StatsBar）：**

- 显示在 WeekDateHeader 下方、周视图上方
- 顶部显示本周总记录时间（小时）
- 每个非零分类显示一条统计条：颜色圆点 + 分类名 + 进度条 + 小时数/百分比
- 统计算法（`domain/stats.ts` 纯函数）：
  - 将每个事件 clip 到 [weekStart, weekEnd) 边界内
  - 分母 = 所有 clip 后区间的并集时长（重叠去重）
  - 分子 = 每个分类自身 clip 后区间的并集时长
  - 百分比四舍五入到 1 位小数
- 本周无记录时显示空状态提示

**数据迁移：**

- Dexie schema upgrade v1→v3（跳过了 v2，因为 upgrade 内写入不可靠）
- `migrateEventV1ToV2`（`domain/migration.ts`）：给旧 event 补 `categoryId`，规则为 `categoryId = event.color`，脏数据 fallback 到 `'stone'`
- `on('ready')` 兜底迁移：如果 upgrade 内无法写入 categories，在 DB 打开后补种默认数据
- 全新 DB 通过 `on('populate')` 播种

**Sidebar 左侧导航栏：**

- 替代了 v1 的顶部导航
- 图标按钮：今日（当前周时禁用）、上一周、下一周
- 预留按钮：Search（Coming soon）、BarChart3（Coming soon）
- 底部：Settings 齿轮入口
- 带 400ms 延迟的 Tooltip

**双语 UI 覆盖范围：**

- EventEditCard 分类选择器
- WeekStats / StatsBar（中文"本周记录"/英文"This week"等）
- Sidebar Tooltip（英文硬编码）
- SettingsPopover（界面标签 + 分类名同时切换）

### 实现边界（坚决不做）

- 不引入标签 / 子分类 / 自定义分类数量（永远固定 6 个）
- 不引入"计划 vs 实际"对比、反思笔记、AI、跨周/月统计
- 不引入自动分类、基于标题识别分类
- 不引入路由（`react-router-dom` 仅用于空路由 `/`）
- 不引入新的 npm 依赖

### 决策记录

- **分类名语言**：中英双语并存，语言切换只影响显示，不影响存储
- **分类与颜色的关系**：CategoryId = EventColor，两者永远同值，不得分离
- **统计分母**：所有事件的并集（重叠去重），不按天聚合再求和
- **升级路径**：Dexie schema upgrade + on('ready') 双重保障
- **v2 不存在**：schema 直接从 v1 跳到 v3

---

## 11. 历史文档说明

- `README.md` / `README.zh-CN.md` —— 面向外部读者的项目介绍，可参考但**不是规范来源**
- `PLAN.md` —— **第一版**的早期规划文档，部分内容（如 `allDay` 字段）**未实际实现，以代码为准**
- `Chris_Dzombak.md` —— 来源不明的参考文档，使用前请用户确认其权威性

**当本文件与其他文档冲突时，以本文件为准。当本文件与代码冲突时，先停下来问用户。**