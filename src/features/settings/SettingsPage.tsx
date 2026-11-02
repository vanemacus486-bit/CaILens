import { useUIStore } from '@/stores/uiStore'
import { TAB_CONTENT, FALLBACK_TAB } from './settingsTabContent'
import { SettingsNav } from './SettingsNav'
import { useSettingsScrollReset } from './useSettingsScrollReset'

/**
 * 桌面独立窗口里的设置页（Tauri `settings` 窗口）。
 *
 * 侧栏与网页弹窗共用 `SettingsNav`：搜索、分组、图标、键盘导航只实现一次。
 * 这里只负责桌面窗口的内容区宽度与滚动。
 */
export function SettingsPage() {
  const activeTab = useUIStore((s) => s.activeSettingsTab)
  const ActiveTab = TAB_CONTENT[activeTab] ?? FALLBACK_TAB
  const scrollRef = useSettingsScrollReset(activeTab)

  return (
    <div className="settings-page flex h-full bg-surface-base">
      <SettingsNav activeTab={activeTab} />

      <main ref={scrollRef} className="settings-main min-w-0 flex-1 overflow-y-auto">
        <div
          key={activeTab}
          className="settings-content mx-auto max-w-[720px] animate-settings-fade-in px-8 py-8 max-[820px]:px-5 max-[820px]:py-6"
        >
          <ActiveTab />
        </div>
      </main>
    </div>
  )
}
