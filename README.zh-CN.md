# CaILens

> *记录时间。像一本你一小时一小时写出来的书。*

CaILens 是一个本地优先的时间记录工具，灵感来自《奇特的一生》中柳比歇夫坚持了 56 年的"时间统计法"。它记录、分类、可视化你的时间去向——没有账号、没有服务器、没有数据上报。

![CaILens 周视图](https://github.com/user-attachments/assets/f8e2a65e-a9ce-44a9-929f-ab4a790c4b84)

> **状态：** 持续开发中。v2 已发布——分类系统、周统计、ICS 导入、关键词自动分类、日视图和基于 Recharts 的完整统计看板。

---

## 设计哲学

市面上几乎所有日历工具都在解决"把未来安排进格子里"——提醒你开会、收邀请、设闹钟。但理解自己的时间去向是完全不同的命题。

柳比歇夫从 26 岁开始记录每天每一小时，持续 56 年直至去世。这不是"效率表演"——而是一种真正看清楚生命如何被度过的工具。

CaILens 就是这个工具在浏览器里的一个尝试。

- **记录，不规划。** 这里没有日程。你记录的是已经发生的事，不是对明天的承诺。
- **本地优先。** 数据存在 IndexedDB 里。没有账号、没有服务器、没有数据上报。你的时间日记只属于你。
- **安静的设计。** 暖中性色调，衬线标题，克制的主色。应用不催促、不评价、不打扰。
- **代码质量优先于功能数量。** TypeScript 严格模式，500+ 测试，单向依赖分层。代码库应该经得起时间考验。

---

## 功能

### 周视图日历

- **24 小时一屏可见**（周一至周日，带时间刻度栏）。
- **点击空白创建**——弹出卡片覆盖层，一句话提示：*"你在做什么？"*
- **拖拽移动**——指针跟随，支持跨天。基于原生 Pointer Events 手写，没用库。
- **拖拽边缘改时长**——上下手柄调整起止时间。
- **实时预览 60fps**——编辑或拖动时，草稿事件即时渲染。
- **右键菜单**——删除、换颜色（6 种颜色，每种对应一个分类）。
- **重叠事件并排**——自动水平排列。
- **当前时间红线**——焦橙色，仅今日列显示，每分钟更新。
- **浅色 / 深色模式**——跟随系统偏好。

### 日视图日记

- **竖排时间线**——一次看一天，时间标签 + 彩色圆点 + 衬线正文。
- **分类切换分隔线**——活动类型变化时出现微妙的分割线。
- **前后日导航**——一天一天翻阅你的日记。
- **一键返回周视图**。

### 分类系统（6 个固定分类）

| 颜色 | 中文名 | 英文名 | 归类 |
|---|---|---|---|
| 焦橙色 | 核心工作 | Core Work | Type I — 创造性核心 |
| 鼠尾草绿 | 辅助工作 | Support Work | Type II — 辅助 |
| 沙色 | 必要事务 | Essentials | Type II — 辅助 |
| 暖灰蓝 | 阅读学习 | Reading & Study | Type I — 创造性核心 |
| 玫瑰色 | 休息 | Rest | Type II — 辅助 |
| 石灰色 | 其他 | Other | Type II — 辅助 |

中英文名称可分别修改。每个事件必须属于一个分类。

### 统计看板

点击侧边栏图表图标进入，基于 **Recharts** 构建：

- **总览卡片**——净有效时间、核心工作、连续记录、本期累计。每张带所选对比模式的环比变化。
- **时间分配**——交互式环形饼图（分类占比）+ 堆叠柱状图（每日分布）。
- **柳比歇夫分析**——Type I（创造性核心）/ Type II（辅助）分离，百分比条 + 分类累计小时。
- **节奏与日程**——24 小时堆叠面积图、每周节奏表（主导活动标签）、7×24 热力图。
- **趋势与对比**——30 天滚动趋势线 + 每周 sparkline 卡片。
- **时间预算**——预算 vs 实际进度条 + 超预算/未超预算分组。
- **本周回顾**——模板驱动的叙事性复盘。
- **值得注意的时刻**——自动检测：最长记录段、连续记录、最高分类。
- **导出**——一键 CSV / JSON 下载。数据始终在本地。

**周期选择：** 周 / 月 / 季 / 年 / 全部。  
**对比模式：** 环比 / 同比 / 对比均值。

### ICS 导入

- **解析 RFC 5545 文件**（通过 ical.js）。自动跳过全天事件和重复事件，预览中显示数量。
- **关键词自动分类**——每个分类可配置关键词。导入时按事件标题匹配（大小写不敏感、子串匹配），命中即归类。
- **关键词修改自动重归类**——修改关键词后全库事件自动重新匹配。

### 数据

- **本地持久存储**——IndexedDB（Dexie v4）。Schema 迁移自动执行。
- **连续记录统计**——`computeStreak()` 计算连续有记录的周数。

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
npm run test         # 跑一次单元测试
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
| 测试 | Vitest + React Testing Library + fake-indexeddb | |
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

---

## 关于和 Claude Code 的协作

这个项目是和 [Claude Code](https://www.anthropic.com/claude-code) 深度协作完成的。分工：

- **我负责**——产品方向、架构决策、UX 品位判断、配色、字体、决定**不做什么**。
- **Claude 负责**——大部分实现、测试脚手架、Recharts 集成、Pointer Events 边界情况的调试。

拖拽系统走了三轮（HTML5 DnD → Pointer Events → 60fps 实时预览）。每一轮都是一次对话，不是一个 prompt。`CLAUDE.md` 记录了我们在这个项目里形成的工作规范。

---

## 开源协议

[Creative Commons Attribution-NonCommercial 4.0 International](./LICENSE)

你可以自由使用、分享、改编本软件，但仅限于非商业用途，且需署名。商业使用需另行授权。

---

[English version →](./README.md)
