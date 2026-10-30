# CaILens 交接文档

> 生成时间：2026-10-28 19:12 (Asia/Shanghai)
> 新会话接手时先读 `CLAUDE.md`，再读本文。

---

## 0. 环境事实（不要重复踩）

- 工作区：`C:\Users\Rem\10_Dev\CaILens`
- Windows + **PowerShell 5.1**：多条命令用 `;` 分隔，`&&` 会报「不是有效语句分隔符」
- bash 命令（`head`/`grep`/`tail`）在 PS 里不存在，用 `Select-Object -Last N` / `Select-String`
- `npm run build` 内部跑在 cmd.exe，那里的 `&&` 合法；**别手动拆开敲**
- 用户说「构建/打包/出新版本」= `npm run tauri:build`（重打桌面 `.exe`），不是 `npm run build`
- 用户偏好：**改动前先备份**

---

## 1. 当前工作区状态（已实测 2026-10-29 08:31，P0 + 插件市场 + 桌面打包全部完成）

```
npx tsc -b --force   → TSC_EXIT=0
npm run lint         → 0 errors, 116 warnings（全是存量 no-floating-promises）
npm run test         → 79 files / 1026 tests passed, ~24s
npm run tauri:build  → TAURI_EXIT=0，release/ 3 个文件
```

`release/` 已存在（**本机首次成功打包**）：

| 文件 | 大小 | 说明 |
|---|---|---|
| `CaILens.exe` | 37.2 MB | 绿色版，须与 `WebView2Loader.dll` 同目录 |
| `CaILens_3.24.6_x64-setup.exe` | 21.7 MB | NSIS 安装包 |
| `WebView2Loader.dll` | 160 KB | 绿色版必需 |

未提交改动：**没有 git commit，也没有 push。**

改动前的文件副本在三个 `.backup/` 子目录：
- `2026-10-28-p0-quick-backfill/` — `BackfillPage.tsx`、`model.ts`、`eslint.config.js`、`gitignore`、`HANDOFF.md`
- `2026-10-28-plugin-marketplace/` — `SettingsPlugins.tsx`、`registry.ts`、`types.ts`、`index.ts`、`cargo-config.toml`、`tauri.conf.json`、`Cargo.toml`、`Cargo.lock`
- `2026-10-29-tauri-version-align/` — `package.json`、`package-lock.json`

---

## 2. 已完成的工作（按批次）

### 批次 A — P0 撤销链（致命误删）

| 文件 | 改动 |
|---|---|
| `src/data/eventRepository.ts` | 新增 `restore(id)`：清 `deletedAt`，**保留原 id** |
| `src/stores/eventStore.ts` | 新增 `restoreEvent(id)`；两处静默 `catch {}` 改为写 `loadError` |
| `src/components/ui/snackbar.tsx` | 重写。原 `undo` 里调的是 `getEventRepo().delete(eventId)` ——「撤销」实际在删数据，语义反了。现改为调 `restoreEvent`，文案改「已删除「标题」」，超时 3s→6s |
| `src/features/week-view/WeekView.tsx` | `handleDetailDelete`（原本绕过 EventDetailCard 已有的 AlertDialog 直删）、`handleContextDelete`、`handleFloatingCardDelete` 三处接撤销 |
| `src/App.tsx` | 快捷键删除接撤销；补 `events` → `allEvents` 双路查找（`events` 只含当前周，冷启动/跨周聚焦时查不到快照） |
| `src/data/__tests__/eventRepository.test.ts` | 新增 3 条 `restore` 测试 |

**设计决策**：撤销保留原 id，因为全项目已统一走**软删除**（写 `deletedAt`），撤销 = 清标记，不需要重建快照。这样 `lastFocusedEventId`、URL 里的 `openEvent` 参数撤销后仍有效。

### 批次 B — P1 手感（「这 App 坏了」的错觉）

| 文件 | 改动 |
|---|---|
| `src/features/mobile/MobileEventEditor.tsx` | ① 空标题不再静默 `return`，改内联红字 + 聚焦回输入框；② 时间倒置不再偷改 `+30min`，弹「结束时间早于开始，已调整为 HH:MM–HH:MM」；③ `save` 加 `saving` 防重入（Enter 连按不再重复提交）；④ 保存失败留在编辑器并提示，不再假装关掉；⑤ 删除接撤销 |
| `src/stores/categoryStore.ts` | `loadCategories`/`updateCategory` 补 try/catch + `error` 字段 |
| `src/stores/projectStore.ts` | `loadProjects` 补 try/catch（原来失败会留下 `isLoading: true` **永久卡死**） |
| `src/App.tsx` | 新增全局 store error 订阅：category / project / todo / event 四类失败统一弹 snackbar。这些 `error` 字段此前**全项目零消费**——保存失败界面完全无感 |

