import type { PluginDefinition } from './types'
import { registerPlugins } from './registry'
import { quickBackfillPlugin } from './quick-backfill'
import { planningPlugin } from './planning'
import { reviewPlugin } from './review'
import { reviewTrendPlugin } from './review-trend'
import { reviewHeatmapPlugin } from './review-heatmap'
import { reviewSleepPlugin } from './review-sleep'
import { reviewDietPlugin } from './review-diet'
import { reviewHygienePlugin } from './review-hygiene'

/**
 * 内置插件清单。
 *
 * 主体的三个主域：日历（`/week`）由主体独占，规划（`/action`）与复盘（`/stats`）
 * 已迁为插件。复盘域再进一步拆成「外壳 + 五个子视图插件」：
 *
 *   review（域外壳 / layout / 宿主页）
 *     └─ review-trend / -heatmap / -sleep / -diet / -hygiene
 *        每个通过 `domainViews` 往复盘域里加一格，可单独关掉。
 *
 * 关掉 `review` 等于整个复盘域消失；只关某个子视图插件，其余格子照旧。
 *
 * 新增插件时的检查清单：
 * - 是否只用 `domain/` 与 `stores/` 的公开接口？用了 `data/` 的 Repository 就是越界
 * - 是否声明了 `tables`？声明意味着「数据归属」，共享主体表时留空
 * - 关闭插件后，主路径是否完全不受影响？（这是开关的验收标准）
 * - 认领 `domain` 的插件若提供 `sidebarPanel`，切换器会用它；不提供则回退到
 *   由 `domainViews` 汇总生成的通用导航（`DomainViewNav`）
 */
export const BUILTIN_PLUGINS: PluginDefinition[] = [
  planningPlugin,
  reviewPlugin,
  reviewTrendPlugin,
  reviewHeatmapPlugin,
  reviewSleepPlugin,
  reviewDietPlugin,
  reviewHygienePlugin,
  quickBackfillPlugin,
]

/** 在 App 启动时调用一次。 */
export function installBuiltinPlugins(): void {
  registerPlugins(BUILTIN_PLUGINS)
}
