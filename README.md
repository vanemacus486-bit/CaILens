<div align="center">

<img src="docs/logo.png" width="96" alt="CaILens logo">

# CaILens

**记录每一小时，而非每一秒。**

本地优先的时间统计工具 —— 不是日历，不是待办，而是一本你一小时一小时写出来的书。
没有账号，没有服务器，没有数据上报。

[English](./README.en.md) · [更新日志](./CHANGELOG.md) · [隐私政策](./PRIVACY.md)

![version](https://img.shields.io/badge/version-3.23.0-c47a5a?style=flat-square)
![tests](https://img.shields.io/badge/tests-744_passing-2D7D46?style=flat-square)
![platform](https://img.shields.io/badge/platform-Windows_·_Android_·_Web-3A5A80?style=flat-square)
![typescript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square)
![license](https://img.shields.io/badge/license-EULA-B53535?style=flat-square)

</div>

<!-- 截图占位 ① —— 周视图主图（最有代表性的一屏）。截图清单见文末。 -->
<p align="center">
  <img src="docs/screenshots/hero-week.png" alt="CaILens 周视图：24 小时 × 7 天一屏可见" width="860">
</p>

<div align="center">

### 立即开始

```bash
npx cailens
```

一行命令启动最新版（自动从 npm 拉取，无需安装，需 Node 20+）。

[![Windows](https://img.shields.io/badge/Windows-.exe-c47a5a?style=for-the-badge)](https://github.com/vanemacus486-bit/CaILens/releases/latest)
[![Android](https://img.shields.io/badge/Android-.apk-6B7A4F?style=for-the-badge)](https://github.com/vanemacus486-bit/CaILens/releases/latest)
[![GitHub](https://img.shields.io/badge/GitHub-source-1C1814?style=for-the-badge&logo=github&logoColor=white)](https://github.com/vanemacus486-bit/CaILens)

</div>

> ⚠️ 预构建的 exe / apk 会滞后于最新代码。想体验最新功能请用 `npx cailens` 或从源码构建。
> **平台成熟度：** Windows 桌面版功能完整、体验成熟；Android 移动端尚处早期，基本可用但仍在打磨。

---

## 为什么是它

市面上几乎所有日历工具都在解决「把未来安排进格子里」——提醒你开会、收邀请、设闹钟。但**理解自己的时间去向**，是完全不同的命题。

柳比歇夫从 26 岁起记录每天的每一小时，持续 56 年直至去世。这不是效率表演，而是一种真正看清生命如何被度过的工具。CaILens 是这个工具在今天的一次尝试。

- **🪞 记录，不规划。** 这里没有日程。你记录的是已经发生的事，不是对明天的承诺。先看见，再判断。
- **🔒 本地优先。** 数据全部存在你设备的 IndexedDB 里。没有账号、没有服务器、不联网、不上报。你的时间日记只属于你。
- **🤫 安静的设计。** 暖中性色调，衬线标题，克制的焦橙主色。应用不催促、不评价、不打扰——唯一持续动起来的，是代表「现在」的当前时间红线。
- **🧪 代码质量优先于功能数量。** TypeScript 严格模式，744 个测试，单向依赖分层。

---

## 界面速览

<!-- 截图占位 ②③④ —— 见文末截图清单。 -->
<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/stats-dashboard.png" alt="复盘看板"><br><sub><b>复盘看板</b> · 作息 / 日常 / 身体 / 关联 四个维度</sub></td>
    <td width="50%"><img src="docs/screenshots/day-view.png" alt="日视图日记"><br><sub><b>日视图日记</b> · 衬线排版，把记录变成可朗读的一页</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/standard-week.png" alt="标准周视图"><br><sub><b>标准周</b> · 所有历史周叠加，看清你「典型的一周」</sub></td>
    <td width="50%"><img src="docs/screenshots/dark-mode.png" alt="深色模式"><br><sub><b>深色模式</b> · 6 套视觉风格，浅 / 深自由切换</sub></td>
  </tr>
</table>

---

## 核心功能

### 📅 周视图记录
- **24 小时 × 7 天一屏可见**，横轴一周、纵轴一天，不滚动。
- **点击空白即创建**——事件就地展开为内联编辑卡片，不弹窗、不抢焦点；填完标题按 Enter，焦点自然流入描述。
- **拖拽就是编辑**——基于原生 Pointer Events 手写的连续分钟轴坐标系，拖动可跨越午夜，拽住边缘即改时长，ghost 浮层 60fps。
- **跨天事件**——睡眠等跨午夜记录自动连续显示；悬浮 ~400ms 浮现快读预览。

### ⚡ 快速记录
- **任意页面按 `N`** 唤出极简输入流：事件名、分类、备注，Tab 切字段、Enter 保存。
- **自动接续时间**——开始时间自动接上一段的结束，无需手动设。
- **自动补全 + 最近使用**，保存后 3 秒内可一键撤销。

### 📖 日视图日记
- 衬线小标题 + 正文段落，描述支持 **Markdown** 渲染（加粗 / 斜体 / 列表 / 链接）。
- 活动类型切换处自动出现分隔线——记录读起来像叙事，而非报表。

### 📊 复盘看板
- **年度热力图**——GitHub 贡献图范式，6 分类切换，看全年节律。
- **睡眠节律图**——日历格式 Y 轴，月 / 季 / 年三级，就寝 + 起床散点。
- **分类趋势**——日 / 周 / 月粒度多线折线，叠加每周预算基准线。
- **标准周**——168 个 (星期, 小时) 桶按分钟权重聚合，回答「周一上午九点我通常在做什么」。
- **稳态指标**——睡眠中位数、标准差、漂移速度、漂移投影、一致性指数，从「连续打卡」转向「长期稳定」。

### 🔗 生活上下文 + 关联洞察
- 轻量记录影响作息的生活变量（最后一餐、社交、户外、运动、情绪、屏幕），20 秒完成。
- 把变量与作息关联，输出自然语言洞察卡片：「较晚的最后一餐：就寝推迟了 34 分钟」。
- 每条洞察附「相关性 ≠ 因果」免责声明；可开启**克制模式**，只记录不分析，防止工具异化为焦虑源。

### 🗂️ 规划 · 项目 · 档案
- **规划页**——TODO 四态管理（待办 / 进行中 / 完成 / 取消）、优先级、截止日期分组，与「记录」清晰分工。
- **项目与 SOP**——事件可归属到项目，形成「事件 → 项目 → 分类」三层模型；每个项目可附带版本化的标准操作流程。
- **个人档案**——身高 / 体重 / 体脂 / 心率 / 血压时序，与睡眠基线对照。

### 🎨 体验细节
- **6 个固定分类**（主要矛盾 / 次要矛盾 / 庶务 / 个人提升 / 休息娱乐 / 睡眠），名称与每周预算可改。
- **6 套视觉风格** + 浅 / 深模式，事件色经 WCAG AA 对比度审计。
- **全局搜索**（`Ctrl+K`）、**全键盘操作**（16 个可自定义绑定）、**中 / 英 i18n**。

### 🔓 数据自由
- 导出 **CSV / JSON / 加密 `.cailens`**（age 加密 + gzip），导入 CSV / JSON。
- **ICS 导入**——解析 RFC 5545，按事件名聚合并智能预填分类。
- 一切都在本地，随时带走，永不锁定。

---

## 技术亮点

> 这是一个**纯前端、本地优先、无后端**的应用，却要承载日历交互、统计引擎和跨端打包。几个有意思的工程决策：

- **单向依赖分层架构** —— `use-cases → domain → data → stores → features`，严禁反向依赖。`domain/` 层零副作用（不碰 React、不碰 IndexedDB），因此可被 744 个单元测试完整覆盖。
- **手写周视图，不用日历库** —— 重叠事件并排布局、拖拽移动 / 改时长全部自实现。核心是一个**分钟轴坐标系**（0..7×1440），跨天拖拽退化为简单加减法，ghost 浮层用 `requestAnimationFrame` 直接操作 DOM 跑满 60fps。
- **纯函数统计引擎** —— 周统计、时段聚合、标准周、稳态指标（线性回归算漂移）、关联分析、数据成熟度判定，全部是可测试的纯函数。
- **一套代码，三端交付** —— 同一份 React 应用通过 Vite 出 Web 包、Tauri 打 Windows 桌面 exe、Capacitor 打 Android apk。
- **工程纪律** —— TypeScript strict，禁用 `any` / `as unknown as` / `@ts-ignore`；组件只通过 Zustand store 访问数据，从不直接调 Repository。

### 技术栈

| 层 | 选型 |
|---|---|
| UI | React 19 + TypeScript 6（strict）、Tailwind CSS v4、Radix UI |
| 状态 / 存储 | Zustand v5 · Dexie v4 (IndexedDB)，本地优先无后端 |
| 路由 / 图表 / 时间 | react-router-dom v7（HashRouter）· Recharts 3 · date-fns v4 |
| 构建 / 测试 | Vite 8 · Vitest 4 + Testing Library + fake-indexeddb（744 测试 / 50 文件） |
| 桌面 / 移动 | Tauri v2（Windows exe）· Capacitor v8（Android apk） |
| 加密 / 字体 / 图标 | age-encryption · Inter / Source Serif 4 / JetBrains Mono / LXGW 文楷 · lucide-react |

### 架构

```
use-cases/  ──→  domain/  ──→  data/  ──→  stores/  ──→  features/ + components/ + pages/
(编排)         (纯逻辑)       (Repo+Dexie)  (Zustand)      (UI)
```

`domain/` 不得 import React / Dexie / 浏览器 API。数据流单向，组件经 store 读写，store 包装 Repository，Repository 是唯一触碰 IndexedDB 的地方。

---

## Roadmap

项目核心功能已基本完成，后续重心是向外拓展：

- [ ] **🤖 AI 时间助手** —— 多提供商流式对话，`@` 提及注入结构化时间数据，分析可钉在某一天的日记上。
- [ ] **📈 图表深化** —— 更多关联维度、可自定义的复盘视图。
- [ ] **📱 移动端打磨** —— 把 Android 端的交互与视觉做到与桌面端齐平。
- [ ] **🔄 端到端同步** —— 桌面 ↔ 移动 的本地优先同步（仍坚持无中心服务器的隐私原则）。

已完成的里程碑见 [CHANGELOG](./CHANGELOG.md)。

---

## 本地运行

需要 **Node 20+** 和 npm。

```bash
git clone https://github.com/vanemacus486-bit/CaILens.git
cd CaILens
npm install
npm run dev          # 启动开发服务器（默认 http://localhost:5173）
```

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器（热更新） |
| `npm run build` | 类型检查 + 生产构建（输出 `dist/` 网页包） |
| `npm run test` | 跑一次单元测试（744 个） |
| `npm run lint` | ESLint |
| `npm run tauri:build` | 打包 Windows 桌面 exe → `release/` |
| `npm run android:build` | 打包 Android apk |

---

## 支持这个项目

CaILens 永久免费、本地优先、不含任何广告或追踪。如果它帮你看清了时间，欢迎请作者喝杯咖啡 —— 国内可用 **爱发电**，海外可用 **Gumroad**：

<!-- TODO: 把下面两个占位链接换成你真实的赞助主页（见 src/lib/sponsor.ts） -->
[![Afdian](https://img.shields.io/badge/Afdian-Sponsor-946ce6?style=flat-square)](https://afdian.com/a/REPLACE_ME)
[![Gumroad](https://img.shields.io/badge/Gumroad-Sponsor-ff90e8?style=flat-square)](https://REPLACE_ME.gumroad.com)

---

## 许可

[最终用户许可协议（EULA）](./LICENSE) — Copyright © 2025–2026 vanemacus486-bit. 保留所有权利。

授予个人在单一设备上使用的许可。禁止再分发、转售、商用及反向工程，完整条款见 LICENSE。

<div align="center">
<sub>一本你一小时一小时写出来的书。</sub>
</div>
