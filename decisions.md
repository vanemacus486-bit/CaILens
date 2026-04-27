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

### TypeScript parameter property → 显式声明

`CategoryRepository` 和 `SettingsRepository` 的 `constructor(private db: CailensDB)` 改为显式属性声明 + 构造函数赋值。**原因：** `tsconfig` 启用了 `erasableSyntaxOnly`，该选项禁止 parameter property 语法（因其包含隐式初始化逻辑，不可被 erase）。
