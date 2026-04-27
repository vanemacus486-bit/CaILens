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
