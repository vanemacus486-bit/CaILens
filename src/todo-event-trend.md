# TODOs — 事件维度趋势/热力图

## 1. Data 层：`useStatsAggregation` 支持标题过滤 [DONE]
   - [x] `computeBucket` 增加可选 `titleFilter` 参数
   - [x] `computeHistory` 传递 `titleFilter`
   - [x] 新增 `useTitleStatsAggregation` hook
   - [x] TypeScript 编译通过，现有测试全部通过

## 2. 实现 EventTitleTrendChart 组件 [DONE]
   - [x] 创建 `src/components/stats/EventTitleTrendChart.tsx`
   - [x] 事件标题选择器（搜索+自动补全下拉，按频率排序）
   - [x] 趋势折线图（复用 trend- CSS 前缀）
   - [x] 统计卡片（本期/平均/峰值/记录次数）
   - [x] 空态提示「选择一个事件标题查看趋势」

## 3. 实现 EventTitleHeatmap 组件 [DONE]
   - [x] 创建 `src/components/stats/EventTitleHeatmap.tsx`
   - [x] 标题选择器（可复用，与 EventTitleTrendChart 各自独立）
   - [x] 一年热力网格，按选中事件的投入时长着色（accent 色，5 级透明度）
   - [x] 悬浮 tooltip 显示日期和时数
   - [x] 空态提示

## 4. 集成到 StatsPage [DONE]
   - [x] `RoutineViewMode` 增加 `'event'`
   - [x] `ROUTINE_VIEWS` 增加 `'event'`
   - [x] 二级 pills 增加「事件」按钮
   - [x] 读取/写入 `?eventTitle=xxx` URL 参数
   - [x] `routineView === 'event'` 时渲染 EventTitleTrendChart + EventTitleHeatmap 垂直堆叠

## 5. 打通回日历链路 [DEFERRED — 可以在后续迭代中通过点击数据点/navigate 实现]
   - [ ] 热力图单元格点击 → navigate to week view with openEvent
   - [ ] 趋势图数据点点击 → navigate to week view with openEvent
