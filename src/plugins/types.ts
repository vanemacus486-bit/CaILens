/**
 * 插件契约。
 *
 * 设计约束（来自实际技术边界，不是偏好）：
 * 1. 代码同 bundle，不做动态 import —— Tauri CSP 与 Capacitor WebView 都会拦远程加载，
 *    且没有 Node 侧可执行环境。插件靠 `plugins/` 目录隔离 + 开关控制注册。
 * 2. Dexie 的表结构必须在 `data/db.ts` 一次性声明。Dexie 的 version() 是全局单调的，
 *    插件动态增删表会让版本号爆炸且无法回退。所以插件的 `schema` 字段只做**归属声明**
 *    （哪张表属于哪个插件），不参与建表。
 * 3. 插件不得反向依赖主体 UI。它可以依赖 domain/ 与 stores/，但主体不得 import 插件的内部实现，
 *    只能通过 registry 拿到 PluginDefinition。
 *
 * ## 主体 → 插件依赖白名单
 *
 * 主体（`src/` 中除 `src/plugins/<id>/` 之外的所有代码）只允许 import 下面这几个入口：
 *
 *   - `@/plugins/types`        类型契约
 *   - `@/plugins/registry`     注册与查询（collect* 纯函数）
 *   - `@/plugins/PluginRoutes` 路由展开（`usePluginRoutes`）
 *   - `@/plugins/PluginSidebar` 侧栏插槽
 *   - `@/plugins/PluginTopBar`  顶栏插槽
 *   - `@/plugins/PluginNav`     导航入口渲染
 *
 * **禁止** import 任何 `@/plugins/<id>/...` 内部路径。那会让主体重新知道某个插件的
 * 存在与内部结构，「关掉插件主路径不受影响」也随之失效（import 是静态的，插件关不掉）。
 * 插件需要主体提供的能力，一律通过本文件的契约字段声明，由上面的入口渲染。
 *
 * 同理，`@/plugins/index` 只给 `main.tsx` 的 `installBuiltinPlugins()` 用；
 * 主体其余位置不得 import 它 —— 否则内置插件清单就漏进了主路径。
 */

export interface PluginRoute {
  /** react-router 路径，必须以 / 开头 */
  path: string
  /** 懒加载组件工厂 */
  component: () => Promise<{ default: React.ComponentType }>
}

export interface PluginNavItem {
  /** 导航标签（走 i18n key 或直接文本） */
  label: string
  /** 点击后跳转的路径 */
  to: string
  /** lucide-react 图标名，由渲染侧映射，避免插件直接依赖图标包 */
  icon: string
  /** 排序权重，越小越靠前 */
  order: number
}

/**
 * 主域归属。日历域由主体独占，规划 / 复盘两个域由插件认领。
 *
 * 认领后主体不再硬编码 /action、/stats：域切换器、快捷键、移动端导航、
 * 顶栏显隐全部由 registry 的汇总结果驱动。同一个 id 最多一个插件认领，
 * 后注册者覆盖先注册者并留下告警。
 */
export interface PluginDomain {
  /** 域标识，与主体 DomainMode 的取值对齐：plan / review */
  id: string
  /** i18n key，缺失时回落到 label */
  labelKey?: string
  /** 展示名兜底（无翻译时用） */
  label: string
  /** lucide 图标名，由渲染侧白名单映射 */
  icon: string
  /** 域根路径，用于判断「当前是否处于该域」 */
  path: string
  /** 切换器点击后跳转的路径 */
  to: string
  /**
   * 顶栏 ‹ › 的方向语义。主体只按语义分派，不认识具体是哪个插件。
   * - 'history'（默认）：前进/后退一条浏览器历史
   * - 'date-step'：按域内子视图步长步进日期（读 `?date=` 与 `?view=`）
   * - 'filter-cycle'：循环切换 `?filter=` 参数（主体提供 `cycleActionFilter` 作默认实现）
   */
  headerStepKind?: 'history' | 'date-step' | 'filter-cycle'

  /**
   * 额外归属路径。用于「同域但路径不在 path 前缀下」的页面，
   * 例：项目详情 `/projects/:id` 仍属于规划域。
   */
  extraPaths?: string[]

  /** Alt+N 的序号（从 1 起）。日历固定占用 Alt+1 */
  shortcutOrder: number
}

export interface PluginDefinition {
  /** 全局唯一，小写短横线，例：quick-backfill */
  id: string
  /** 展示名 */
  name: string
  /** 一句话说明，用于设置页开关旁的解释 */
  description: string
  /** 语义化版本 */
  version: string
  /** 首次安装时是否默认开启 */
  defaultEnabled: boolean

  /**
   * 表归属声明。仅用于文档与数据导出时标注来源，不参与建表。
   * 表的真实定义始终在 data/db.ts。
   */
  tables?: string[]

  /** 注册到主路由的页面 */
  routes?: PluginRoute[]

  /** 注册到侧栏 / 移动端菜单的入口 */
  navItems?: PluginNavItem[]

  /**
   * 主域认领。认领后该插件成为域切换器上的一格，
   * 并在该域激活时接管侧栏内容区。
   */
  domain?: PluginDomain

  /**
   * 侧栏内容面板。仅在 `domain` 认领的路径下渲染。
   * 懒加载，避免把域内部实现拖进首屏。
   */
  sidebarPanel?: () => Promise<{ default: React.ComponentType }>

  /**
   * 顶栏二级导航槽。仅在 `domain` 认领的路径下渲染。
   * 域的「子视图」属于插件内部概念，主体顶栏只负责给它一个位置。
   */
  topBar?: () => Promise<{ default: React.ComponentType }>

  /**
   * 路由包裹层。用于需要统一外壳的域（如复盘页的满高滚动容器）。
   * 返回的组件必须渲染 <Outlet />。
   */
  layout?: () => Promise<{ default: React.ComponentType }>

  /**
   * 插件初始化钩子。
   *
   * ⚠️ 当前**没有接入调用时机**：`installBuiltinPlugins()` 只做注册，主体尚未在
   * 任何位置调用 `setup`。插件不得依赖它完成初始化 —— 需要初始化的状态请放在
   * 首次渲染或首次读取时的惰性路径里。
   *
   * 将来接入时的位置：`PluginRoutes` 的启用集合变化处（启用时调用一次）。
   * 届时要一并定义「禁用再启用是否重跑」的语义，以及副作用如何清理 ——
   * 目前只有 `setup` 没有 teardown，两个内置域插件也都不声明它，因此不提前设计。
   */
  setup?: () => void | Promise<void>
}
