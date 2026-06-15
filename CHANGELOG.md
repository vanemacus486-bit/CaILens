# Changelog

CaILens 遵循 [Semantic Versioning](https://semver.org/)。所有显著的变更都会记录在此文件。

---

## [3.24.0] — 2026-06-15

### 变更

- **设置弹窗** — 移除右上角关闭按钮，点击卡片外部即可关闭；修复 backdrop 拦截点击的问题
- **设置选项卡** — 去掉偏好/高级/数据/其他分组标题，选项卡平铺显示；标签名统一为两字（外观、快捷、数据）
- **日历视觉对比** — 时间刻度列与日期头部背景改为 `surface-sunken`，与主网格区域形成明显区分
- **事件块时间显示** — 时长 ≤1 小时的事件不显示时间范围；跨天事件（延续块或跨越午夜）不显示残缺时间，仅完整在当天内且时长 >1h 才显示完整时间段
- **跨天事件指示器** — 移除延续块顶部 ▲ 和底部 ▼ 箭头指示器
- **事件块内容裁剪** — 可见段不足 20 分钟时只保留色块，不渲染文字内容
- **规划页** — 移除矩阵视图顶部"待处理 / 已完成 / 项目"统计条

---

## [3.23.0] — 2026-05-24

### 新增
- **三模式导航** — Day / Week / Month 视图之间的无缝切换，每种视图有独立的交互范式
- **项目-SOP-待办体系** — ProjectsView 新增时间追踪项目引导区，移除旧的 SOP 相关代码
- **四维统计看板** — 统计页分为 4 个标签页，分别覆盖时间分配、趋势、对比和洞察
- **个人资料页** — ProfilePage 作为一个独立页面，管理用户基本信息和偏好
- **身体指标** — 新增身体指标记录和追踪功能
- **饮食卡片重构** — 营养指标替换为每周饮食时间线

### 变更
- 移除 SOP 相关代码，统一到项目-待办体系
- ProjectsView 增加空状态引导

---

## [3.22.0] — 2026-05-21

### 新增
- **Daily Context (日常情境)** — 为每一天记录情境标签，帮助分析不同情境下的时间分配模式
- **相关性分析** — 统计模块新增变量相关性分析，发现时间使用模式的关联因素
- **稳态指标 (Steady Metrics)** — 新增长期稳定的行为量化指标
- **约束模式 (Restrained Mode)** — 限制模式下帮助用户专注于计划内活动

### 变更
- 睡眠散点图重写为日历格式 Y 轴 + 月/季/年视图，性能大幅优化
- QuickLog 简化输入流程 — 移除时间选择器和位置字段，新增 Tab/Alt+number/Enter 快捷键

---

## [3.21.0] — 2026-05-20

### 新增
- **三视图导航系统** — DayEventStream（日事件流）、MonthView（月视图）、经典周视图共存
- **官网 landing page** — `docs/index.html` 项目官网

### 变更
- 统计页全面重构 — 更清晰的信息层级和交互
- README 更新提醒安装包落后，推荐 npm 方式使用

---

## [3.19.0] — 2026-05-19

### 变更
- 睡眠节律图表重设计 — 更好的可视化睡眠模式和规律
- CLAUDE.md 精简 — 去除冗余的开发者文档

---

## [3.18.0] — 2026-05-18

### 新增
- **统一 QuickLog 对话框** — 跨视图一致的快速记录入口
- **Morandi 色板** — 全新的莫兰迪配色方案

### 变更
- 统计页清理 — 移除过时组件，统一视觉风格

---

## [3.17.0] — 2026-05-18

### 新增
- **内联展开编辑** — 事件卡片内直接展开编辑内容
- **描述优先写作流** — 先写描述再填时间的倒序输入
- **衬线字体阅读日视图** — 日视图使用衬线字体优化阅读体验
- **Markdown 渲染** — 事件描述支持 Markdown 格式

---

## [3.16.0] — 2026-05-18

### 新增
- **加密导出** — 数据导出支持加密保护
- **AI 事件反向链接** — AI 自动关联和链接相关事件
- **对话摘要** — 记录会话的自动摘要生成
- **文楷字体** — 新增文泉驿正黑字体选项
- **键盘快捷键审计** — 全局快捷键系统的全面审查和改进

---

## [3.14.0] — 2026-05-16

### 新增
- **标准周视图 (Standard Week View)** — 聚合所有历史周数据，生成典型一周可视化
- **合并组趋势图** — 可自定义分类聚合线，右键配置显示内容

### 性能
- Tauri 文件系统启动时单次 IPC 批量读取，大幅减少启动读取次数

---

## [3.13.0] — 2026-05-13

### 新增
- **分钟轴拖拽系统** — 连续坐标轴，支持跨天事件拖拽调整时间

---

## [3.12.0] — 2026-05-11

### 新增
- **AI 时间助手** — `@提及`、日历集成、Markdown、内联图表、锚定、置顶功能
- 440+ 测试用例，schema v9

---

## [3.11.0] — 2026-05-10

### 新增
- **移动端 UI 大改** — 全屏设置、单日日历、汉堡菜单导航
- **深色模式重设计** — 中性灰色板、全覆盖、干净事件块
- **全局键盘快捷键系统** — 可自定义按键绑定
- 统计趋势图改进 + 搜索/命令面板迁移

---

## [3.9.0] — 2026-05-09

### 变更
- 设置页模块化为标签式子路由
- 统计页简化
- Bump Tauri 版本至 3.9.0

---

## [3.8.0] — 2026-05-09

### 新增
- **统计页重设计** — 洞察优先的 Deficit Dashboard（赤字看板）+ Small Multiples（小多图）

### 修复
- 类别库增加防御性深度植入
- 就绪事件类别重新植入 — 移除 setCount 前置条件
- 热力图网格对齐 + Tauri WebView2 颜色渲染

### 架构
- 引入 `StorageAdapter` 抽象层 + Tauri 文件系统后端

---

## [3.7.0] — 2026-05-08

### 新增
- **ICS 导入重设计** — 事件名称聚合 + 内联分类
- 年视图增加年份切换 ‹ › 导航

---

## [3.6.0] — 2026-05-08

### 新增
- **年度热力图** — 全年时间分布一目了然
- **编辑型统计页重设计** — 更好的数据呈现
- ICS 拖拽导入

---

## [3.5.0] — 2026-05-06

### 新增
- **快速记录 (QuickLog)** — 全局快捷键唤起的快速事件录入对话框
- Schema v7，315 个测试用例

---

## [3.4.0] — 2026-05-05

### 变更
- 无障碍通过 (a11y pass)
- 设计 Token 清理

### 修复
- 四个图表正确填满视口高度
- 热力图单元格通过 ResizeObserver 调整大小
- 强调色正确作用于表面/边框
- 统计页内容顶部对齐

---

## [3.3.0] — 2026-05-05

### 新增
- **设计 Token 系统** — 统一的颜色、间距、字体设计令牌
- **主题色切换器** — 内置多种强调色方案

### 变更
- StatsPage 从 10 模块滚动压缩为 4 图表视图切换器

---

## [3.2.0] — 2026-05-05

### 修复
- P0-P3 深度打磨 — 稳定性、无障碍、UX 一致性、死代码清除

---

## [3.1.0] — 2026-05-05

### 修复
- 稳定性全面打磨
- 基础设施加固
- UX 一致性调整
- 代码质量提升

---

## [3.0.0] — 2026-05-04

### 新增
- **搜索面板** — Ctrl+K 全局唤出 + 结果导航
- **跨天事件** — 支持跨越午夜的事件记录
- **移动端响应式布局**
- **空状态** — 各页面空数据时友好提示

### 变更
- 移除 Claude Code 引用，CLAUDE.md 重写为开发者文档
- 中文 README 设为主文档，新增下载区

---

## [2.0.0] — 2026-05-01

### 新增
- **CaILens 2.0 视觉重设计**
- **统计页** — 完整的统计功能页面
- **预算系统 (Budget System)** — 为每类活动设定时间预算
- **回顾反思 (Review Reflection)** — 周期性回顾和反思工具
- **年度预测 (Annual Projection)** — 基于当前趋势的全年预测
- **数据成熟度系统** — 数据质量和可信度指标
- Schema v3，支持 v1→v3 数据迁移
- 双语分类体系（中文 + 英文）

### 变更
- 全面迁移至 Tailwind CSS
- 设计系统重构 — 填充色和语义色 Token

### 技术栈
- Vite + React + TypeScript
- Tailwind CSS
- Zustand 状态管理
- Vitest 测试框架

---

## [0.2.0] — 2026-05-01

### 新增
- **Tauri v2** — 支持 Windows 桌面端
- **Capacitor** — 支持 Android 移动端
- 双平台构建通道

---

## [0.1.0] — 2026-04-25

### 新增
- 项目初始化
- 基础时间记录功能
- 周视图时间线
- 事件 CRUD
- ICS 文件导入
- 关键词自动分类
- 独立的设置页和统计页
- 双语支持（中文 / 英文）

---

## 版本履历说明

- **v0.1.0 → v0.2.0** — 初始原型和双平台构建
- **v2.0.0** — CaILens 品牌化 + 视觉重设计 + 统计/预算/回顾体系
- **v3.0.0–v3.23.0** — 快速迭代周期：搜索、跨天事件 → QuickLog → 热力图 → 统计看板 → 全局快捷键 → 深色模式 → AI 助手 → 导航系统 → 项目-待办体系 → 身体指标

当前版本：**v3.23.0**（498 个测试用例）

[3.23.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.23.0
[3.22.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.22.0
[3.21.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.21.0
[3.19.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.19.0
[3.18.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.18.0
[3.17.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.17.0
[3.16.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.16.0
[3.14.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.14.0
[3.13.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.13.0
[3.12.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.12.0
[3.11.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.11.0
[3.9.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.9.0
[3.8.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.8.0
[3.7.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.7.0
[3.6.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.6.0
[3.5.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.5.0
[3.4.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.4.0
[3.3.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.3.0
[3.2.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.2.0
[3.1.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.1.0
[3.0.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v3.0.0
[2.0.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v2.0.0
[0.2.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v0.2.0
[0.1.0]: https://github.com/vanemacus486-bit/CaILens/releases/tag/v0.1.0