**注意**：error 订阅用「值变化」触发，不是「非空」触发，避免同一错误刷屏。

### 批次 C — P2 一致性

| 文件 | 改动 |
|---|---|
| `src/components/ui/ErrorBoundary.tsx` | 全英文文案改中文；新增 `title` / `compact` / `onError` props；分层挂载（顶栏 compact、侧栏 compact、Outlet 全屏） |
| `src/components/ui/EmptyState.tsx`（新增） | 统一空态。变体按**容器能否被点**区分：`inline`（必须 `pointer-events-none`，否则吃掉列的点按）/ `action` / `full` |
| `src/features/week-view/WeekEmptyState.tsx` | 改用统一组件，`inline` 变体 |
| `src/features/planning/EmptyState.tsx` | 保留原调用签名，内部改用统一组件 |
| `src/App.tsx` | `PageFallback` 纯色块 → 三条脉动骨架；三处 `fallback={null}` → `OverlayFallback`（慢机器按 Ctrl+K 原本毫无反应） |

### 批次 D — 主体 + 插件架构（新）

```
src/plugins/
  types.ts          # PluginDefinition 契约
  registry.ts       # registerPlugin / listPlugins / activePlugins(overrides) / collectRoutes / collectNavItems
  index.ts          # BUILTIN_PLUGINS + installBuiltinPlugins()
  PluginRoutes.tsx  # 把启用插件的路由展开成 <Route>
  PluginNav.tsx     # 侧栏导航渲染（图标白名单映射，不 import * as icons）
  quick-backfill/   # 第一个真实插件
    index.ts        # 插件定义：路由 /backfill，navItems 图标 Rows3，order 40
    model.ts        # 纯函数：toTimestamp / resolveEnd / validateRow / continueFrom / createInitialRow / summarize
    BackfillPage.tsx# 表格式批量录入 UI
  __tests__/registry.test.ts  # 16 条
```

**三条硬约束（写进代码注释了）**：
1. **代码同 bundle，不做运行时动态加载** —— Tauri CSP 与 Capacitor WebView 都会拦远程加载，且没有 Node 侧执行环境
2. **Dexie 表结构必须一次性在 `data/db.ts` 声明** —— `version()` 全局单调，插件动态增删表会让版本号爆炸且无法回退。`PluginDefinition.tables` 只是**归属声明**，不参与建表
3. **插件不得反向依赖主体 UI** —— 可依赖 `domain/` 与 `stores/`，主体只能通过 registry 拿到 `PluginDefinition`

**开关语义**：`settings.enabledPlugins[id] ?? plugin.defaultEnabled`（只记录用户显式开关过的）。关闭只隐藏入口与路由，**不删数据**。

配套改动：
- `src/domain/settings.ts`：`AppSettings.enabledPlugins?: Record<string, boolean>`
- `src/stores/settingsStore.ts`：`setPluginEnabled(pluginId, enabled)`
- `src/stores/uiStore.ts`：`SettingsTab` 加 `'plugins'`
- `src/main.tsx`：渲染前调 `installBuiltinPlugins()`
- `src/App.tsx`：桌面端 + 移动端路由各挂一处 `<PluginRoutes />`
- `SettingsPage.tsx` / `MobileSettingsPage.tsx` / `SettingsModal.tsx`：三处 tab 表 + 内容映射补 `plugins`
- `src/components/nav/UnifiedSidebar.tsx`：域导航下方挂 `<PluginNav />`

### 批次 E — 文档重写

`CLAUDE.md` 整篇重写为「**规则 + 陷阱 + 指针**」，删掉全部易腐内容（文件清单、表数、路由表、快捷键表、测试计数、版本号）。原文档有 46 条差异：6 个 domain 文件根本不存在、方向键快捷键整体不存在、`1/2/3` 实为 `Alt+1/2/3`、`N` 实为 `Ctrl+Alt+N`、9 store 实为 12。

