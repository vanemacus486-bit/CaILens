import type { PluginDefinition } from '../types'

/**
 * 补记模式（quick-backfill）。
 *
 * 这是第一个真实插件，选它做验证的理由：
 * - 纯新增代码，不改任何现有文件（骨架之外），坏了删掉目录即可回滚
 * - 重度依赖事件表，正好验证「插件能否只读主体数据」
 * - 直接命中真实痛点：日常记不过来，需要一次补一周
 *
 * 它不自带表，全部写进主体的 `events`。所以 `tables` 留空——
 * 声明 events 会误导数据导出时的归属判断。
 */
export const quickBackfillPlugin: PluginDefinition = {
  id: 'quick-backfill',
  name: '补记模式',
  description: '表格式批量补录，支持时间接续与跨天记录。',
  version: '1.0.0',
  defaultEnabled: true,
  routes: [
    {
      path: '/backfill',
      component: () => import('./BackfillPage').then((m) => ({ default: m.BackfillPage })),
    },
  ],
  navItems: [
    {
      label: '补记',
      to: '/backfill',
      icon: 'Rows3',
      order: 40,
    },
  ],
}
