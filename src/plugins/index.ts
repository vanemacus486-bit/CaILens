import type { PluginDefinition } from './types'
import { registerPlugins } from './registry'
import { quickBackfillPlugin } from './quick-backfill'
import { planningPlugin } from './planning'
import { reviewPlugin } from './review'

/**
 * 内置插件清单。
 *
 * 主体的三个主域：日历（`/week`）由主体独占，规划（`/action`）与复盘（`/stats`）
 * 已迁为插件。插件认领域后，域切换器、快捷键、移动端底部导航、顶栏显隐都由
 * `registry.collectDomains()` 的结果驱动，主体不再硬编码这两条路径。
 *
 * 新增插件时的检查清单：
 * - 是否只用 `domain/` 与 `stores/` 的公开接口？用了 `data/` 的 Repository 就是越界
 * - 是否声明了 `tables`？声明意味着「数据归属」，共享主体表时留空
 * - 关闭插件后，主路径是否完全不受影响？（这是开关的验收标准）
 * - 认领 `domain` 的插件必须同时提供 `sidebarPanel`，否则切换器会指向一个空侧栏
 */
export const BUILTIN_PLUGINS: PluginDefinition[] = [
  planningPlugin,
  reviewPlugin,
  quickBackfillPlugin,
]

/** 在 App 启动时调用一次。 */
export function installBuiltinPlugins(): void {
  registerPlugins(BUILTIN_PLUGINS)
}
