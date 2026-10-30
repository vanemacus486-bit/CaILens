# CaILens — Agent 索引

本地优先的时间统计工具，灵感来自柳比歇夫 56 年实践。记录、分类、可视化时间去向——没有账号、没有服务器、没有数据上报。

> **本文档只写「不读源码就会犯错的约束」和「踩过的坑」。**
> 文件清单、表结构、路由表、快捷键表、测试计数、版本号一律**不写在这里**——它们每天都在变，
> 抄进文档就会变成第二个谎言源。需要时直接查源码，下面每节都给了准确路径。

## 事实源在哪

| 想知道什么 | 查这里 |
|---|---|
| 依赖版本、技术栈、全部 npm scripts | `package.json` |
| 路由与懒加载边界 | `src/App.tsx`（注意 `isNativeMobile()` 分支，移动端是**另一套路由**） |
| 快捷键与冲突检测 | `src/domain/shortcuts.ts` 的 `SHORTCUT_REGISTRY` |
| IndexedDB 表结构与迁移链 | `src/data/db.ts`（`version(N).stores()` / `.upgrade()`） |
| 视觉风格与色彩 token | `src/styles/tokens.css`（`[data-style]` 覆盖块）+ `src/index.css` |
| 事件分类色 | `src/domain/event.ts` 的 `EVENT_COLORS` / `src/domain/category.ts` |
| 插件契约与内置清单 | `src/plugins/types.ts` / `src/plugins/index.ts` |
| 桌面端版本号 | `src-tauri/tauri.conf.json`（`version` 字段引用 `../package.json`，**单一真源**） |

技术栈（版本见 `package.json`）：React + Vite + TypeScript(strict) + Zustand + Dexie + react-router-dom(HashRouter) + Vitest + lucide-react；桌面 Tauri v2，移动 Capacitor。

## Commands

```bash
npm run dev          # Vite dev server (:5173)
npm run build        # tsc -b && vite build → 只出网页包 dist/，不更新桌面 .exe
npm run lint         # eslint .
npm run test         # vitest run
npm run test:watch   # vitest (watch)
npm run preview      # vite preview
npm run tauri:dev    # 桌面窗口 + 热更新（迭代期用这个，别每次重打 exe）
npm run tauri:build  # ★重打桌面 .exe → release/CaILens.exe
npm run android:build# cd android && gradlew assembleDebug && node ../scripts/copy-release.mjs android
```

**提交前自检：** `npm run lint; npm run test; npm run build`（PowerShell 用 `;` 顺序执行，**别写 `&&`** — PS 5.1 会报"`&&` 不是有效语句分隔符"，三条全跑不了。详见下方 Build 节）

## Build（构建 / 排查）

> **‼️ 默认含义：用户说"构建 / 重新构建 / 打包 / 出包 / 出新版本"，在本项目几乎总是指 `npm run tauri:build`（重打桌面 .exe）。**
> 用户是**双击桌面程序**用的，ta 要的是更新后的 `release/CaILens.exe`，不是网页包。
> `npm run build` 只生成 `dist/`（网页），用户**根本看不到**——单独跑它来"完成构建任务"**几乎总是错的**：跑完桌面程序纹丝不动，又会被当成"构建失败"。

> **本机环境：Windows + PowerShell 5.1。** 多数"让 AI 构建却失败"并不是代码错，而是**命令写成了 bash 语法**或**误读了输出**。动手前先读本节。

**只想确认有没有类型错 → 跑 `npx tsc -b`**，它静默＝通过，省 token。怀疑增量缓存脏了用 `npx tsc -b --force`。

- 完整构建 `npm run build` 的**成败只看最后两三行**：`✓ built in X` ＝成功；中途有 `error TSxxxx` 块＝失败。中间几百行 `dist/assets/noto-serif-sc-*.woff2` 是正常字体产物，**不是错误**。
- 要退出码：`npm run build; "EXIT=$LASTEXITCODE"`（`0`＝成功）。

**下面这些不是构建失败，别当成错去"修"：**

| 看到的输出 | 真相 |
|---|---|
| `(!) Some chunks are larger than 500 kB` | vite 体积**警告**，构建已成功 |
| `npm warn Unknown user config "electron_mirror"` | npm 配置提示，与构建无关 |
| `head/grep/tail … 无法将…识别为 cmdlet` | 你在 PowerShell 用了 **bash 命令** |
| `标记"&&"不是此版本中的有效语句分隔符` | PS 5.1 不支持 `&&`，见下表 |

**bash → PowerShell 对照（AI 最常踩的坑）：**

| 别用（bash 写法） | 用这个 |
|---|---|
| `npm run build 2>&1 \| head -40` | `npm run build`（直接跑，读尾部结论） |
| `… \| tail -20` | `… \| Select-Object -Last 20` |
| `… \| grep error` | `… \| Select-String error` |
| `npm run lint && npm run test` | `npm run lint; if ($?) { npm run test }` |
| `echo $?` | `$LASTEXITCODE` |

