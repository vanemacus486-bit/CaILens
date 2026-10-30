# 新窗口交接 prompt（直接复制粘贴）

以下整段复制给新会话：

---

接手 CaILens 项目（`C:\Users\Rem\10_Dev\CaILens`）的后续开发。完整交接文档在仓库根目录 `HANDOFF.md`，**先读它**，再读 `CLAUDE.md`。

## 一句话现状

工作区已验证：`tsc=0` / `lint 0 errors 116 warnings` / `950 tests passed`。未提交，21 改 + 3 新增。已完成：P0 撤销链、P1 手感修复、P2 一致性、主体+插件架构骨架、第一个插件 quick-backfill、CLAUDE.md 重写、lockfile 归位。

## 立刻要做的两件事（P0）

1. **修 `BackfillPage.tsx` 的分类反查 bug**：`handleSubmit` 里用 `rows.find((r) => r.title.trim() === event.title.trim())` 反查 categoryId，两行标题相同但分类不同时会取错。改成按索引对应，或把 categoryId 随 `ImportedEvent` 一起传下去。
2. **给 `src/plugins/quick-backfill/model.ts` 补单测**：全是纯函数，按项目约定必须有测试。至少覆盖：`resolveEnd` 跨天（`23:00→01:00` 应 +24h）、`continueFrom` 接续时日期推进、`validateRow` 对非法格式的拒绝、`createInitialRow` 的默认值。

修完跑：`npx tsc -b --force; npm run lint; npm run test`（PS 5.1 用 `;` 不用 `&&`）。

## 之后

- P1 两项需要用户实测：焦点回收（Esc 关闭 Popover 后焦点是否回触发元素）、`MobileDayView` 横滑与纵向滚动冲突
- P3 插件迁移下一个做 **chronicle**（自带 2 张表 + 独立 store，验证「插件能带走自己的数据层」）
- 完整待办清单见 `HANDOFF.md` 第 3 节

## 硬约束（违反会出事）

- **不做运行时动态加载**：Tauri CSP + Capacitor WebView 都拦远程加载，插件靠目录隔离 + 开关控制注册
- **Dexie 表结构只能在 `data/db.ts` 一次性声明**，插件 `tables` 字段只是归属声明
- **删除一律软删除**（写 `deletedAt`），撤销 = 清标记保留原 id（`eventRepository.restore` / `eventStore.restoreEvent`）
- **不要静默吞异常**：`catch {}` 会把「加载失败」伪装成「数据为空」
- **store 的 error 字段必须有人消费**（`App.tsx` 有全局订阅）
- **改大文件用 `write` 整文件**，别用超长 `edit` —— 参数被截断时工具仍报成功但写入半截

## 环境

Windows + PowerShell 5.1，多命令用 `;`。用户说「构建/打包」= `npm run tauri:build`（重打桌面 exe，且要先关掉运行中的 CaILens），不是 `npm run build`。改动前先备份（用户明确要求）。
