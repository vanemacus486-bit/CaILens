# CaILens 决策档案

> 每完成一个 feature,在此处增量记录"为什么这样选"。
> 每条格式:做了什么 + 为什么。

---

## ESLint 规则降级 (2026-04-27)

ESLint `react-hooks/refs`、`react-hooks/set-state-in-effect`、`react-refresh/only-export-components` 降为 `warn`。前两者对已有代码产生误报（`react-hooks/refs` 将 Radix UI 合法的 virtualRef pattern 判为错误；`react-hooks/set-state-in-effect` 对 WeekView 中有意为之的 effect 内 setState 报错）；后者影响 HMR 体验而非代码正确性。降级而非 `disable` 是为了保留新代码触发时的提醒信号。