> `npm run build` 内部的 `tsc -b && vite build` 跑在 **cmd.exe** 里，那里的 `&&` 合法；但**在 PowerShell 终端直接敲 `tsc -b && vite build` 会报错**。始终走 `npm run build`。

**⚠️ 三种"构建"别搞混（"改了代码却没变化"的头号原因）：**

| 目的 | 命令 | 改代码后的表现 |
|---|---|---|
| 开发时看效果（最常用） | `npm run dev` | **自动热更新**，秒见 |
| 桌面 App 一边开发一边看 | `npm run tauri:dev` | 桌面窗口 + 热更新 |
| 出网页发布包 | `npm run build` → `dist/` | 只更新 `dist/`，**不碰已打开的 App** |
| 出桌面 .exe | `npm run tauri:build` → `release/CaILens.exe` | 重新打包（含 Rust 编译，慢几分钟） |

> **`release/CaILens.exe` 是冻结快照**：内嵌上次 `tauri:build` 那一刻的 `dist/`。之后改源码、单独跑 `npm run build`，都**不会**让它变。
> 要更新它：**先关掉正在运行的 App**（否则覆盖会因文件占用失败），再 `tauri:build`。频繁迭代别每次重打，用 `tauri:dev` 验证，定稿再出包。

**打包桌面 .exe（实测步骤）：**

1. **先关掉正在运行的 CaILens** —— 最容易翻车的一步。`Get-Process CaILens`（无输出＝没运行）；强制关：`Stop-Process -Name CaILens -Force -ErrorAction SilentlyContinue`。
2. `npm run tauri:build`。依次：前端→`dist/` → **编译 Rust release（最慢，约 3 分钟）** → makensis 打安装包 → `copy-release.mjs` 复制到 `release/`。
3. **输出末尾出现这几行＝成功：** `Finished \`release\` profile [optimized]` / `Built application at: ...\target\release\CaILens.exe` / `Finished 1 bundle at: ...\nsis\CaILens_<版本>_x64-setup.exe` / `Done — N file(s) copied to release/`。
4. **产物在 `release/`**：绿色版 exe（须与 `WebView2Loader.dll` 同目录）＋ NSIS 安装包。
5. **验证**：`release/CaILens.exe` 的修改时间必须是「刚刚」；时间没更新＝没打包成功。

打包时这些是**正常提示**：`Warn ... identifier ... ends with .app`（macOS 提示，Windows 无关）、chunk 体积警告、`electron_mirror` 警告。

## Architecture

```
use-cases/  →  domain/  →  data/  →  stores/  →  features/ + components/ + pages/
(orchestration) (pure logic) (Repo+Dexie) (Zustand) (UI)
```

**单向依赖，严禁反向。** 各层职责：

| 层 | 该放什么 | 硬约束 |
|---|---|---|
| `domain/` | 纯类型 + 纯函数（统计、布局、时间、分类规则） | **零副作用**：无 React、无 Dexie、无浏览器 API |
| `data/` | Repository + Dexie + 适配器（IndexedDB / FileSystem / Tauri FS） | **唯一**碰持久化的地方。Repo 注入 `Clock` + `IdGenerator` 便于测试 |
| `stores/` | Zustand 切片，包装 Repository | 组件只通过 store 访问数据，**不直接调 Repository** |
| `features/` | 按业务场景组织的模块 | 可依赖 domain/data/stores，不得被 domain/data 反向依赖 |
| `components/` | 可复用 UI 原语（`ui/` `calendar/` `nav/` `stats/`） | 无业务逻辑，只接 props |
| `pages/` | 路由级页面，编排 store + 渲染 | — |
| `plugins/` | 可选模块，见下方 Plugins 节 | 主体不得 import 插件内部实现 |

新增文件前先 `ls` 目标目录——目录里真实有什么，以文件系统为准。

## Plugins（主体 + 插件架构）

约束来自实际技术边界，不是偏好：

