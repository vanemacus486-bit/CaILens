# CaILens 进度档案(progress.md)

> 每次新会话只读两个文件:本文件 + CLAUDE.md。不读历史对话。
> 每次会话结束前更新本文件。

---

## 当前阶段

**v3 已实现。** 周视图 + 日视图 + 统计仪表盘 + 关键词系统 + 估算/反思 + 17 个测试文件 267 条测试全部通过。

---

## 已完成

### 第一版(全部完成)
- 周视图、24 小时一屏、URL 周参数同步
- 点击空白创建、双击 inline 改名、拖拽移动、边缘 resize、跨天拖拽
- 右键菜单(删除/复制/改色)
- 6 色分类、深浅模式、当前时间红线
- 100+ 单元测试

### 第二版 — 分类与统计(全部完成)
- 分类系统(6 个固定分类，双语名称，用户可改名)
- 设置面板(语言切换 + 分类改名，Radix Popover)
- 周统计卡片网格(颜色圆点 + 分类名 + 进度条 + 时长/百分比)
- 侧边栏导航(图标按钮 + Tooltip)
- Dexie schema v1→v3(events + categories + settings)
- v1→v2 事件数据迁移(`migrateEventV1ToV2`)

### 第三版 — 从记录到理解(全部完成)
- **日视图**(`/day`):日记风格时间线，URL 参数 `?date=YYYY-MM-DD`
- **统计仪表盘**(`/stats`):多粒度(周/月/季/年/全部)、多图表、多指标
  - 概览卡片、环图/堆叠条图、柳比歇夫分析、24h 热力图、30 天趋势、月度对比
- **关键词系统**:KeywordFolder 文件夹 + 关键词列表，自动学习 + 批量重新分类
- **ICS 导入**:.ics 文件解析(跳过全天/重复事件)、关键词自动归类
- **周估算系统**:weeklyEstimates 表、偏差检测、系统性偏差(连续 3 周 ±30%)
- **数据成熟度**:cold/warming/mature 三级，UI 自适应
- **记录质量指标**:事件数、平均粒度、实时率、覆盖率
- **年度投影**:柳比歇夫基准 2200h 对比
- **周反思**:双语反思文本生成(`generateWeeklyReflection`)
- **Settings 页面**(`/settings`):语言 + 分类编辑 + 文件夹关键词管理 + 数据导出
- **UI 改进**:侧边栏 hover 展开 + 固定、移动端 overlay、recharts 图表
- **数据迁移**:v4(关键词→文件夹)、v5(weeklyBudget)、v6(weeklyEstimates)
- 依赖新增:recharts v3、ical.js v2、react-router-dom v7
- 267 个单元测试(17 个文件)，全部通过

---

## 下一步

等待 PM 评审 v3 功能。后续方向由 PM 决定。

---

## 遗留决策 / 待澄清

- [ ] 全天事件 / 跨天事件 —— 数据结构当前不支持，需 schema 变更
- [ ] 重复事件 —— 同上
- [ ] 月视图 / 年视图 —— 仅统计页有，无日历视图
- [ ] 统计页是否为常住功能还是需要简化——等 PM 反馈

---

## 会话日志

### 2026-04-27
- 完成 Step 1(domain 层):category 双语化、settings 类型、stats 纯函数 + 27 个测试
- ESLint 3 条规则降级 + decisions.md 初始化
- 完成 Step 2(data 层):v1→v3 schema、两个 repository + 测试
- 发现并解决 Dexie v4 upgrade async 函数内 categories.put() 失效问题(on('populate') 方案)
- 三件套:0 errors / 166 passed / build ✓

### 2026-05-02
- **文档债务清理**:CLAUDE.md 从 v2 更新到 v3(数据模型、schema v3→v6、技术栈、路由表、架构文件清单、已实现功能清单、设计 token 修正)
- progress.md 同步更新到 v3 状态