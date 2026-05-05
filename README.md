# CaILens

[English Version](./README.en.md)

> *记录时间。像一本你一小时一小时写出来的书。*

CaILens 是一个本地优先的时间记录工具，灵感来自《奇特的一生》中柳比歇夫坚持了 56 年的"时间统计法"。它记录、分类、可视化你的时间去向——没有账号、没有服务器、没有数据上报。

<img width="1920" height="978" alt="image" src="https://github.com/user-attachments/assets/7a408948-e7fd-4137-89a7-5361b12b64c5" />

<img width="1920" height="978" alt="image" src="https://github.com/user-attachments/assets/85722717-8233-41ff-946b-ecc2f8fcf60a" />

<img width="1920" height="978" alt="image" src="https://github.com/user-attachments/assets/0c7ebf00-f893-4a3a-8f3b-2063cab143a2" />

> **状态：** v3.3 统计页减法重构完成。4 张核心图表通过视图切换器访问——不再一路滚到底。设计 token 体系已建立，支持 rust / ocean / forest / plum 四套主题色切换。

## 下载

| 平台 | 下载 | 说明 |
|------|------|------|
| Windows (x64) | [CaILens.exe](https://github.com/vanemacus486-bit/CaILens/releases/latest) | 便携免安装，Windows 10 1803+ |
| Android | [CaILens-android-debug.apk](https://github.com/vanemacus486-bit/CaILens/releases/latest) | Android 7.0+ |

> Android APK 已更新，包含移动端响应式布局和最新功能改进。

---

## 设计哲学

市面上几乎所有日历工具都在解决"把未来安排进格子里"——提醒你开会、收邀请、设闹钟。但理解自己的时间去向是完全不同的命题。

柳比歇夫从 26 岁开始记录每天每一小时，持续 56 年直至去世。这不是"效率表演"——而是一种真正看清楚生命如何被度过的工具。

CaILens 就是这个工具在浏览器里的一个尝试。

- **记录，不规划。** 这里没有日程。你记录的是已经发生的事，不是对明天的承诺。
- **本地优先。** 数据存在 IndexedDB 里。没有账号、没有服务器、没有数据上报。你的时间日记只属于你。
- **安静的设计。** 暖中性色调，衬线标题，克制的主色。应用不催促、不评价、不打扰。
- **代码质量优先于功能数量。** TypeScript 严格模式，301 个测试，单向依赖分层。代码库应该经得起时间考验。

---

## 功能

### 周视图日历

- **24 小时一屏可见**（周一至周日，带时间刻度栏）。
- **点击空白创建**——弹出卡片覆盖层，一句话提示：*"你在做什么？"*
- **拖拽移动**——指针跟随，支持跨天。基于原生 Pointer Events 手写，没用库。
- **拖拽边缘改时长**——上下手柄调整起止时间，可拖过午夜变为跨天事件。
- **跨天事件**——睡眠等跨越午夜的记录自动跨天显示，带箭头指示器和连续圆角。
- **实时预览 60fps**——编辑或拖动时，草稿事件即时渲染。
- **右键菜单**——删除、换颜色（6 种颜色，每种对应一个分类）。
- **重叠事件并排**——自动水平排列。
- **当前时间红线**——焦橙色，仅今日列显示，每分钟更新。
- **浅色 / 深色模式**——手动切换，首次自动检测系统偏好。设置页提供 segment-control 切换。

### 搜索

- **Ctrl+K / Cmd+K 全局快捷键**——任意页面唤出搜索面板。
- **关键词搜索**——匹配事件标题、描述和地点，大小写不敏感。
- **即时导航**——点击搜索结果跳转到对应周并自动打开事件详情卡片。
- **工具栏入口**——周视图工具栏搜索图标按钮。

### 侧边栏

- **图标栏 hover 展开**——200ms 延迟，悬停显示中英文标签。可固定展开状态，状态持久化到 localStorage。
- **周导航**——上一周、下一周、跳回本周。
- **ICS 导入**和**统计看板**入口。

### 日视图日记

- **竖排时间线**——一次看一天，时间标签 + 彩色圆点 + 衬线正文。
- **分类切换分隔线**——活动类型变化时出现微妙的分割线。
- **前后日导航**——一天一天翻阅你的日记。

### 分类系统（6 个固定分类）

| 颜色 | 中文名 | 英文名 | 归类 |
|---|---|---|---|
| 焦橙色 | 主要矛盾 | Core Focus | Type I — 创造性核心 |
| 鼠尾草绿 | 次要矛盾 | Support Tasks | Type II — 辅助 |
| 沙色 | 庶务时间 | Chores & Admin | Type II — 辅助 |
| 暖灰蓝 | 个人提升 | Personal Growth | Type I — 创造性核心 |
| 玫瑰色 | 休息娱乐 | Rest & Leisure | Type II — 辅助 |
| 石灰色 | 睡眠时长 | Sleep | Type II — 辅助 |

中英文名称可分别修改。每个分类可设置**每周预算**（小时数）——在设置页编辑。每个事件必须属于一个分类。

### 设置页

- **三区布局**——界面（语言）、分类（名称 + 预算 + 关键词）、数据（导出）。
- **语言切换**——中文 / English，使用分段式选择器。
- **主题切换**——浅色 / 深色，使用分段式选择器，首次自动检测系统偏好。
- **每分类预算**——数字输入框，设置每周目标小时数。
- **关键词折叠**——默认显示计数 badge 和预览；点击展开完整关键词文件夹编辑器。
- **数据导出**——一键 CSV / JSON 下载。

### 统计看板

点击侧边栏图表图标进入。**顶部视图切换器**选择图表类型，一次只显示一个：

**单期分类条形图**（默认）
- 横向条形图，Y 轴为 6 个分类，X 轴为小时数。
- 柱子总宽 = 该分类本期预算值（`bg-surface-sunken` 浅底轨），内部实心填充 = 实际时长（分类色）。
- 超额部分向预算线右侧延伸，使用警告色填充——一眼看出哪些分类超支。
- 右侧标签 `实际/预算h` 显示精确数字。

**多期对比**
- 2/3/6/12 张小图并排，每张结构与单期条形图一致。
- 统一比例尺以便横向扫视趋势。
- 期数通过小 segmented control 切换。

**趋势图**
- 多线折线图（Recharts），用户通过分类芯片多选追踪哪些分类。
- 默认只显示"主要矛盾"，选择项持久化到 localStorage。
- 水平虚线标记预算基准线——用户看到自己离目标多远。

**日强度热力图**
- 7 行（周一至周日）× N 列（期内天数）网格。
- 每格颜色深浅 = 当日"主要矛盾"占 24 小时的比例，而非旧版"那天有没有记录"。
- 鼠标悬停显示具体小时数和占比。
- 底部渐变图例从低到高。

**周期选择：** 周 / 月 / 季 / 年 / 全部——所有 4 张图共用。  
**数据成熟度：** Cold / Warming / Mature 三级仍然生效，数据不足时显示占位提示。

### ICS 导入

- **解析 RFC 5545 文件**（通过 ical.js）。自动跳过全天事件和重复事件，预览中显示数量。
- **关键词自动分类**——每个分类可配置关键词（支持文件夹分组）。导入时按事件标题匹配（大小写不敏感、子串匹配），命中即归类。
- **关键词修改自动重归类**——修改关键词后全库事件自动重新匹配。

### 数据

- **本地持久存储**——IndexedDB（Dexie v4）。Schema 已到 version 6。迁移自动执行。
- **连续记录统计**——`computeStreak()` 计算连续有记录的周数。
- **数据导出**——CSV 和 JSON，在设置页可用。

---

## 怎么跑起来

需要 **Node 20 以上** 和 **npm**。

```bash
git clone https://github.com/vanemacus486-bit/CaILens.git
cd CaILens
npm install
npm run dev
```

打开 Vite 打印的地址（通常是 `http://localhost:5173`）。

### 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 类型检查 (tsc) + 生产构建 (vite)
npm run preview      # 本地预览构建结果
npm run test         # 跑一次单元测试（301 个测试）
npm run test:watch   # 监听模式
npm run lint         # 跑 ESLint
```

---

## 技术栈

| 层 | 选型 | 备注 |
|---|---|---|
| UI | React 19 + TypeScript（strict） | 函数组件、hooks、不允许 `any` |
| 构建 | Vite 8 | |
| 样式 | Tailwind CSS v4 + CSS 自定义属性 | shadcn 风格组件基于 Radix UI |
| 状态 | Zustand v5 | 切片订阅，避免不必要重渲染 |
| 存储 | IndexedDB（Dexie v4） | 本地优先，无后端 |
| 图表 | Recharts 3 | 饼图、柱状图、面积图、折线图 |
| 时间 | date-fns v4 | 不引入 dayjs / moment |
| 测试 | Vitest 4 + React Testing Library + fake-indexeddb | 301 个测试，18 个测试文件 |
| 字体 | Inter、Source Serif 4、JetBrains Mono | Fontsource 本地托管 |
| 图标 | lucide-react | |

---

## 架构

```
domain/  ──→  data/  ──→  stores/  ──→  features/ + components/
 (纯逻辑)    (Repository)   (Zustand)        (UI)
```

- **`domain/`** —— 纯类型和业务逻辑。不依赖 React、不依赖 IndexedDB、没有副作用。全单元测试覆盖。
- **`data/`** —— Dexie schema 和 repository。项目里唯一直接碰 IndexedDB 的地方。
- **`stores/`** —— Zustand store，包装数据层。组件永远不直接调 repository。
- **`features/` + `components/`** —— React UI。`features/` 放业务视图；`components/` 放可复用原语。

几个值得一提的实现：

- **拖拽系统**完全基于原生 Pointer Events 手写。命中检测和吸附对的是布局网格，不是 DOM。
- **渲染性能**——`React.memo`、稳定 callback、Zustand 切片订阅，拖一个事件不会让整周重渲染。
- **统计引擎**——纯函数构成的周统计、时段聚合、区间合并、Type I/II 分离、连续记录、年度推演、数据成熟度、回顾生成、偏差分析、记录质量指标。

## 开源协议

[Creative Commons Attribution-NonCommercial 4.0 International](./LICENSE)

你可以自由使用、分享、改编本软件，但仅限于非商业用途，且需署名。商业使用需另行授权。

---

[English version →](./README.en.md)