1. **代码同 bundle，不做运行时动态加载** —— Tauri CSP 与 Capacitor WebView 都会拦远程加载，且没有 Node 侧执行环境。插件靠 `src/plugins/<id>/` 目录隔离 + 设置开关控制注册。
2. **Dexie 表结构必须一次性在 `data/db.ts` 声明** —— `version()` 全局单调，插件动态增删表会让版本号爆炸且无法回退。`PluginDefinition.tables` 只是**归属声明**，不参与建表。
3. **插件不得反向依赖主体 UI** —— 插件可依赖 `domain/`、`stores/` 与 `components/ui/` 这类无业务原语，但不得 import 主体页面与业务组件。
4. **主体不得知道插件内部** —— 两个方向都要守，缺一个就漏：
   - **不 import**：主体只允许 import `@/plugins/types`、`registry`、`PluginRoutes`、`PluginSidebar`、`PluginTopBar`、`PluginNav` 六个入口；`plugins/<id>/...` 内部路径一律禁止（`@/plugins/index` 只给 `main.tsx` 的 `installBuiltinPlugins()` 用）。import 是静态的——主体一旦 import 了插件内部，那个插件就再也关不掉了。
   - **不硬编码**：不 import 也不等于安全。按插件 id、路径或内部概念分支同样是越界。**已踩过两次**：`AppHeader` 曾用 `isAction = isPluginDomain && !isStats` 反推「不是复盘就是规划」，还直接 import 规划插件的 `cycleActionFilter`；`MobileSearchPage` 曾写死 `domain.id === 'plan'`。正确做法是让插件在契约里声明语义（如 `headerStepKind: 'filter-cycle'`），主体只按语义分派。写主体代码前先自问：把这个插件关掉，这段代码还成立吗？

开关语义：`settings.enabledPlugins[id] ?? plugin.defaultEnabled`（只记录用户显式开关过的，插件增删不残留垃圾条目）。关闭只隐藏入口与路由，**不删数据**。

## Design System

**色彩：** 浅色 `--surface-base` 暖米色，深色近黑；暖中性色调。具体 hex 见 `src/index.css` 与 `src/styles/tokens.css`，**不要凭记忆写死颜色**。

**6 种事件色 = 6 种分类 = 6 种 CategoryId**，各有 `bg/text/fill` 三个 CSS 变量。分类数量固定，不可增删。

**5 视觉风格**（`graphite` 默认暖色 / `nocturne` / `carbon` / `tide` / `indigo`），通过 `<html data-style="...">` 切换，定义在 `tokens.css` 末尾的 `[data-style]` 覆盖块。覆盖块需同时改写两套 token 体系（`index.css` 的 `--surface-*`/`--accent*` 与 `tokens.css` 的 `--paper`/`--ink*`/`--line*`），不影响事件分类色。`tide`/`indigo` 是 Timepage 式全画布深底（浅色模式也是深底，须一并覆盖 `--text-*`）。

**状态色：** success / danger / info，变量名以 `tokens.css` 为准。

**字体：** Inter (UI), Source Serif 4 (阅读), JetBrains Mono (时间数字), LXGW WenKai (可选), Noto Serif SC / Noto Sans SC (中文)。

**视觉克制：** `rounded-lg`，不用纯黑边框，不用阴影做层次（用 surface/base/raised/sunken），过渡 200-400ms ease-out，饱和色彩克制。

## Data Constraints

- 所有时间存 **UTC 毫秒时间戳**，仅显示层转本地时区
- 颜色用预定义字符串 key (`EventColor`)，不存 hex
- **CategoryId = EventColor**，永远同值
- 分类数量固定 6 个，不可增删
- Schema 变更通过 `db.version(N).stores({...}).upgrade(...)` 迁移，版本号只增不减
- 删除一律**软删除**（写 `deletedAt`），所有读取路径必须过滤 `!deletedAt`；撤销 = 清 `deletedAt`，保留原 id

## Conventions

- **函数组件 + hooks**，禁 `any` / `as unknown as` / `@ts-ignore`
- **`domain/` 零副作用**：无 React、无 IndexedDB、无浏览器 API
- **组件不直接调 Repository**：必须通过 store
- **store 的错误要有人消费**：写 `error` 字段就必须在 `App.tsx` 的全局订阅里挂上，否则用户完全无感（此坑已踩过）
- **危险操作必须有退路**：删除接撤销（`showUndoSnackbar` + `restoreEvent`），或至少二次确认
- **不要静默吞异常**：`catch {}` 会把「加载失败」伪装成「数据为空」，用户会以为数据丢了
- **Tauri 命令必须 `async fn`**：Tauri v2 非 async 命令跑在主线程，文件 I/O 会卡死事件循环 → 窗口"未响应"。`fs_commands.rs` 新增命令一律 async，阻塞 I/O 包进现有 `run_blocking()`
- **`index.html` `<style>` 禁全局选择器**：Tailwind v4 用 `@layer`，非 layered 样式无条件优先
- **新增 UI 必须定义 `:root` 和 `.dark` 两套变量**
- **测试**：`domain/` 纯函数必须有测试；IndexedDB 测试用 `fake-indexeddb`；Repository 注入 fake Clock + IdGenerator
- **不引入新 npm 依赖** 除非必要且已评估
- **不引入日历库**（周视图自实现）
- **不在视图中添加名言/引言**
- **YAGNI**：不在 `domain/` 写过度抽象的代码

## 文档维护

改完代码后，如果动了 `package.json` 的 scripts、路由表、快捷键、表结构或视觉 token 的**结构**，回头看本文件是否有对应的**规则**需要更新。**不要**把新的文件清单/计数/版本号抄进来——那些交给 `grep`。
