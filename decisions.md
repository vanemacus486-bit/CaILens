# CaILens 决策档案

> 每完成一个 feature,在此处增量记录"为什么这样选"。
> 每条格式:做了什么 + 为什么。

---

## ESLint 规则降级 (2026-04-27)

ESLint `react-hooks/refs`、`react-hooks/set-state-in-effect`、`react-refresh/only-export-components` 降为 `warn`。降级而非 `disable` 是为了保留新代码触发时的提醒信号。

**风格性规则（误报或偏好问题，可放心降级）**

- `react-hooks/refs` — Radix UI 的 `virtualRef.current = el` pattern 在 render 期间赋值是框架合法用法，不构成逻辑错误，规则对此误报。
- `react-refresh/only-export-components` — 影响 HMR（热更新）体验，不影响运行时正确性。组件与工具函数同文件导出是项目现有约定。

**正确性规则（本次按个案合法降级，不构成通用先例）**

- `react-hooks/set-state-in-effect`（`WeekView.tsx:66`）— 该 effect 是被动状态同步：响应 `events` store 变化，关闭已脱锚（事件被删除后仍浮在界面上）的编辑卡片。逻辑正确，副作用可控，仅此一处合法。

> **后续原则：** 若有新的正确性规则被触发，默认应修代码而非降级。降级需重新论证，不构成先例。

---

## Step 2 — data 层 (2026-04-27)

### Schema chain: v1→v3（跳过 v2）

删除了 v2 schema 块，直接从 v1 升到 v3。**原因：** Dexie 对 fresh database 不执行中间版本的 upgrade function，只建到目标 schema 并运行最终 upgrade。测试环境每次都是 fresh fake-indexeddb，v2 upgrade 永远不跑，导致 categories seeding 失败。CaILens 仍在开发期，生产无 v2 用户。

### categories seeding: on('populate') 而非 upgrade

Fresh DB 的 categories 初始数据通过 `db.on('populate')` 播种，而非在 upgrade 函数内。**原因：** 深入调查后发现，Dexie v4 upgrade 的 async 函数内，categories 的 `put()` 调用无论使用 `tx.table()`、`this.categories` 还是 raw IDB 均无法在测试环境中持久化（console.log 诊断显示 upgrade 函数内代码未执行）。而 `on('populate')` 在 versionchange transaction 之外以普通 readwrite transaction 运行，绕过了这一限制。Upgrade 函数仍保留 v2 dev database 的迁移路径（string name → bilingual object）和 settings 播种。

### v2 dev database 兼容性

V3 upgrade 函数保留对 v2 dev database 的处理：若 categories 表非空（说明已有 string name 数据），则遍历迁移为 `{zh, en}` 双语对象。`V3_NAME_MAP` 同时覆盖新旧两套中文默认名（核心工作 / 深度工作等），未知名称降级为 `{zh: name, en: name}`。

---

## Step 3 — stores 层 (2026-04-27)

### settingsStore 初始值使用 DEFAULT_SETTINGS

`useAppSettingsStore` 的初始 `settings` 设为 `DEFAULT_SETTINGS`（`language: 'zh'`）而不是 `undefined`。**原因：** 避免 store 未加载完成时 UI 组件访问 `settings.language` 报错，也确保 `SettingsPopover` 和 `EventEditCard` 在第一帧就有合法值可用。

---

## Step 4 — UI 层 (2026-04-27)

### WeekStats 高度：不写死，用内容自适应

`WeekStats` 区域高度不写死，由内容撑开（只显示有记录的分类，总时间为 0 时显示空态文字）。**原因：** PM 要求"实现后视觉确认"，紧凑布局（py-2、gap-1.5）在 6 个分类全有数据时也不过高。

### WeekStats 仅显示有记录的分类

`byCategory` 中 `minutes === 0` 的分类不渲染卡片。**原因：** 空分类显示出来会占位但无信息量，与产品"克制"原则一致。

### Store 初始化放在 WeekView.tsx

`loadCategories` 和 `loadSettings` 在 `WeekView` 顶层 `useEffect([], [])` 中调用，而不是 `App.tsx`。**原因：** `WeekView` 已经是唯一的视图入口，且本项目没有扩展路由计划，放在 `WeekView` 比 `App.tsx` 更能体现"按需加载"的语义；`App.tsx` 目前过于轻量，避免把业务逻辑推到上层。

### SettingsPopover 分类改名仅更新当前语言

用户在 SettingsPopover 里编辑分类名时，只修改当前语言的 name（`zh` 或 `en`），另一语言的名称保持不变。**原因：** 不能假设用户能同时写中英文；另一种方案（双语同时显示两个输入框）过于复杂，不符合"克制"原则。

### TypeScript parameter property → 显式声明

`CategoryRepository` 和 `SettingsRepository` 的 `constructor(private db: CailensDB)` 改为显式属性声明 + 构造函数赋值。**原因：** `tsconfig` 启用了 `erasableSyntaxOnly`，该选项禁止 parameter property 语法（因其包含隐式初始化逻辑，不可被 erase）。