**新原则**：想知道什么，查源码。文档只写「不读源码就会犯错的约束」。

### 批次 F — lockfile

`git checkout -- package-lock.json` 丢弃了 +8736/-118 的漂移，`npm ls --depth=0` 干净退出。

---

## 3. 剩余待办（按优先级）

### P0 — 已全部完成 ✅（2026-10-28 19:41）

| # | 项 | 位置 | 结果 |
|---|---|---|---|
| 1 | ~~quick-backfill 提交时按标题反查分类~~ | `BackfillPage.tsx` `handleSubmit` | ✅ 改为 `pairs: {row, event}[]` 成对构造，`resolveCategory(_event, index) => pairs[index].row.categoryId`。`importParsedEvents` 的第二个参数本来就带 index，之前没用上 |
| 2 | ~~quick-backfill/model.ts 无测试~~ | `__tests__/model.test.ts`（新增） | ✅ 44 条测试，覆盖 `toTimestamp`/`toTimeString`/`toDateString` 互逆与非法格式、`resolveEnd` 跨天（含跨月、相等即跨天）、`validateRow` 四字段顺序与空白标题、`toImportedEvent`、`continueFrom` 日期推进/跨月/非法输入退化、`createInitialRow` 默认值、`nextRowKey` 单调、`summarize` 跳过非法行、跨天链路端到端 |

**顺带修的**：`.backup/` 备份文件被 eslint 当源码解析，报 2 条 `was not found by the project service` error。已在 `eslint.config.js` 的 `globalIgnores` 加 `.backup/**`，`.gitignore` 加 `.backup/`。

### P1 — 待实测

| # | 项 | 需要什么 |
|---|---|---|
| 3 | 焦点回收（`FloatingEventCard` / `EventDetailCard` Esc 关闭后焦点是否回到触发元素） | 浏览器实测，确认 Radix 默认行为是否已兜底 |
| 4 | `MobileDayView` 横滑切天与纵向滚动冲突（阈值 52px、`\|x\| > \|y\|*1.25`，`onPointerDown` 对整块 scroll 容器 `setPointerCapture`） | 真机手感 |

### P2 — 可选打磨

| # | 项 | 说明 |
|---|---|---|
| 5 | `projectStore.deleteProject` 级联删 todos + inspirations 无二次确认 | **全项目零调用点**，UI 上只有「归档」。有隐患但当前不可达 |
| 6 | 移动端 `MobileMenu.tsx` 未接插件入口 | 桌面侧栏已接，移动端菜单没动 |
| 7 | `StatsPage` 8 个 Tab 的 ErrorBoundary 都用默认标题 | 现在都说「这一块出错了」，可逐 Tab 给具体标题 |
| 8 | 116 条 lint warning | 全是存量 `@typescript-eslint/no-floating-promises`，0 error |
| 9 | 27 处 `any` | 集中在 `data/adapters/*`、`migrations/upgrades.ts`、`db.ts` |

### P3 — 插件化剩余迁移

按解耦程度从高到低（已写入 `src/plugins/index.ts` 注释）：
1. ~~quick-backfill~~ ✅ 已完成
2. **chronicle**（自带 2 张表 + 独立 store，最干净）
3. **inspiration / SOP**（依赖 `projectId`，需主体暴露只读查询）
4. **todo**（数据层已与事件完全解耦——`Todo` 无 `eventId` 字段、`todoStore` 不引用 `eventStore`；但 UI 深度嵌入 `/action`）
5. **stats 复盘图表**（重度依赖 `domain/stats.ts`，最后动）

新增插件检查清单：只依赖 `domain/` 与 `stores/` 公开接口（用 `data/` 的 Repository 就是越界）；共享主体表时 `tables` 留空；关闭插件后主路径必须完全不受影响。

### P4 — 发布链 ✅ 已打通（2026-10-29 08:31 首次成功）

`release/` 已产出：`CaILens.exe`（37.2 MB）+ `CaILens_3.24.6_x64-setup.exe`（21.7 MB）+ `WebView2Loader.dll`。

**本机打包环境（换机器会全部重踩，务必照抄）：**

