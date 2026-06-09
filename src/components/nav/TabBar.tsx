/**
 * # TabBar — 通用一级 Tab 栏
 *
 * 复刻 EasternStatsShell 的 shell-tab 样式（Noto Serif SC、
 * letter-spacing、hover、底部 active 指示线），供 ActionPage 复用。
 *
 * 用法：
 * ```tsx
 * <TabBar tabs={TABS} activeId={tab} onTabChange={setTab} />
 * ```
 */

interface TabDefinition<T = string> {
  id: T
  label: string
}

interface Props<T = string> {
  tabs: readonly TabDefinition<T>[]
  activeId: T
  onTabChange: (id: T) => void
}

export function TabBar<T extends string = string>({ tabs, activeId, onTabChange }: Props<T>) {
  return (
    <div className="shell-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`shell-tab${activeId === tab.id ? ' shell-tab-active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
