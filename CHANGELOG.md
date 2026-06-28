# v3.23.0 变更记录

> 发布时间：2026-06-19

本版本是一次重大重构与功能升级：移除了旧版目标/路线图系统，全面重构了存储层、日历底层、周视图与导航框架，引入国际化支持、全新的规划页、睡眠提醒、日期标记等功能。共 7 个提交，涉及 117+ 个文件。

---

## ✨ 新功能

### 规划页（全新）
- 多清单列布局（Google Tasks 风格），支持创建/切换待办清单
- 任务行内完成（划线即归档，自动沉底）
- 已完成任务分区展示，支持展开/折叠
- 快速添加任务组合键（Ctrl+Enter 添加，箭头键导航）

### 待办清单系统
- 新增 `listId` 字段，支持待办按清单分组
- `todoListRepository` + `todoListStore`：清单的增删改查
- 默认清单（`default`）自动迁移旧待办

### 睡眠提醒
- 可设置就寝/起床时间，定时弹出桌面通知
- Tauri 系统通知（`tauri-plugin-notification`）
- 桌面端：BedtimeBannerHost 就寝横幅提醒
- 设置页：提醒开关、时段、重复模式

### 日期标记（Day Mark）
- 右键月历单元格打标（颜色 + 标签文字）
- 标记列表统一管理（设置页内）
- 标记支持 6 种事件色

### 国际化系统（i18n）
- 全新 key-based 翻译框架（`useT` hook）
- 内置中文（zh）、英文（en）完整翻译
- 支持参数插值（{count}），便于复数/数量词
- 设置页语言切换即时生效

### 统计模块增强
- StatsPage 全面重写：Rail 侧栏导航 + 按 Tab 切换视图
- **DietView**：饮食时间线 + 食物频率矩阵
- **HygieneView**：卫生时间线 + 活动频率矩阵
- **StatsHeader**：段式切换器（日/周/月、近一年/年度等）
- **StatsRail**：侧栏导航 + 紧凑模式
- CategoryTrendChart / SleepScatterChart / YearHeatmap 性能优化

### 个人档案升级
- 新增头像（emoji 选择器）和用户名称字段
- 账户管理设置页（SettingsAccount）
- Esc 返回上一级

---

## 🔧 重构

### 存储层 -> 适配器模式
- `StorageAdapter` 统一接口：IndexedDB / FileSystem / Tauri FS 三端一致
- `FileSystemAdapter` 两阶段扫盘 + 单文件直写
- Schema v26 → v27：新增 `listId`/`isStarred` 字段
- `quickScanInitial` 并行加载提速

### 日历底层 -> 15 分钟粒度
- `SLOTS_PER_HOUR`：2 → 4（48 → 96 时隙）
- EventBlock / DayColumn / TimeGrid 全面适配
- 事件布局算法优化，重叠事件并排计算

### 周视图重写
- WeekView 简化为 week/month 双模式（移除旧的 day 模式）
- WeekSidebar 移至 App 顶层布局，跨页保持展开状态
- MonthView 重写：受控月份、溢出弹出卡片（MonthOverflowPopover）
- 快捷键 `Ctrl+←/→` 切换周，`Ctrl+Shift+←/→` 切换天

### 导航框架重构
- 新增 AppHeader（全局顶栏 + 月份导航 + 窗口控制）
- 新增 SimpleSidebar（复盘统计侧栏）、CompactSidebar（紧凑版）
- 新增 WindowControls + AccountMenu
- 无边框窗口（`decorations: false`），自定义窗口按钮
- TopNavBar / SlideSegmented / domainNav 适配新布局

### 快捷键系统重构
- 新增动作：`goToCalendar`/`goToPlan`/`goToReview`/`toggleSidebar`
- 默认绑定优化：
  - `Esc` → 回周视图（替代硬编码）
  - `Ctrl+,` → 开设置
  - `Delete` → 删除事件
  - `Ctrl+D` → 复制事件
  - `Ctrl+B` → 切换侧栏
  - `Alt+1/2/3` → 切换日历/规划/复盘

---

## 🗑️ 移除

### 旧目标/路线图系统
- 删除 `domain/goal*.ts`、`keyMetric.ts` 及全部 6 个领域文件
- 删除 `goalRepository.ts`、`goalStore.ts`
- 删除 `features/roadmap/` 全部 12 个 UI 组件
- 删除相关测试文件

### 废弃前端组件
- ActionPage 旧组件：InboxTaskList / PriorityMatrix / TodoDetailCard / QuickCreateCard 等
- DayEventStream（废弃的日视图流式组件）
- CalendarHeader（由 AppHeader 替代）

---

## 📦 依赖变更

### 新增
| 包 | 用途 |
|---|---|
| `@tauri-apps/plugin-notification` ^2.3.3 | Tauri 系统通知 |
| `@capacitor/local-notifications` ^8.2.0 | 移动端本地通知 |
| `tauri-plugin-notification` 2 | Rust 端通知插件 |

---

## ✅ 测试

- 新增 13 个测试文件（calendar / nav / stats / planning / domain 等）
- 重构现有测试适配新的 schema 和 i18n
- 全部 500+ 测试通过

---

## ⚠️ 升级注意

1. **旧目标数据**：`goalId` 字段仍在事件/待办类型中保留，仅移除 UI 和领域逻辑，现有数据不受影响
2. **待办清单迁移**：旧待办自动归入「默认」清单
3. **用户配置重置**：快捷键自定义绑定重置为新的默认值