| 缺口 | 现状 | 解法 |
|---|---|---|
| Rust 工具链 | 原本**完全没装** | `winget install Rustlang.Rustup`，然后 `rustup default stable-x86_64-pc-windows-gnu`（**不用 MSVC**，那需要管理员权限装 2–4 GB 的 Build Tools） |
| C 编译器 | rustup 自带的 `self-contained/gcc.exe` 是**假的**（`GCC-WARNING.txt` 明说只能当链接器），没有 sysroot 库 | 装 WinLibs MinGW 到 `%USERPROFILE%\winlibs\mingw64`（`scripts/fetch-mingw.ps1` + `unpack-mingw.ps1`），它带全套 gcc/ar/ld/dlltool/windres |
| NPM vs Rust 版本漂移 | NPM 侧被装成 `@tauri-apps/api 2.12.4` 等，Rust 侧是 `tauri 2.11.0`，`tauri build` **第一步就 Error 退出** | 把 NPM 侧降到与 Rust 侧同 minor 的最高版（见 `scripts/finish-build.ps1` 里的 `$pins`），**别反过来升 Rust** |
| updater 签名 | 无 `TAURI_SIGNING_PRIVATE_KEY`，`createUpdaterArtifacts: true` 会在签名步骤失败 | 已临时改 `false`；要恢复自动更新就把私钥放回来并改回 `true` |
| 硬编码路径 | `src-tauri/.cargo/config.toml` 曾写死 `C:\Users\vanem\...` | 已清空为纯注释文件 |

**一键打包：** `pwsh -File scripts\finish-build.ps1`（装对齐版本 + 注入环境 + 关掉运行中的 App + `tauri:build` + 核实产物）。

**关键坑：PATH 顺序。** 必须让真 MinGW 排在 rustup 的 `self-contained` **之前**，否则 `x86_64-w64-mingw32-gcc` 会命中那个没有库的假货，链接报 `ld: cannot find crt2.o / -lkernel32`。`build-env.ps1` 现在**完全不把 self-contained 加进 PATH**，彻底避免这个歧义。

---

## 4. 下一步建议

**P0 清零、P4 打通。** 剩下按顺序：

1. **P1 两项实测**（需要用户参与）——焦点回收、MobileDayView 手势冲突。代码侧已无可改之处，只能实测判定。
2. **P3 chronicle 插件迁移**——自带 2 张表 + 独立 store，是验证「插件能带走自己的数据层」的最佳样本。注意：
   - `data/db.ts` 的 `version(N).stores()` 已经一次性声明了 chronicle 的表，**不要再加版本**
   - chronicle 的 store 目前是主体 `stores/` 下的切片，迁移时要挪进 `src/plugins/chronicle/`，主体不能再 import
   - 迁移后跑全量测试，确认属于 chronicle 的那部分仍通过
3. **P2 可选打磨**（5–9 项），随手做。
4. **发布链遗留**：`createUpdaterArtifacts` 还是 `false`。要恢复自动更新需准备 `TAURI_SIGNING_PRIVATE_KEY` 并改回 `true`；同时 `Cargo.toml` 的 `version` 与 `package.json` 需手动保持一致（Tauri 只认 `package.json`，crate 版本漂了会体现在 exe 属性里）。

---

## 5. 协作提示

- **改大文件用 `write` 整文件，别用超长 `edit`** —— 参数过长会被上游截断，工具仍返回 `updated successfully` 但实际写入半截内容（本轮踩过，表现为 `TS2304 Cannot find name 'OverlayFallback'` + `TS6133 'Loader2' is declared but never read`）
- 每批改动后必跑：`npx tsc -b --force; npm run lint; npm run test`
- 测试 994 条约 26s，全量跑不贵，别只跑单文件就宣布完成
- **eslint 会把非源码目录当源码扫**：`.backup/` 曾被 projectService 报 2 条 `was not found by the project service` error（parse error 不算 lint 规则违规，是配置问题）。新增非源码目录（备份、临时导出、脚本产物）时，记得同时加 `globalIgnores` 和 `.gitignore`
- **打包失败先看是不是环境问题**：`cargo metadata: program not found` = 没装 Rust；`dlltool.exe: CreateProcess` = 缺 `as.exe`；`ld: cannot find crt2.o` = PATH 里命中了 rustup 的假 gcc。三者都不是代码错
- **不要凭记忆断言产物存在**：本轮曾多次凭工具输出「推断」打包成功，实际 `release/` 一直不存在。凡是声称产物已生成，必须 `Get-Item` 打时间戳
- 不要提 commit / push，除非用户明确要求
